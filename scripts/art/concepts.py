"""Six design-direction concepts for the Jesus Is King line, as 300 DPI back prints (3600 x 4800, transparent).
Source art in art/src is public domain (Doré, 1891 Bible engravings, NASA). Fonts in art/fonts are OFL.
Run from the repo root: python3 scripts/art/concepts.py"""
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps, ImageChops
import numpy as np, os

Image.MAX_IMAGE_PIXELS = None
W, H = 3600, 4800
OUT = "print"
BONE, GOLD, RED, NIGHT = (236, 232, 223), (201, 164, 92), (168, 58, 44), (22, 32, 27)
F = {"black": "/usr/share/fonts/opentype/inter/Inter-Black.otf", "bold": "/usr/share/fonts/opentype/inter/Inter-Bold.otf",
     "semi": "/usr/share/fonts/opentype/inter/Inter-SemiBold.otf", "goth": "art/fonts/UnifrakturMaguntia-Book.ttf",
     "goth2": "art/fonts/PirataOne-Regular.ttf"}
def font(k, s):
    """Archivo (the brand font) for the type: condensed black for display, regular width for small text."""
    if k in ("black", "bold", "semi"):
        f = ImageFont.truetype("art/fonts/Archivo.ttf", s)
        f.set_variation_by_axes([{"black": 900, "bold": 800, "semi": 600}[k], 62 if k == "black" else 100])
        return f
    return ImageFont.truetype(F[k], s)

def canvas(): return Image.new("RGBA", (W, H), (0, 0, 0, 0))

def text(img, xy, s, f, fill, anchor="mm", spacing=0):
    d = ImageDraw.Draw(img)
    if spacing:  # letter-spaced, centered on x
        widths = [d.textlength(c, font=f) for c in s]; total = sum(widths) + spacing * (len(s) - 1)
        x = xy[0] - total / 2
        for c, w in zip(s, widths): d.text((x, xy[1]), c, font=f, fill=fill, anchor="lm"); x += w + spacing
    else: d.text(xy, s, font=f, fill=fill, anchor=anchor)

def fit_text(s, key, width, max_size):
    size = max_size
    while size > 20 and ImageDraw.Draw(Image.new("L", (1, 1))).textlength(s, font=font(key, size)) > width: size -= 4
    return font(key, size)

def mark(img, ink, cloth, y=200):
    """The Rent Coat Co. mark under the collar: torn flag beside the name."""
    d = ImageDraw.Draw(img); f = font("black", 120); label = "RENT COAT CO."
    tw = d.textlength(label, font=f); x0 = (W - tw - 150) / 2
    d.rectangle((x0, y - 70, x0 + 14, y + 80), fill=ink)
    d.polygon([(x0 + 14, y - 70), (x0 + 120, y - 70), (x0 + 104, y - 44), (x0 + 124, y - 20), (x0 + 100, y), (x0 + 118, y + 22), (x0 + 14, y + 22)], fill=cloth)
    d.text((x0 + 150, y + 6), label, font=f, fill=ink, anchor="lm")

def ink_from_engraving(path, color, size, contrast=1.6, gamma=1.0, screen=0, crisp=False):
    """Turns a black-on-paper engraving into one ink color: dark lines become solid ink, paper becomes clear.
    screen=N redraws soft, tonal art (photo-engravings) as a halftone dot screen with N-pixel cells, so it prints
    sharp at any size; crisp=True sharpens line art that has been enlarged."""
    im = Image.open(path).convert("L"); im = ImageOps.autocontrast(im, cutoff=1)
    im = im.resize(size, Image.LANCZOS)
    if crisp: im = im.filter(ImageFilter.UnsharpMask(radius=4, percent=180, threshold=2))
    a = 1 - np.asarray(im, dtype=np.float32) / 255
    a = np.clip((a - 0.12) * contrast, 0, 1) ** gamma
    if crisp: a = np.clip((a - 0.5) * 2.2 + 0.5, 0, 1)
    if screen:
        yy, xx = np.mgrid[0:a.shape[0], 0:a.shape[1]]
        # 45-degree screen: dot area matches the tone
        u, v = (xx + yy) / np.sqrt(2), (xx - yy) / np.sqrt(2)
        cu, cv = (u % screen) - screen / 2, (v % screen) - screen / 2
        r = np.sqrt(cu ** 2 + cv ** 2) / (screen / 2)
        a = (r < np.sqrt(np.clip(a, 0, 1)) * 1.15).astype(np.float32)
    out = np.zeros((*a.shape, 4), np.uint8); out[..., :3] = color; out[..., 3] = (a * 255).astype(np.uint8)
    return Image.fromarray(out, "RGBA")

