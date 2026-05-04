# Listing Video Generator — Setup Guide

## One-time setup

1. Install Python dependencies:
   pip install google-genai pillow beautifulsoup4

2. Install ffmpeg (for auto-stitching clips):
   Mac:     brew install ffmpeg
   Windows: https://ffmpeg.org/download.html

3. Create a .env file in the same folder as the script:
   GOOGLE_API_KEY=your_key_here

   Never share this file or commit it to git.

---

## Folder structure

Organize photos like this before running:

  listings/
    5186_Vardon_Dr/
      01_exterior.jpg
      02_fountain.jpg
      03_facade.jpg
      04_interior.jpg
      05_pool.jpg

Name photos with a number prefix so they sort in walkthrough order.
Include scene keywords in filenames for best prompts:
  exterior, fountain, facade, interior, pool,
  kitchen, bedroom, bathroom, living

---

## Running the script

Basic (fallback prompts):
  python listing_video_generator.py --folder "./listings/5186_Vardon_Dr"

With Zillow description (recommended):
  python listing_video_generator.py \
    --folder "./listings/5186_Vardon_Dr" \
    --zillow "https://www.zillow.com/homedetails/5186-Vardon-Dr-Windermere-FL-34786/46138378_zpid/"

Optional flags:
  --model    veo-2.0-generate-001        (faster, cheaper)
             veo-3.1-generate-preview    (best quality, default)
  --duration 4  or  6  or  8            (seconds per clip, default 6)

What happens when you pass --zillow:
  1. Script fetches the listing description from Zillow
  2. Sends it + your photo filenames to Gemini Flash
  3. Gemini writes a custom video prompt per photo using actual property details
     (e.g. "golf-front views", "fountain entry", "soaring ceilings")
  4. Those prompts drive Veo — making clips specific to THIS property
  5. Prompts saved to output/generated_prompts.json so you can review or edit them

---

## Output

  listings/5186_Vardon_Dr/output/
    clip_01_exterior.mp4
    clip_02_fountain.mp4
    ...
    walkthrough_preview.mp4    ← stitched preview ready to send

---

## Model cost guide (Google AI Studio pay-as-you-go)

  veo-2.0-generate-001          ~$0.35/second → ~$2.10 per 6s clip
  veo-3.0-generate-001          ~$0.50/second → ~$3.00 per 6s clip
  veo-3.1-generate-preview      pricing TBD, preview access

  5-clip listing walkthrough:
    Veo 2:   ~$10.50 total
    Veo 3:   ~$15.00 total

  Compare: Higgsfield Kling 3.0 = 75 credits for 5 clips (~$7.50-15 depending on plan)

---

## Tips for best realism

- Name files with scene keywords (exterior, pool, kitchen etc.)
- Use the highest resolution screenshots you can get
- Veo works best when the photo is well-lit and uncluttered
- If a clip looks cartoonish, add "no stylization, photorealistic" — already in all prompts
- Re-runs skip existing clips automatically so you can retry just the bad ones
