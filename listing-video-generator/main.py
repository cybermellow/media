"""
Real Estate Listing Video Generator
Takes a Zillow URL, downloads photos automatically, and generates
a cinematic animated walkthrough video using Google Veo.

SETUP:
1. pip install google-genai beautifulsoup4 requests playwright
2. playwright install chromium
3. Create .env file: GOOGLE_API_KEY=your_key_here
4. brew install ffmpeg  (Mac) or download from ffmpeg.org (Windows)

USAGE:
  python listing_video_generator.py --zillow "https://www.zillow.com/homedetails/..."

OPTIONAL FLAGS:
  --photos   6          number of photos to select (default 6)
  --duration 6          seconds per clip: 4, 6, or 8 (default 6)
  --model    veo-2.0-generate-001   use cheaper/faster model
  --output   ./output   custom output directory
"""

import os
import sys
import time
import json
import argparse
import base64
import re
import shutil
import urllib.request
from pathlib import Path

# ─── Load .env ────────────────────────────────────────────────────────────────

def load_env():
    env_path = Path(__file__).parent / ".env"
    if env_path.exists():
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, val = line.split("=", 1)
                    os.environ[key.strip()] = val.strip()

load_env()

try:
    from google import genai
    from google.genai import types
except ImportError:
    print("ERROR: Run: pip install google-genai")
    sys.exit(1)

# ─── Config ───────────────────────────────────────────────────────────────────

API_KEY       = os.environ.get("GOOGLE_API_KEY")
MODEL         = "veo-3.1-generate-preview"
GEMINI_MODEL  = "gemini-2.0-flash"
ASPECT_RATIO  = "16:9"
DURATION      = 6
MAX_PHOTOS    = 6

# ─── Zillow Photo Scraping ────────────────────────────────────────────────────

def scrape_zillow(zillow_url: str, max_photos: int) -> dict:
    """
    Scrape Zillow listing: description, address, price, and photo URLs.
    Tries Playwright (full JS rendering) first, falls back to static fetch.
    Returns: {address, price, description, photo_urls, success}
    """
    print("\nFetching Zillow listing...")

    html = ""

    # Try Playwright for full JS rendering (best photo coverage)
    try:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page(user_agent=(
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ))
            page.goto(zillow_url, wait_until="networkidle", timeout=30000)
            # Click "See all photos" if present to load full gallery
            try:
                page.click("button:has-text('See all')", timeout=3000)
                page.wait_for_timeout(2000)
            except Exception:
                pass
            html = page.content()
            browser.close()
        print("  Using Playwright (full JS render)")
    except Exception as e:
        print(f"  Playwright unavailable ({e}) — trying static fetch")

    # Fallback: static urllib fetch
    if not html:
        try:
            req = urllib.request.Request(zillow_url, headers={
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept-Language": "en-US,en;q=0.9",
            })
            with urllib.request.urlopen(req, timeout=15) as r:
                html = r.read().decode("utf-8")
            print("  Using static fetch")
        except Exception as e:
            print(f"  ERROR fetching page: {e}")
            return {"success": False, "photo_urls": [], "description": "", "address": "", "price": ""}

    # Extract photo URLs from Zillow CDN
    photo_urls = []
    # High-res pattern first
    for pattern in [
        r'https://photos\.zillowstatic\.com/fp/[a-f0-9]+-cc_ft_1536\.jpg',
        r'https://photos\.zillowstatic\.com/fp/[a-f0-9]+-cc_ft_960\.jpg',
        r'https://photos\.zillowstatic\.com/fp/[a-f0-9]+(?:-[a-z0-9_]+)?\.jpg',
    ]:
        found = list(dict.fromkeys(re.findall(pattern, html)))  # dedupe, preserve order
        # Filter out logos/icons (small files tend to have short hashes)
        found = [u for u in found if len(re.search(r'/fp/([a-f0-9]+)', u).group(1)) >= 30]
        if found:
            photo_urls = found
            break

    # Upgrade any lower-res URLs to 1536
    photo_urls = [re.sub(r'-cc_ft_\d+\.jpg$', '-cc_ft_1536.jpg', u) for u in photo_urls]
    photo_urls = list(dict.fromkeys(photo_urls))[:max_photos * 3]  # grab extras, Gemini will pick best

    # Extract metadata
    description = ""
    for pat in [r'"description":"([^"]{50,})"', r'<meta property="og:description" content="([^"]+)"']:
        m = re.search(pat, html)
        if m:
            description = m.group(1).replace("\\n", " ").replace('\\"', '"')
            break

    address = ""
    m = re.search(r'"streetAddress":"([^"]+)"', html)
    if m:
        address = m.group(1)
        for key, pat in [("city", r'"addressLocality":"([^"]+)"'), ("state", r'"addressRegion":"([^"]+)"')]:
            mm = re.search(pat, html)
            if mm:
                address += f", {mm.group(1)}"

    price = ""
    m = re.search(r'"price":(\d+)', html)
    if m:
        price = f"${int(m.group(1)):,}"

    print(f"  Address:    {address or 'unknown'}")
    print(f"  Price:      {price or 'unknown'}")
    print(f"  Photos found: {len(photo_urls)}")
    print(f"  Description: {len(description)} chars")

    return {
        "success": len(photo_urls) > 0,
        "photo_urls": photo_urls,
        "description": description,
        "address": address,
        "price": price,
    }


