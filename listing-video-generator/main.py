"""
Real Estate Listing Video Generator
Uses Google Veo 3.1 to generate cinematic walkthrough clips from listing photos.
Reads the Zillow listing description to craft property-specific video prompts.

SETUP:
1. Install dependencies: pip install google-genai pillow requests beautifulsoup4
2. Create a .env file in this folder with: GOOGLE_API_KEY=your_key_here
3. Run: python listing_video_generator.py --folder "./listings/5186_Vardon_Dr" --zillow "https://www.zillow.com/homedetails/..."

FOLDER STRUCTURE:
  listings/
    5186_Vardon_Dr/
      01_exterior.jpg
      02_fountain.jpg
      03_facade.jpg
      04_interior.jpg
      05_pool.jpg

OUTPUT:
  listings/5186_Vardon_Dr/output/
    clip_01_exterior.mp4
    clip_02_fountain.mp4
    ...
    walkthrough_preview.mp4  (stitched together)
    listing_story.txt        (extracted description + generated prompts)
"""

import os
import sys
import time
import json
import argparse
import base64
import re
from pathlib import Path

# Load .env file manually (no dotenv dependency needed)
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
    print("ERROR: Missing dependency. Run: pip install google-genai beautifulsoup4")
    sys.exit(1)

# ─── Configuration ────────────────────────────────────────────────────────────

API_KEY = os.environ.get("GOOGLE_API_KEY")
MODEL = "veo-3.1-generate-preview"       # Best realism. Change to veo-2.0-generate-001 for faster/cheaper
GEMINI_MODEL = "gemini-2.0-flash"        # Used for prompt generation from listing description
ASPECT_RATIO = "16:9"
DURATION_SECONDS = 6                      # 4, 6, or 8

# Fallback cinematic prompt templates (used when no Zillow description available)
SCENE_PROMPTS = {
    "exterior":  "Photorealistic slow gentle aerial push-in toward a grand luxury estate, preserve original lighting and textures, architectural photography, subtle parallax motion, warm natural afternoon light, no people, no stylization",
    "fountain":  "Photorealistic slow dolly forward through a grand fountain entrance of a luxury estate, circular driveway, ornate fountain, lush tropical landscaping, warm golden light, smooth buyer arrival motion, no people, no stylization",
    "facade":    "Photorealistic slow pan reveal across the front facade of a grand luxury home, tile roof, manicured landscaping, warm afternoon sunlight, preserve original textures and lighting, no people, no stylization",
    "interior":  "Photorealistic smooth slow dolly through a grand luxury home interior, soaring ceilings, elegant architecture, warm ambient light, buyer walkthrough perspective, preserve original lighting and materials, no people, no stylization",
    "pool":      "Photorealistic slow cinematic reveal of a resort-style luxury pool and outdoor living area, shimmering pool water, lush Florida landscaping, golden hour light, smooth camera motion, no people, no stylization",
    "kitchen":   "Photorealistic slow push-in toward a luxury chef kitchen, high-end appliances, marble countertops, warm task lighting, preserve original textures and materials, no people, no stylization",
    "bedroom":   "Photorealistic gentle slow pan across a grand primary bedroom suite, elegant furnishings, natural window light, preserve original lighting and textures, no people, no stylization",
    "bathroom":  "Photorealistic slow reveal of a luxury primary bathroom, marble surfaces, spa-like atmosphere, soft natural light, preserve original materials, no people, no stylization",
    "living":    "Photorealistic slow dolly through a grand living room with soaring ceilings, elegant furniture, natural light flooding in, preserve original lighting and textures, no people, no stylization",
    "default":   "Photorealistic slow cinematic camera move through a luxury estate space, preserve original lighting and textures, high-end architectural photography feel, smooth motion, no people, no stylization",
}

# ─── Zillow Scraping ──────────────────────────────────────────────────────────

