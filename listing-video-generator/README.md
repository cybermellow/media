# Listing Video Generator — Setup Guide

Generates cinematic walkthrough preview videos from listing photos using Google Veo.
Reads the Zillow listing description to dynamically order photos and animate
the right details per scene (water shimmer, flame flicker, light shifts, etc.)
The camera never moves — Veo brings each still photo to life naturally.

---

## One-time setup

1. Install Python dependencies:
   pip install google-genai beautifulsoup4

2. Install ffmpeg (for auto-stitching clips into one preview file):
   Mac:     brew install ffmpeg
   Windows: https://ffmpeg.org/download.html

3. Create a .env file in the same folder as the script:
   GOOGLE_API_KEY=your_key_here

   Never share this file or commit it to git.

---

## Folder structure

Organize your listing photos like this before running:

  listings/
    5186_Vardon_Dr/
      01_exterior.jpg
      02_fountain.jpg
      03_living.jpg
      04_kitchen.jpg
      05_pool.jpg

Naming tips:
- Use a number prefix so photos sort correctly as a fallback
- Include scene keywords in filenames when possible:
  exterior, fountain, facade, interior, pool,
  kitchen, bedroom, bathroom, living, fireplace
- The script dynamically reorders photos based on the listing
  description, so exact numbering is less critical when
  passing --zillow

---

## Running the script

Basic (fallback prompts, default order):
  python listing_video_generator.py --folder "./listings/5186_Vardon_Dr"

With Zillow description (recommended):
  python listing_video_generator.py \
    --folder "./listings/5186_Vardon_Dr" \
    --zillow "https://www.zillow.com/homedetails/5186-Vardon-Dr-Windermere-FL-34786/46138378_zpid/"

Optional flags:
  --model    veo-2.0-generate-001          faster, cheaper
             veo-3.1-generate-preview      best quality (default)
  --duration 4 / 6 / 8                    seconds per clip (default 6)

---

## What happens when you pass --zillow

1. Script fetches the listing description from Zillow
2. Sends description + photo filenames to Gemini Flash (fast, near-free)
3. Gemini reads what features exist in this property (pool, fireplace,
   fountain, golf views, etc.) and determines:
     a. Best walkthrough order for these specific photos
     b. An animation-only prompt per photo — what naturally moves
        in that scene (water, flames, light, curtains, leaves)
4. Veo animates each still photo using those prompts
5. Clips are stitched into walkthrough_preview.mp4 via ffmpeg

The camera never moves. No narrative direction. The description is
used only to identify what is animatable in each photo.

---

## Output

  listings/5186_Vardon_Dr/output/
    scene_plan.json          ordered photo list + prompts (review before running)
    listing_story.txt        extracted Zillow description for reference
    clip_01_exterior.mp4
    clip_02_fountain.mp4
    ...
    walkthrough_preview.mp4  final stitched preview ready to send

---

## Animation prompt examples

Pool photo:
  "pool water shimmers and ripples gently, light reflections dance
   across surface, photorealistic, preserve all original textures
   and colors, no stylization, no people, static camera"

Fireplace photo:
  "fireplace flames flicker softly, warm light pulses gently on
   surrounding surfaces, photorealistic, preserve all original
   textures and colors, no stylization, no people, static camera"

Exterior photo:
  "gentle breeze sways palm fronds and tree canopy, dappled sunlight
   shifts across lawn, photorealistic, preserve all original textures
   and colors, no stylization, no people, static camera"

Bedroom photo:
  "sheer curtains drift softly in a gentle breeze, warm sunlight
   shifts slowly across bedding, photorealistic, preserve all original
   textures and colors, no stylization, no people, static camera"

---

## Model cost guide (Google AI Studio pay-as-you-go)

  veo-2.0-generate-001        ~$0.35/sec  ->  ~$2.10 per 6s clip
  veo-3.0-generate-001        ~$0.50/sec  ->  ~$3.00 per 6s clip
  veo-3.1-generate-preview    preview pricing (check AI Studio)

  5-clip listing walkthrough:
    Veo 2:    ~$10.50 total
    Veo 3:    ~$15.00 total

  Gemini Flash (for ordering + prompts): effectively free at this volume

  Compare: Higgsfield Kling 3.0 = ~$7.50-15 per listing on top of
  a monthly subscription. This pipeline has no subscription cost.

---

## Tips for best results

- Pass --zillow whenever possible — property-specific animation
  prompts produce noticeably better results than generic fallbacks
- Review scene_plan.json before generating — you can edit the order
  or tweak any prompt, then re-run (existing clips are skipped)
- Use the highest resolution screenshots you can get from the listing
- Re-runs skip clips that already exist — only failed clips are retried
- If a clip looks cartoonish, the prompt already includes
  "no stylization, photorealistic" — try switching to veo-3.1