def download_photos(photo_urls: list, output_dir: Path, max_photos: int) -> list:
    """Download photos from Zillow CDN. Returns list of local Paths."""
    output_dir.mkdir(parents=True, exist_ok=True)
    downloaded = []
    print(f"\nDownloading up to {max_photos} photos...")

    for i, url in enumerate(photo_urls):
        if len(downloaded) >= max_photos * 2:  # download extras for Gemini to pick from
            break
        dest = output_dir / f"photo_{i+1:02d}.jpg"
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=10) as r:
                data = r.read()
            # Skip if too small (likely a thumbnail/icon)
            if len(data) < 30000:
                continue
            with open(dest, "wb") as f:
                f.write(data)
            downloaded.append(dest)
            print(f"  [{len(downloaded)}] {dest.name} ({len(data)//1024}KB)")
        except Exception as e:
            print(f"  Skipped {url}: {e}")

    return downloaded


# ─── Gemini: Select + Order + Prompt ─────────────────────────────────────────

def select_organize_prompt(client, listing: dict, photos: list, max_photos: int) -> list:
    """
    Gemini does three things in one call:
    1. Selects the best max_photos from all downloaded photos
    2. Orders them into the best walkthrough sequence for this property
    3. Writes animation-only prompts (no camera direction)

    Returns ordered list of {path, prompt}
    """
    photo_list = "\n".join([f"- {p.name}" for p in photos])
    description = listing.get("description", "")
    address = listing.get("address", "luxury property")
    price = listing.get("price", "")

    desc_block = f"Listing description:\n{description}\n\n" if description else ""

    system_prompt = """You are a video animation specialist for luxury real estate photography.
You select, order, and write animation prompts for listing photos.

STRICT RULES:
- Select only the most visually impactful and distinct photos
- Order them as a natural property walkthrough (exterior → entry → living areas → kitchen → bedrooms → bathrooms → outdoor last)
- Animation prompts must describe ONLY what naturally moves in the frame: water, fire, light rays, leaves, curtains, steam, reflections, shadows, dust motes
- ZERO camera movement. No pan, push-in, dolly, zoom, aerial, fly. Camera is 100% static.
- ZERO narrative references. No property names, no agent language, no "luxury estate arrival"
- Every prompt ends with: photorealistic, preserve all original textures and colors, no stylization, no people, static camera
- Respond ONLY with valid JSON, no markdown."""

    user_prompt = f"""Property: {address} {price}
{desc_block}Available photos (filenames are numbered in download order, not scene order):
{photo_list}

Tasks:
1. Select the best {max_photos} photos that together tell a complete property story
2. Order them into the ideal walkthrough sequence for this specific property
3. Write a 1-sentence animation-only prompt for each

Respond as JSON:
{{
  "selected": [
    {{
      "filename": "photo_03.jpg",
      "prompt": "pool water ripples and shimmers gently, light reflections shift across the surface, photorealistic, preserve all original textures and colors, no stylization, no people, static camera"
    }}
  ]
}}"""

    try:
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            config=types.GenerateContentConfig(system_instruction=system_prompt),
            contents=user_prompt,
        )
        raw = response.text.strip()
        raw = re.sub(r"^```[a-z]*\n?", "", raw).rstrip("```").strip()
        data = json.loads(raw)

        photo_map = {p.name: p for p in photos}
        result = []
        seen = set()
        for item in data.get("selected", []):
            fname = item.get("filename", "")
            if fname in photo_map and fname not in seen:
                result.append({"path": photo_map[fname], "prompt": item["prompt"]})
                seen.add(fname)

        # Safety net: fill remaining slots if Gemini returned fewer
        for p in photos:
            if len(result) >= max_photos:
                break
            if p.name not in seen:
                result.append({"path": p, "prompt": fallback_prompt(p.stem)})

        print(f"  Gemini selected {len(result)} photos with animation prompts.")
        return result[:max_photos]

    except Exception as e:
        print(f"  Gemini selection failed ({e}) — using all downloaded photos with fallback prompts.")
        return [{"path": p, "prompt": fallback_prompt(p.stem)} for p in photos[:max_photos]]