def fetch_listing_description(zillow_url: str) -> dict:
    """
    Fetch listing description and key features from a Zillow URL.
    Returns dict with description, address, price, features.
    Falls back gracefully if scraping fails.
    """
    try:
        import urllib.request
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9",
        }
        req = urllib.request.Request(zillow_url, headers=headers)
        with urllib.request.urlopen(req, timeout=15) as response:
            html = response.read().decode("utf-8")

        # Extract description from meta tag (most reliable, not blocked)
        desc_match = re.search(r'<meta name="description" content="([^"]+)"', html)
        og_desc_match = re.search(r'<meta property="og:description" content="([^"]+)"', html)

        # Try to extract full listing description from page JSON
        json_match = re.search(r'"description":"([^"]{50,})"', html)

        # Extract address
        addr_match = re.search(r'"streetAddress":"([^"]+)"', html)
        city_match = re.search(r'"addressLocality":"([^"]+)"', html)
        state_match = re.search(r'"addressRegion":"([^"]+)"', html)

        # Extract price
        price_match = re.search(r'"price":(\d+)', html)

        # Extract special features (What's special section)
        features_match = re.search(r'What\'s special</[^>]+>\s*<[^>]+>([^<]+(?:<[^>]+>[^<]+)*)', html)

        description = ""
        if json_match:
            description = json_match.group(1).replace("\\n", " ").replace('\\"', '"')
        elif og_desc_match:
            description = og_desc_match.group(1)
        elif desc_match:
            description = desc_match.group(1)

        address = ""
        if addr_match:
            address = addr_match.group(1)
            if city_match:
                address += f", {city_match.group(1)}"
            if state_match:
                address += f", {state_match.group(1)}"

        return {
            "description": description,
            "address": address,
            "price": f"${int(price_match.group(1)):,}" if price_match else "",
            "url": zillow_url,
            "success": bool(description),
        }

    except Exception as e:
        print(f"  Note: Could not fetch Zillow listing ({e}). Using fallback prompts.")
        return {"description": "", "address": "", "price": "", "url": zillow_url, "success": False}


# ─── AI Prompt Generation ─────────────────────────────────────────────────────

