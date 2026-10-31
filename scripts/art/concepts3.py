"""Round three: photo-led back prints for the pieces that were type only. Run from the repo root."""
import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter
from concepts import *
import concepts2 as c2  # front_mark relies on this module's `slug`

def feather(img, edge=260, top=True, bottom=True):
    """Fades the photo's alpha to nothing at its top and bottom so it melts into the shirt."""
    a = np.asarray(img.getchannel("A"), np.float32) / 255; h = a.shape[0]
    ramp = np.ones(h, np.float32); y = np.arange(h)
    if top: ramp = np.minimum(ramp, np.clip(y / edge, 0, 1))
    if bottom: ramp = np.minimum(ramp, np.clip((h - y) / edge, 0, 1))
    img = img.copy(); img.putalpha(Image.fromarray((a * ramp[:, None] * 255).astype(np.uint8))); return img

def vignette(img, power=2.6):
    """Fades alpha toward an ellipse's edge, so no hard photo border shows."""
    h, w = img.height, img.width; yy, xx = np.mgrid[0:h, 0:w]
    r = np.sqrt(((xx - w / 2) / (w / 2)) ** 2 + ((yy - h / 2) / (h / 2)) ** 2)
    k = np.clip((1 - r) * power, 0, 1); a = np.asarray(img.getchannel("A"), np.float32) * k
    img = img.copy(); img.putalpha(Image.fromarray(a.astype(np.uint8))); return img

def fit_w(img, maxw):
    return img if img.width <= maxw else img.resize((maxw, int(img.height * maxw / img.width)), Image.LANCZOS)

# ---- Black tee: a lion in silver grain behind the chrome blackletter ----
def jik_lion():
    c2.slug = "jik-lion"
    img = canvas(); mark(img, BONE, RED)
    ph = duotone_photo("art/src/lion-c-1.jpg", (2500, 2500), (40, 38, 36), (244, 238, 226), box=(1000, 0, 2400, 1546), cutoff=0.10)
    ph = vignette(ph.filter(ImageFilter.UnsharpMask(radius=3, percent=120, threshold=2)), 3.2)
    paste_center(img, ph, 2050)
    paste_center(img, fit_w(chrome_text("Jesus is King", font("goth", 900), SILVER), 3200), 3880)
    text(img, (W / 2, 4330), "I, THE LORD, THE KING OF HEAVEN, WILL BE THEIR KING", fit_text("I, THE LORD, THE KING OF HEAVEN, WILL BE THEIR KING", "bold", 3000, 130), BONE)
    verse_ref(img, 4580, "2 NEPHI 10:14", RED); save(img, "concept-jik-lion-back")
    c2.front_mark("JESUS IS KING", BONE, RED)

# ---- Shadow tee: a cumulonimbus anvil in a gold arch window ----
def heaven_sky():
    c2.slug = "heaven-sky"
    img = canvas(); mark(img, BONE, GOLD)
    ph = duotone_photo("art/src/nasa-clouds-1.jpg", (2900, 2700), (96, 62, 24), (255, 232, 184), box=(250, 150, 2750, 1990), cutoff=0.0)
    ph.putalpha(ImageChops.multiply(Image.new("L", ph.size, 255), arch_mask(ph.size, 0.5)))
    paste_center(img, ph, 1960)
    d = ImageDraw.Draw(img); d.arc((350 - 40, 610 - 40, 3250 + 40, 2060), 180, 360, fill=GOLD, width=14)
    paste_center(img, fit_w(chrome_text("The King of Heaven", font("goth2", 560), FOIL), 3200), 3620)
    text(img, (W / 2, 4120), "WILL BE THEIR KING, AND I WILL BE A LIGHT UNTO THEM FOREVER", fit_text("WILL BE THEIR KING, AND I WILL BE A LIGHT UNTO THEM FOREVER", "black", 3000, 150), BONE)
    verse_ref(img, 4400, "2 NEPHI 10:14", GOLD); save(img, "concept-heaven-sky-back")
    c2.front_mark("THE KING OF HEAVEN", BONE, GOLD)

if __name__ == "__main__":
    jik_lion(); heaven_sky()
