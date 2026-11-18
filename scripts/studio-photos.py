# Studio-style product photos from the mockups: the garment cut out of its white background and set on a warm
# backdrop with a soft floor shadow (4:5), a close-up of the main print, and a flat-lay of the full fit.
# Run: python3 scripts/studio-photos.py   -> public/images/studio/<id>-{studio,detail,fit}.jpg
import json, subprocess, os
from collections import deque
import numpy as np
from PIL import Image, ImageFilter, ImageDraw
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUB = os.path.join(ROOT, "public"); OUT = os.path.join(PUB, "images", "studio")
live = json.loads(subprocess.check_output(["node", "-e", 'import("./netlify/lib/store.mjs").then(s=>console.log(JSON.stringify(s.liveLine())))'], cwd=ROOT))
STONE, BONE, FOREST = (232, 226, 214), (241, 237, 228), (32, 46, 39)

def cutout(path):
    im = Image.open(os.path.join(PUB, path)).convert("RGB"); a = np.asarray(im).astype(int); h, w, _ = a.shape
    light = (a.min(2) >= 200) & ((a.max(2) - a.min(2)) <= 18)
    mask = np.zeros((h, w), bool); q = deque()
    for x in range(w): q.extend([(0, x), (h - 1, x)])
    for y in range(h): q.extend([(y, 0), (y, w - 1)])
    while q:
        y, x = q.popleft()
        if mask[y, x] or not light[y, x]: continue
        mask[y, x] = True
        if y > 0: q.append((y - 1, x))
        if y < h - 1: q.append((y + 1, x))
        if x > 0: q.append((y, x - 1))
        if x < w - 1: q.append((y, x + 1))
    alpha = Image.fromarray(((~mask) * 255).astype("uint8")).filter(ImageFilter.GaussianBlur(1.2))
    out = im.convert("RGBA"); out.putalpha(alpha)
    return out.crop(alpha.getbbox())

def backdrop(W, H, col):
    bg = Image.new("RGB", (W, H), col)
    # soft vignette and floor line for depth
    v = Image.new("L", (W, H), 0); d = ImageDraw.Draw(v); d.ellipse([-W * .3, -H * .2, W * 1.3, H * 1.1], fill=255)
    v = v.filter(ImageFilter.GaussianBlur(W * .12))
    dark = Image.new("RGB", (W, H), tuple(max(0, c - 18) for c in col))
    return Image.composite(bg, dark, v)

def place(bg, g, box, shadow=True):
    x0, y0, bw, bh = box; k = min(bw / g.width, bh / g.height); g2 = g.resize((int(g.width * k), int(g.height * k)), Image.LANCZOS)
    x = int(x0 + (bw - g2.width) / 2); y = int(y0 + (bh - g2.height) / 2)
    if shadow:
        sh = Image.new("RGBA", bg.size, (0, 0, 0, 0)); m = g2.getchannel("A").point(lambda v: int(v * .32))
        blk = Image.new("RGBA", g2.size, (20, 16, 10, 255)); blk.putalpha(m); sh.paste(blk, (x + 10, y + 26), blk)
        bg.paste(sh.filter(ImageFilter.GaussianBlur(22)), (0, 0), sh.filter(ImageFilter.GaussianBlur(22)))
    bg.paste(g2, (x, y), g2)

def cutout_soft(path):
    # light garments: keep the photo, make only pure white transparent via multiply-friendly alpha
    im = Image.open(os.path.join(PUB, path)).convert("RGB"); a = np.asarray(im).astype(int)
    d = 255 - a.min(2); alpha = np.clip(d * 6, 0, 255).astype("uint8")
    out = im.convert("RGBA"); out.putalpha(Image.fromarray(alpha).filter(ImageFilter.GaussianBlur(.8)))
    return out.crop(out.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox())

sweats = cutout("images/opening/press-forward-sweats-front.jpg")
cap = cutout("images/products/flag-cap-3.jpg")
made = []
for p in live:
    if p["kind"] in ("Sticker",): continue
    if p["kind"] == "Cap":
        g = cap
    else:
        g = cutout(p["images"][0]["src"])
    light_garment = p["swatch"].lower() in ("#fff8ea", "#f3eee1", "#f5e8ce", "#ca8447")
    col = FOREST if light_garment else STONE
    W, H = 1600, 2000
    if light_garment:
        # light fabric can't be cut out of a white background cleanly: multiply the photo onto a stone backdrop instead
        src0 = Image.open(os.path.join(PUB, p["images"][0]["src"])).convert("RGB")
        bg = backdrop(W, H, STONE); k = min((W - 240) / src0.width, (H - 400) / src0.height)
        sm = src0.resize((int(src0.width * k), int(src0.height * k)), Image.LANCZOS)
        x, y = (W - sm.width) // 2, (H - sm.height) // 2
        region = bg.crop((x, y, x + sm.width, y + sm.height))
        from PIL import ImageChops
        bg.paste(ImageChops.multiply(region, sm), (x, y)); bg = bg.convert("RGBA")
    else:
        bg = backdrop(W, H, col).convert("RGBA"); place(bg, g, (160, 200, W - 320, H - 400))
    bg.convert("RGB").save(f"{OUT}/{p['id']}-studio.jpg", quality=86, optimize=True)
    # detail: centered crop of the main print area on the original photo
    src = Image.open(os.path.join(PUB, p["images"][0]["src"])).convert("RGB"); w, h = src.size
    cx, cy, s = w * .5, h * (.38 if p["kind"] in ("Tee", "Hoodie", "Set") else .5), w * .36
    if p["kind"] == "Sweats": cx, cy, s = w * .66, h * .72, w * .3
    s = min(s, cx, w - cx, cy / 1.25, (h - cy) / 1.25)
    det = src.crop((int(cx - s), int(cy - s * 1.25), int(cx + s), int(cy + s * 1.25))).resize((1600, 2000), Image.LANCZOS)
    det.save(f"{OUT}/{p['id']}-detail.jpg", quality=86, optimize=True)
    # the fit: top + sweats + cap flat lay on bone
    if p["kind"] in ("Tee", "Hoodie", "Set"):
        fl = Image.new("RGBA", (W, H), BONE + (255,))
        place(fl, g if not light_garment else cutout_soft(p["images"][0]["src"]), (120, 80, 980, 900)); place(fl, sweats, (330, 900, 560, 1040)); place(fl, cap, (1080, 160, 420, 420))
        fl.convert("RGB").save(f"{OUT}/{p['id']}-fit.jpg", quality=86, optimize=True)
    made.append(p["id"])
print(len(made), "products:", ", ".join(made))