def organize_and_prompt(client, listing: dict, photos: list) -> list:
    """
    Use Gemini to:
    1. Dynamically order photos into the best walkthrough sequence for THIS property
    2. Generate animation-only prompts per photo (no camera direction, no narrative)
       — the description is used purely to identify what's in each photo
       so the model can animate the right details (water shimmer, flame flicker, etc.)

    Returns an ordered list of dicts: [{path, prompt}, ...]
    """
    if not listing.get("description"):
        print("  No listing description — using default order and fallback prompts.")
        return [{"path": p, "prompt": get_fallback_prompt(p.stem)} for p in photos]

    photo_list = "\n".join([f"- {p.name}" for p in photos])
    description = listing["description"]

    system_prompt = """You are a video animation specialist for luxury real estate photography.
Your job is two things:
1. Decide the best viewing order for a set of listing photos
2. Write subtle animation prompts that bring each still photo to life

Rules you must follow:
- Do NOT direct any camera movement. No "push-in", "pan", "dolly", "aerial", "fly over". The camera is completely static.
- Do NOT reference the property story or narrative. No "golf-front", "Isleworth", "luxury estate arrival".
- ONLY describe what naturally moves within the frame: water, fire, light, leaves, curtains, steam, reflections, shadows.
- If nothing natural moves in a scene (e.g. a hallway), use: "subtle ambient light shift, dust particles floating, stillness"
- Every prompt must include: "photorealistic, preserve all original textures and colors, no stylization, no people, static camera"
- Keep each prompt to 1 sentence.
- Respond ONLY with valid JSON, no markdown, no explanation."""

    user_prompt = f"""Listing description (use only to identify what features appear in each photo — do not use for narrative or camera direction):
{description}

Photos available (filenames may hint at content):
{photo_list}

Tasks:
1. Order these photos into the most natural walkthrough sequence for this specific property (exterior first, then entry, main living areas, kitchen, bedrooms, bathrooms, outdoor/pool last — but adapt based on what photos actually exist)
2. For each photo write an animation-only prompt

Respond ONLY as JSON in this exact format:
{{
  "ordered_photos": [
    {{
      "filename": "01_exterior.jpg",
      "prompt": "gentle breeze rustles mature palm fronds, dappled sunlight shifts across lawn, photorealistic, preserve all original textures and colors, no stylization, no people, static camera"
    }},
    {{
      "filename": "02_pool.jpg",
      "prompt": "..."
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

        ordered = data.get("ordered_photos", [])
        photo_map = {p.name: p for p in photos}

        result = []
        seen = set()
        for item in ordered:
            fname = item.get("filename", "")
            if fname in photo_map and fname not in seen:
                result.append({"path": photo_map[fname], "prompt": item["prompt"]})
                seen.add(fname)

        # Append any photos Gemini missed (safety net)
        for p in photos:
            if p.name not in seen:
                result.append({"path": p, "prompt": get_fallback_prompt(p.stem)})

        print(f"  Organized {len(result)} photos into walkthrough order with animation prompts.")
        return result

    except Exception as e:
        print(f"  Could not organize/prompt via Gemini ({e}). Using default order and fallback prompts.")
        return [{"path": p, "prompt": get_fallback_prompt(p.stem)} for p in photos]


def get_fallback_prompt(filename_stem: str) -> str:
    """Return a generic animation-only fallback prompt based on scene type."""
    name = filename_stem.lower()
    if any(w in name for w in ["pool", "water", "fountain"]):
        return "pool water shimmers and ripples gently, light reflections dance across surface, photorealistic, preserve all original textures and colors, no stylization, no people, static camera"
    if any(w in name for w in ["fire", "fireplace", "hearth"]):
        return "fireplace flames flicker softly, warm light pulses gently on surrounding surfaces, photorealistic, preserve all original textures and colors, no stylization, no people, static camera"
    if any(w in name for w in ["exterior", "front", "facade", "outside", "aerial", "drone"]):
        return "gentle breeze sways palm fronds and tree canopy, dappled sunlight shifts across lawn, photorealistic, preserve all original textures and colors, no stylization, no people, static camera"
    if any(w in name for w in ["kitchen"]):
        return "subtle ambient light shift, steam wisps near cooktop, photorealistic, preserve all original textures and colors, no stylization, no people, static camera"
    if any(w in name for w in ["bedroom", "bed"]):
        return "sheer curtains drift softly in a gentle breeze, warm sunlight shifts slowly across bedding, photorealistic, preserve all original textures and colors, no stylization, no people, static camera"
    if any(w in name for w in ["living", "lounge", "family"]):
        return "ambient light shifts gently, dust particles float in sunbeams, photorealistic, preserve all original textures and colors, no stylization, no people, static camera"
    if any(w in name for w in ["bath", "shower", "spa"]):
        return "soft light shifts on marble surfaces, subtle steam drifts near shower, photorealistic, preserve all original textures and colors, no stylization, no people, static camera"
    return "subtle ambient light shift, dust particles floating in stillness, photorealistic, preserve all original textures and colors, no stylization, no people, static camera"


# ─── Helpers ──────────────────────────────────────────────────────────────────

def detect_scene_type(filename: str) -> str:
    """Guess scene type from filename."""
    name = filename.lower()
    for scene in SCENE_PROMPTS:
        if scene in name:
            return scene
    return "default"

def image_to_base64(path: Path) -> str:
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")

def get_mime_type(path: Path) -> str:
    ext = path.suffix.lower()
    return {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "webp": "image/webp"}.get(ext.lstrip("."), "image/jpeg")

def sort_photos(photos: list[Path]) -> list[Path]:
    """Sort by filename number prefix if present, otherwise alphabetically."""
    def sort_key(p):
        name = p.stem
        parts = name.split("_")
        try:
            return (int(parts[0]), name)
        except ValueError:
            return (999, name)
    return sorted(photos, key=sort_key)

# ─── Core Generation ──────────────────────────────────────────────────────────

def generate_clip(client, image_path: Path, output_path: Path, prompt: str) -> bool:
    """Generate a single video clip from an image using Veo."""
    print(f"\n  Generating: {image_path.name} → {output_path.name}")
    print(f"  Prompt: {prompt[:100]}...")
    print(f"  Model: {MODEL}")

    image_data = image_to_base64(image_path)
    mime_type = get_mime_type(image_path)

    try:
        operation = client.models.generate_videos(
            model=MODEL,
            prompt=prompt,
            image=types.Image(
                image_bytes=base64.b64decode(image_data),
                mime_type=mime_type,
            ),
            config=types.GenerateVideosConfig(
                aspect_ratio=ASPECT_RATIO,
                duration_seconds=DURATION_SECONDS,
                number_of_videos=1,
                enhance_prompt=False,
            ),
        )

        print("  Waiting for generation", end="", flush=True)
        while not operation.done:
            time.sleep(5)
            operation = client.operations.get(operation)
            print(".", end="", flush=True)
        print(" done")

        if operation.response and operation.response.generated_videos:
            video = operation.response.generated_videos[0]
            video_bytes = client.models.get_video(video.video.uri)
            with open(output_path, "wb") as f:
                f.write(video_bytes)
            size_mb = output_path.stat().st_size / (1024 * 1024)
            print(f"  Saved: {output_path.name} ({size_mb:.1f} MB)")
            return True
        else:
            print(f"  ERROR: No video in response")
            return False

    except Exception as e:
        print(f"  ERROR: {e}")
        return False

def stitch_clips(clip_paths: list[Path], output_path: Path):
    """Stitch clips together using ffmpeg if available."""
    try:
        import subprocess
        # Check ffmpeg is available
        subprocess.run(["ffmpeg", "-version"], capture_output=True, check=True)

        # Create concat file
        concat_file = output_path.parent / "concat.txt"
        with open(concat_file, "w") as f:
            for clip in clip_paths:
                f.write(f"file '{clip.absolute()}'\n")

        subprocess.run([
            "ffmpeg", "-y", "-f", "concat", "-safe", "0",
            "-i", str(concat_file),
            "-c", "copy",
            str(output_path)
        ], capture_output=True, check=True)

        concat_file.unlink()
        print(f"\n  Walkthrough stitched: {output_path.name}")

    except (subprocess.CalledProcessError, FileNotFoundError):
        print("\n  Note: ffmpeg not found — clips saved individually. Install ffmpeg to auto-stitch.")

# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Generate luxury real estate walkthrough videos")
    parser.add_argument("--folder", required=True, help="Folder containing listing photos")
    parser.add_argument("--zillow", default="", help="Zillow listing URL to pull property description")
    parser.add_argument("--model", default=MODEL, help=f"Veo model to use (default: {MODEL})")
    parser.add_argument("--duration", type=int, default=DURATION_SECONDS, help="Clip duration in seconds (4, 6, or 8)")
    args = parser.parse_args()

    if not API_KEY:
        print("ERROR: GOOGLE_API_KEY not found. Create a .env file with: GOOGLE_API_KEY=your_key_here")
        sys.exit(1)

    folder = Path(args.folder)
    if not folder.exists():
        print(f"ERROR: Folder not found: {folder}")
        sys.exit(1)

    # Find photos
    extensions = {".jpg", ".jpeg", ".png", ".webp"}
    photos = [p for p in folder.iterdir() if p.suffix.lower() in extensions]
    photos = sort_photos(photos)

    if not photos:
        print(f"ERROR: No photos found in {folder}")
        sys.exit(1)

    print(f"\nListing Video Generator")
    print(f"{'─' * 40}")
    print(f"Folder:   {folder}")
    print(f"Photos:   {len(photos)} found")
    print(f"Model:    {args.model}")
    print(f"Duration: {args.duration}s per clip")
    print(f"{'─' * 40}")

    # Init client
    client = genai.Client(api_key=API_KEY)

    # Step 1: Fetch listing description from Zillow
    listing = {"description": "", "address": "", "price": "", "success": False}
    if args.zillow:
        print(f"\nFetching listing description from Zillow...")
        listing = fetch_listing_description(args.zillow)
        if listing["success"]:
            print(f"  Address: {listing['address']}")
            print(f"  Price:   {listing['price']}")
            print(f"  Description ({len(listing['description'])} chars): {listing['description'][:120]}...")

            # Save description for reference
            output_folder = folder / "output"
            output_folder.mkdir(exist_ok=True)
            story_path = output_folder / "listing_story.txt"
            with open(story_path, "w") as f:
                f.write(f"Address: {listing['address']}\n")
                f.write(f"Price: {listing['price']}\n")
                f.write(f"URL: {listing['url']}\n\n")
                f.write(f"Description:\n{listing['description']}\n")
            print(f"  Saved to: listing_story.txt")
    else:
        print("\nNo Zillow URL provided — using fallback scene prompts.")
        print("Tip: Add --zillow https://www.zillow.com/homedetails/... for property-specific prompts.")

    # Step 2: Organize photos and generate animation prompts via Gemini
    print(f"\nOrganizing photos and building animation prompts...")
    scene_plan = organize_and_prompt(client, listing, photos)

    # Save plan for reference
    output_folder = folder / "output"
    output_folder.mkdir(exist_ok=True)
    plan_path = output_folder / "scene_plan.json"
    with open(plan_path, "w") as f:
        json.dump([{"filename": s["path"].name, "prompt": s["prompt"]} for s in scene_plan], f, indent=2)
    print(f"  Scene plan saved to: scene_plan.json")

    # Step 3: Generate clips in planned order
    print(f"\nGenerating video clips...")
    clip_paths = []
    for i, scene in enumerate(scene_plan, 1):
        photo = scene["path"]
        prompt = scene["prompt"]
        clip_name = f"clip_{i:02d}_{photo.stem}.mp4"
        output_path = output_folder / clip_name

        if output_path.exists():
            print(f"\n  Skipping (already exists): {clip_name}")
            clip_paths.append(output_path)
            continue

        success = generate_clip(client, photo, output_path, prompt)
        if success:
            clip_paths.append(output_path)

    # Step 4: Stitch together
    if len(clip_paths) > 1:
        walkthrough_path = output_folder / "walkthrough_preview.mp4"
        stitch_clips(clip_paths, walkthrough_path)

    print(f"\nDone. {len(clip_paths)} clips generated in: {output_folder}")

if __name__ == "__main__":
    main()
