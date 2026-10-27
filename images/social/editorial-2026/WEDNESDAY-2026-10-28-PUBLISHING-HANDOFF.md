# Wednesday Oct 28: bold creative publishing handoff

## Status
**BLOCKED ON ASSET DELIVERY** as of Oct 26. Four approved-direction 1080×1080 PNGs were created in ChatGPT but **not uploaded to this repository**. Do not infer public URLs or add phantom manifest entries. The previous ready-svg conversion workflow has not generated GH-ED-005 PNG either; investigate separately. Existing approved library remains fallback.

## Asset package
ChatGPT conversation attachment: `guideherd-social-bold-campaign.zip` (not a public URL and not accessible to unattended publishing). Contains:
- `GH-BOLD-001-the-call-ended.png`
- `GH-BOLD-002-who-owns-next-step.png`
- `GH-BOLD-003-less-chasing.png`
- `GH-BOLD-004-between-conversations.png`
- `campaign-manifest.csv` (staging reference, not root manifest)

## Publish gate
1. Transfer actual binary PNG files into `images/social/` (not just their names or SVG approximations).
2. Confirm each is PNG, 1080×1080, legible, not cropped awkwardly; review spelling and product claims.
3. Add each real file to `images/social/manifest.csv` preserving header `filename,category,theme,format`.
4. Verify public GET of each final URL, successful HTTP status, image MIME type, and readable image bytes from the same environment that publishes via Blotato. A GitHub blob URL alone is not a verified production asset URL.
5. Only then make assets eligible for selection. If verification fails, use existing approved library for Wednesday.

## Distinct platform-native treatment
- **X:** Wednesday is text-only. Short, pointed hook, no hashtags or links, under 280 characters.
- **Threads:** Warm, witty 200–450-character reflection and genuine question. Use a distinct image or crop from Facebook and Instagram.
- **Facebook:** Practical 100–180-word business-owner scenario, distinct image treatment; no hashtags, links in first comment only.
- **Instagram:** Strongest visual treatment, 3–6 short caption lines, image always, weekly 2–3-panel carousel when feasible, max 3 hashtags and no links.
- Avoid repeating identical image and copy across accounts. Never claim GuideHerd serves a specific vertical, integration, or customer unless verified.
- Wednesday theme: how we build it / what shipped; if no verified shipped claim, discuss a general design lesson, not a fabricated launch.

## Creative positioning
GuideHerd is cross-industry business automation. Central idea: **the work between conversations**. Approved direction: bold headline, polished 3D/illustration, strong contrast, clever metaphors. Inspired by productivity brands but original, not a reproduction. Reject generic folder-only placeholders.

## Operational safety
Do not touch engineering wood chipper or Jarvis. Claude owns posting via Blotato. Respect existing 275-credit weekly cap. Do not alter publishing schedule without authorization.
