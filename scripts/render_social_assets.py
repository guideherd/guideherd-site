from pathlib import Path
import csv
import io
import re
import cairosvg
from PIL import Image

root = Path("images/social")
source = root / "ready-svg"
manifest = root / "manifest.csv"
with manifest.open(newline="", encoding="utf-8") as f:
    rows = list(csv.DictReader(f))
existing = {r["filename"] for r in rows}
for src in sorted(source.glob("*.svg")):
    text = src.read_text(encoding="utf-8")
    # A render is not approval: reject sources with literal text or linked resources.
    if re.search(r"<\\s*(?:text|foreignObject|image|script)\\b|(?:href|xlink:href)\\s*=", text, re.I):
        raise SystemExit(f"Disallowed element or external resource in {src}")
    out = root / (src.stem + ".png")
    png = cairosvg.svg2png(bytestring=text.encode(), output_width=1080, output_height=1080)
    im = Image.open(io.BytesIO(png)).convert("RGB")
    if im.size != (1080, 1080):
        raise SystemExit(f"Invalid size for {src}")
    im.save(out, "PNG", optimize=True)
    if out.name not in existing:
        rows.append({"filename":out.name,"category":"Editorial","theme":"Office handoff shown as a connected physical paper workflow","format":"1080x1080 PNG"})
        existing.add(out.name)
with manifest.open("w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=["filename","category","theme","format"], lineterminator="\r\n")
    writer.writeheader()
    writer.writerows(rows)