def duotone_photo(path, size, lo, hi, box=None, cutoff=0.06, dots=False):
    """A photo as two inks: shadows drop out to the shirt, midtones go to `lo`, highlights to `hi`."""
    im = Image.open(path).convert("L")
    if box: im = im.crop(box)
    im = ImageOps.fit(im, size, Image.LANCZOS); im = ImageOps.autocontrast(im, cutoff=1)
    l = np.asarray(im, dtype=np.float32) / 255
    if dots:  # a fine halftone screen, so it prints like a vintage tee
        yy, xx = np.mgrid[0:size[1], 0:size[0]]; cell = 22
        cx, cy = (xx % cell) - cell / 2, (yy % cell) - cell / 2
        r = np.sqrt(cx ** 2 + cy ** 2) / (cell * 0.72)
        l = np.where(r < l, np.maximum(l, 0.55), l * 0.35)
    a = np.clip((l - cutoff) / 0.5, 0, 1)
    t = np.clip(l, 0, 1)[..., None]
    rgb = np.array(lo, np.float32) * (1 - t) + np.array(hi, np.float32) * t
    out = np.zeros((*l.shape, 4), np.uint8); out[..., :3] = rgb.astype(np.uint8); out[..., 3] = (a * 255).astype(np.uint8)
    return Image.fromarray(out, "RGBA")

def arch_mask(size, r_ratio=0.5):
    w, h = size; m = Image.new("L", size, 0); d = ImageDraw.Draw(m); r = int(w * r_ratio)
    d.rectangle((0, r, w, h), fill=255); d.pieslice((0, 0, w, 2 * r), 180, 360, fill=255); return m