def fallback_prompt(stem: str) -> str:
    name = stem.lower()
    if any(w in name for w in ["pool", "water"]):
        return "pool water shimmers and ripples gently, light reflections dance across the surface, photorealistic, preserve all original textures and colors, no stylization, no people, static camera"
    if any(w in name for w in ["fountain"]):
        return "fountain water cascades and mists softly, light catches the spray, photorealistic, preserve all original textures and colors, no stylization, no people, static camera"
    if any(w in name for w in ["fire", "fireplace", "hearth"]):
        return "fireplace flames flicker softly, warm amber light pulses gently across surrounding surfaces, photorealistic, preserve all original textures and colors, no stylization, no people, static camera"
    if any(w in name for w in ["exterior", "front", "facade", "drone", "aerial"]):
        return "gentle breeze sways palm fronds and tree canopy, dappled sunlight shifts slowly across the lawn, photorealistic, preserve all original textures and colors, no stylization, no people, static camera"
    if any(w in name for w in ["kitchen"]):
        return "subtle ambient light shifts across countertops, steam wisps near cooktop, photorealistic, preserve all original textures and colors, no stylization, no people, static camera"
    if any(w in name for w in ["bedroom", "bed"]):
        return "sheer curtains drift softly in a gentle breeze, warm sunlight shifts slowly across bedding, photorealistic, preserve all original textures and colors, no stylization, no people, static camera"
    if any(w in name for w in ["bath", "shower", "spa"]):
        return "soft light shifts on marble surfaces, subtle steam drifts near shower glass, photorealistic, preserve all original textures and colors, no stylization, no people, static camera"
    if any(w in name for w in ["living", "lounge", "family"]):
        return "ambient light shifts gently through windows, dust motes drift in sunbeams, photorealistic, preserve all original textures and colors, no stylization, no people, static camera"
    return "subtle ambient light shift, dust particles float in stillness, photorealistic, preserve all original textures and colors, no stylization, no people, static camera"


# ─── Video Generation ─────────────────────────────────────────────────────────

def generate_clip(client, image_path: Path, output_path: Path, prompt: str, model: str, duration: int) -> bool:
    print(f"\n  [{image_path.name}]")
    print(f"  Prompt: {prompt[:120]}...")

    with open(image_path, "rb") as f:
        image_bytes = f.read()

    ext = image_path.suffix.lower().lstrip(".")
    mime_type = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "webp": "image/webp"}.get(ext, "image/jpeg")

    try:
        operation = client.models.generate_videos(
            model=model,
            prompt=prompt,
            image=types.Image(image_bytes=image_bytes, mime_type=mime_type),
            config=types.GenerateVideosConfig(
                aspect_ratio=ASPECT_RATIO,
                duration_seconds=duration,
                number_of_videos=1,
                enhance_prompt=False,
            ),
        )

        print("  Generating", end="", flush=True)
        while not operation.done:
            time.sleep(5)
            operation = client.operations.get(operation)
            print(".", end="", flush=True)
        print(" done")

        if operation.response and operation.response.generated_videos:
            video_bytes = client.models.get_video(operation.response.generated_videos[0].video.uri)
            with open(output_path, "wb") as f:
                f.write(video_bytes)
            print(f"  Saved: {output_path.name} ({output_path.stat().st_size // 1024 // 1024}MB)")
            return True
        else:
            print("  ERROR: No video returned")
            return False

    except Exception as e:
        print(f"  ERROR: {e}")
        return False


