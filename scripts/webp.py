# Next-gen images: a WebP copy of every storefront photo at 800 and 1600 px wide, next to the JPEG
# (name.jpg -> name-800.webp, name-1600.webp). The shop pages serve them with <picture>/srcset; the JPEG stays the fallback.
# Run after adding photos:  python3 scripts/webp.py
import os, glob
from PIL import Image
ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "images")
made = 0
for f in glob.glob(f"{ROOT}/studio/*.jpg") + glob.glob(f"{ROOT}/opening/*.jpg") + glob.glob(f"{ROOT}/products/flag-cap-*.jpg") + glob.glob(f"{ROOT}/products/*-sticker-*.jpg"):
    im = None
    for w in (800, 1600):
        out = f[:-4] + f"-{w}.webp"
        if os.path.exists(out) and os.path.getmtime(out) >= os.path.getmtime(f): continue
        im = im or Image.open(f).convert("RGB")
        if im.width < w and w == 1600: w2 = im.width
        else: w2 = w
        im.resize((w2, round(im.height * w2 / im.width)), Image.LANCZOS).save(out, "WEBP", quality=80, method=6); made += 1
print("webp files written:", made)