def chrome_text(s, f, stops):
    """Text filled with a metallic vertical gradient, a thin dark inline and a soft outer glow line."""
    d0 = ImageDraw.Draw(Image.new("L", (1, 1))); bb = d0.textbbox((0, 0), s, font=f)
    w, h = bb[2] - bb[0] + 80, bb[3] - bb[1] + 80
    m = Image.new("L", (w, h), 0); ImageDraw.Draw(m).text((40 - bb[0], 40 - bb[1]), s, font=f, fill=255)
    ys = np.linspace(0, 1, h)[:, None]
    grad = np.zeros((h, w, 3), np.float32)
    pos = [p for p, _ in stops]; cols = np.array([c for _, c in stops], np.float32)
    for ch in range(3): grad[..., ch] = np.interp(ys, pos, cols[:, ch]).repeat(w, 1)
    fill = Image.fromarray(grad.astype(np.uint8), "RGB").convert("RGBA"); fill.putalpha(m)
    edge = m.filter(ImageFilter.MaxFilter(9)); ring = ImageChops.subtract(edge, m)
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0)); outline = Image.new("RGBA", (w, h), (20, 20, 20, 255)); outline.putalpha(ring)
    out.alpha_composite(outline); out.alpha_composite(fill)
    shine = m.filter(ImageFilter.MinFilter(13)); hl = Image.new("RGBA", (w, h), (255, 255, 255, 0))
    hl.putalpha(ImageChops.subtract(m, shine).point(lambda v: v // 3))
    out.alpha_composite(hl)
    return out

def paste_center(img, piece, cy):
    img.alpha_composite(piece, ((W - piece.width) // 2, int(cy - piece.height / 2)))

def verse_ref(img, y, s, color): text(img, (W / 2, y), s, font("semi", 110), color, spacing=40)

def save(img, name):
    img.save(f"{OUT}/{name}.png"); print(name)

# ---- Direction 1: old master engraving + big type ----
def engraving_hosanna():  # black tee, bone ink, gold type
    img = canvas(); mark(img, BONE, GOLD)
    f = fit_text("HOSANNA!", "black", 3300, 900)
    text(img, (W / 2, 820), "HOSANNA!", f, GOLD)
    eng = ink_from_engraving("art/src/dore-entry-3.jpg", BONE, (2900, 3540))
    eng = eng.crop((0, 0, 2900, 2500))
    m = arch_mask(eng.size, 0.5); a = ImageChops.multiply(eng.getchannel("A"), m); eng.putalpha(a)
    paste_center(img, eng, 2550)
    d = ImageDraw.Draw(img); d.rectangle((350, 3860, 3250, 3878), fill=GOLD)
    text(img, (W / 2, 4060), "BLESSED BE THE NAME OF THE MOST HIGH GOD!", fit_text("BLESSED BE THE NAME OF THE MOST HIGH GOD!", "black", 3000, 170), BONE)
    verse_ref(img, 4300, "3 NEPHI 11:17", GOLD); save(img, "concept-engraving-hosanna-back")

def engraving_come():  # cream tee, dark ink, red type
    img = canvas(); mark(img, NIGHT, RED)
    eng = ink_from_engraving("art/src/dore-sermon-1.jpg", NIGHT, (3000, 4048), contrast=1.4)
    eng = eng.crop((0, 0, 3000, 3700))
    m = Image.new("L", eng.size, 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, 3000, 3700), 60, fill=255)
    eng.putalpha(ImageChops.multiply(eng.getchannel("A"), m))
    eng = eng.resize((2700, 3330), Image.LANCZOS)
    paste_center(img, eng, 2050)
    band = Image.new("RGBA", (W, 760), (0, 0, 0, 0)); bd = ImageDraw.Draw(band)
    f = fit_text("COME UNTO CHRIST", "black", 3400, 700); bd.text((W / 2, 380), "COME UNTO CHRIST", font=f, fill=RED, anchor="mm")
    img.alpha_composite(band, (0, 3500))
    text(img, (W / 2, 4330), "AND BE PERFECTED IN HIM", fit_text("AND BE PERFECTED IN HIM", "black", 2400, 200), NIGHT)
    verse_ref(img, 4560, "MORONI 10:32", RED); save(img, "concept-engraving-come-back")

# ---- Direction 2: gothic blackletter with chrome / gold foil ----
SILVER = [(0, (250, 250, 252)), (0.42, (170, 174, 182)), (0.5, (70, 74, 82)), (0.58, (205, 208, 214)), (1, (120, 124, 132))]
FOIL = [(0, (255, 236, 170)), (0.42, (214, 168, 80)), (0.5, (118, 78, 24)), (0.6, (236, 196, 110)), (1, (160, 112, 40))]

def gothic_king():  # black tee, silver chrome
    img = canvas(); mark(img, BONE, RED)
    j = chrome_text("Jesus", font("goth", 1250), SILVER); paste_center(img, j, 1250)
    i = chrome_text("is", font("goth", 700), SILVER); paste_center(img, i, 2120)
    k = chrome_text("King", font("goth", 1450), SILVER); paste_center(img, k, 3050)
    text(img, (W / 2, 3980), "I, THE LORD, THE KING OF HEAVEN, WILL BE THEIR KING", fit_text("I, THE LORD, THE KING OF HEAVEN, WILL BE THEIR KING", "bold", 3000, 130), BONE)
    verse_ref(img, 4220, "2 NEPHI 10:14", RED); save(img, "concept-gothic-king-back")

def gothic_heaven():  # shadow tee, gold foil
    img = canvas(); mark(img, BONE, GOLD)
    a = chrome_text("The King", font("goth2", 1000), FOIL); paste_center(img, a, 1350)
    b = chrome_text("of Heaven", font("goth2", 1000), FOIL); paste_center(img, b, 2400)
    d = ImageDraw.Draw(img)
    for x0, x1 in ((420, 1500), (2100, 3180)): d.rectangle((x0, 3120, x1, 3136), fill=GOLD)
    d.polygon([(1800, 3040), (1880, 3128), (1800, 3216), (1720, 3128)], fill=GOLD)
    text(img, (W / 2, 3500), "WILL BE THEIR KING, AND I WILL BE", fit_text("WILL BE THEIR KING, AND I WILL BE", "black", 2800, 190), BONE)
    text(img, (W / 2, 3740), "A LIGHT UNTO THEM FOREVER", fit_text("A LIGHT UNTO THEM FOREVER", "black", 2800, 190), BONE)
    verse_ref(img, 4050, "2 NEPHI 10:14", GOLD); save(img, "concept-gothic-heaven-back")

# ---- Direction 3: vintage washed photo ----
def photo_earth():  # black tee, gold/bone duotone halftone earth
    img = canvas(); mark(img, BONE, GOLD)
    # The real NASA colors, faded and warmed like an old print, with film grain.
    src = Image.open("art/src/nasa-earth-1.jpg").convert("RGB").crop((300, 300, 7700, 7700)).resize((2900, 2900), Image.LANCZOS)
    a = np.asarray(src, np.float32) / 255
    g = a.mean(axis=2, keepdims=True); a = a * 0.72 + g * 0.28            # a little desaturated
    a = a * np.array([1.06, 0.98, 0.86]) + np.array([0.04, 0.02, 0.0])    # warm, faded blacks
    a = np.clip(a + np.random.default_rng(7).normal(0, 0.035, a.shape[:2])[..., None], 0, 1)
    earth = Image.fromarray((a * 255).astype(np.uint8), "RGB").convert("RGBA")
    m = Image.new("L", earth.size, 0); ImageDraw.Draw(m).ellipse((8, 8, 2892, 2892), fill=255)
    earth.putalpha(m.filter(ImageFilter.GaussianBlur(3)))
    paste_center(img, earth, 1900)
    f1 = fit_text("BEHOLD THE GLORY", "black", 3300, 520)
    text(img, (W / 2, 3650), "BEHOLD THE GLORY", f1, BONE)
    text(img, (W / 2, 4060), "OF THE KING OF ALL THE EARTH", fit_text("OF THE KING OF ALL THE EARTH", "black", 3300, 300), GOLD)
    verse_ref(img, 4380, "ALMA 5:50", BONE); save(img, "concept-photo-earth-back")

def photo_light():  # black tee, warm duotone sunrise from orbit, big type over the horizon
    img = canvas(); mark(img, BONE, RED)
    sun = duotone_photo("art/src/nasa-sunrise-1.jpg", (3400, 2300), RED, (255, 236, 200), box=(400, 0, 3900, 2400), cutoff=0.10)
    m = Image.new("L", sun.size, 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, 3400, 2300), 80, fill=255)
    fade = Image.linear_gradient("L").resize((3400, 2300)).point(lambda v: 255 if v < 170 else int(255 - (v - 170) * 3))
    sun.putalpha(ImageChops.multiply(ImageChops.multiply(sun.getchannel("A"), m), fade))
    paste_center(img, sun, 1600)
    text(img, (W / 2, 3050), "I AM THE LIGHT", fit_text("I AM THE LIGHT", "black", 3300, 620), BONE)
    text(img, (W / 2, 3600), "AND THE LIFE OF THE WORLD", fit_text("AND THE LIFE OF THE WORLD", "black", 3300, 330), (255, 200, 150))
    verse_ref(img, 3960, "3 NEPHI 11:11", BONE); save(img, "concept-photo-light-back")

if __name__ == "__main__":
    for fn in (engraving_hosanna, engraving_come, gothic_king, gothic_heaven, photo_earth): fn()