def stitch_clips(clip_paths: list, output_path: Path):
    import subprocess
    try:
        subprocess.run(["ffmpeg", "-version"], capture_output=True, check=True)
        concat = output_path.parent / "_concat.txt"
        with open(concat, "w") as f:
            for c in clip_paths:
                f.write(f"file '{c.absolute()}'\n")
        subprocess.run([
            "ffmpeg", "-y", "-f", "concat", "-safe", "0",
            "-i", str(concat), "-c", "copy", str(output_path)
        ], capture_output=True, check=True)
        concat.unlink()
        print(f"\n  Stitched: {output_path.name}")
    except Exception:
        print("\n  ffmpeg not found — clips saved individually. Install ffmpeg to auto-stitch.")


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Generate real estate walkthrough video from a Zillow URL")
    parser.add_argument("--zillow",   required=True,          help="Zillow listing URL")
    parser.add_argument("--photos",   type=int, default=MAX_PHOTOS,   help=f"Number of photos to use (default {MAX_PHOTOS})")
    parser.add_argument("--duration", type=int, default=DURATION,     help="Seconds per clip: 4, 6, or 8 (default 6)")
    parser.add_argument("--model",    default=MODEL,          help=f"Veo model (default: {MODEL})")
    parser.add_argument("--output",   default="",             help="Custom output directory (default: auto from address)")
    args = parser.parse_args()

    if not API_KEY:
        print("ERROR: GOOGLE_API_KEY not set. Add it to your .env file.")
        sys.exit(1)

    print("\nListing Video Generator")
    print("─" * 40)
    print(f"Zillow:   {args.zillow}")
    print(f"Photos:   {args.photos}")
    print(f"Duration: {args.duration}s per clip")
    print(f"Model:    {args.model}")
    print("─" * 40)

    client = genai.Client(api_key=API_KEY)

    # Step 1: Scrape Zillow
    listing = scrape_zillow(args.zillow, args.photos)
    if not listing["success"]:
        print("ERROR: Could not fetch photos from Zillow. Try installing Playwright:")
        print("  pip install playwright && playwright install chromium")
        sys.exit(1)

    # Step 2: Set up output folder from address
    if args.output:
        output_dir = Path(args.output)
    else:
        safe_address = re.sub(r'[^\w\s-]', '', listing["address"]).strip().replace(" ", "_")[:60]
        output_dir = Path("listings") / (safe_address or "listing")

    photos_dir = output_dir / "photos"
    clips_dir  = output_dir / "output"
    clips_dir.mkdir(parents=True, exist_ok=True)

    # Save listing info
    with open(output_dir / "listing_info.txt", "w") as f:
        f.write(f"Address: {listing['address']}\n")
        f.write(f"Price:   {listing['price']}\n")
        f.write(f"URL:     {args.zillow}\n\n")
        f.write(f"Description:\n{listing['description']}\n")

    # Step 3: Download photos
    photos = download_photos(listing["photo_urls"], photos_dir, args.photos * 2)
    if not photos:
        print("ERROR: No photos downloaded. Zillow may be blocking access.")
        sys.exit(1)

    # Step 4: Gemini selects, orders, and writes animation prompts
    print(f"\nSelecting best {args.photos} photos and building animation prompts...")
    scene_plan = select_organize_prompt(client, listing, photos, args.photos)

    # Save scene plan
    with open(clips_dir / "scene_plan.json", "w") as f:
        json.dump([{"filename": s["path"].name, "prompt": s["prompt"]} for s in scene_plan], f, indent=2)
    print(f"  Scene plan saved → {clips_dir}/scene_plan.json")
    print(f"  (Review and edit prompts before generating if needed)")

    # Step 5: Generate clips
    print(f"\nGenerating {len(scene_plan)} video clips with Veo...")
    clip_paths = []
    for i, scene in enumerate(scene_plan, 1):
        clip_name = f"clip_{i:02d}_{scene['path'].stem}.mp4"
        clip_path = clips_dir / clip_name

        if clip_path.exists():
            print(f"\n  Skipping (exists): {clip_name}")
            clip_paths.append(clip_path)
            continue

        ok = generate_clip(client, scene["path"], clip_path, scene["prompt"], args.model, args.duration)
        if ok:
            clip_paths.append(clip_path)

    # Step 6: Stitch
    if len(clip_paths) > 1:
        stitch_clips(clip_paths, clips_dir / "walkthrough_preview.mp4")

    print(f"\nDone — {len(clip_paths)} clips in: {clips_dir.absolute()}")

if __name__ == "__main__":
    main()
