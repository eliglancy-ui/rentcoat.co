"""Second round: every remaining piece in its own style, for the drop plan. Run: python3 scripts/art/concepts2.py
Hoodie backs keep their art below y 560 so the hood does not cover it."""
import sys; sys.path.insert(0, "scripts/art")
from concepts import *

def front_mark(name, ink, cloth):
    """A small left-chest print (wearer's left): the flag and a short line, about 3.5 in wide."""
    img = canvas(); d = ImageDraw.Draw(img); cx, y = 2560, 640
    f = fit_text(name, "black", 1000, 150); tw = d.textlength(name, font=f)
    d.polygon([(cx - 60, y - 230), (cx + 60, y - 230), (cx + 44, y - 206), (cx + 64, y - 184), (cx + 40, y - 164), (cx + 58, y - 142), (cx - 60, y - 142)], fill=cloth)
    d.rectangle((cx - 74, y - 236, cx - 60, y - 120), fill=ink)
    d.text((cx, y), name, font=f, fill=ink, anchor="mm")
    text(img, (cx, y + 130), "RENT COAT CO.", font("semi", 60), ink, spacing=14)
    save(img, f"concept-{slug}-front")

# ---- Gothic chrome on a hoodie: "Jesus is King" across the back (the Etsy bestseller format) ----
def jik_hoodie():
    global slug; slug = "jik-hoodie"
    img = canvas(); mark(img, BONE, RED, y=640)
    paste_center(img, chrome_text("Jesus", font("goth", 1150), SILVER), 1600)
    paste_center(img, chrome_text("is", font("goth", 620), SILVER), 2380)
    paste_center(img, chrome_text("King", font("goth", 1300), SILVER), 3230)
    text(img, (W / 2, 4110), "I, THE LORD, THE KING OF HEAVEN, WILL BE THEIR KING", fit_text("I, THE LORD, THE KING OF HEAVEN, WILL BE THEIR KING", "bold", 3000, 130), BONE)
    verse_ref(img, 4350, "2 NEPHI 10:14", RED); save(img, "concept-jik-hoodie-back")
    front_mark("JESUS IS KING", BONE, RED)

# ---- Engraving, poster crop: Samuel on the wall (1925 illustration) ----
def samuel():
    global slug; slug = "samuel"
    img = canvas(); mark(img, BONE, GOLD)
    src = Image.open("art/src/bom-samuel-1.png").convert("L"); src = src.crop((40, 40, src.width - 40, src.height - 260)).convert("RGB")
    src.save("/tmp/_samuel.png")
    eng = ink_from_engraving("/tmp/_samuel.png", BONE, (2700, int(2700 * src.height / src.width)), contrast=1.5)
    paste_center(img, eng, 400 + eng.height / 2)
    y = 420 + eng.height
    text(img, (W / 2, y + 260), "THEY COULD NOT HIT HIM", fit_text("THEY COULD NOT HIT HIM", "black", 3300, 520), GOLD)
    text(img, (W / 2, y + 560), "WITH THEIR STONES NEITHER WITH THEIR ARROWS", fit_text("WITH THEIR STONES NEITHER WITH THEIR ARROWS", "black", 3000, 170), BONE)
    verse_ref(img, y + 790, "HELAMAN 16:2", GOLD); save(img, "concept-samuel-back")
    front_mark("SAMUEL ON THE WALL", BONE, GOLD)

# ---- Engraving in a ticket-stub frame: the storm (Ottinger, 1888) with Helaman 5:12 ----
def storm():
    global slug; slug = "storm"
    img = canvas(); mark(img, NIGHT, RED)
    text(img, (W / 2, 760), "WHEN ALL HIS HAIL AND HIS MIGHTY STORM", fit_text("WHEN ALL HIS HAIL AND HIS MIGHTY STORM", "black", 3100, 170), NIGHT)
    text(img, (W / 2, 960), "SHALL BEAT UPON YOU", fit_text("SHALL BEAT UPON YOU", "black", 3100, 170), NIGHT)
    eng = ink_from_engraving("art/src/bom-ottinger-1.png", NIGHT, (3200, int(3200 * 1192 / 1672)), contrast=1.5)
    eng = eng.crop((0, 0, eng.width, eng.height - 120))
    m = Image.new("L", eng.size, 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, eng.width, eng.height), 70, fill=255)
    eng.putalpha(ImageChops.multiply(eng.getchannel("A"), m)); paste_center(img, eng, 1250 + eng.height / 2)
    y = 1290 + eng.height
    text(img, (W / 2, y + 360), "IT SHALL HAVE", fit_text("IT SHALL HAVE", "black", 3300, 560), RED)
    text(img, (W / 2, y + 860), "NO POWER OVER YOU", fit_text("NO POWER OVER YOU", "black", 3300, 560), RED)
    verse_ref(img, y + 1240, "HELAMAN 5:12", NIGHT); save(img, "concept-storm-back")
    front_mark("A SURE FOUNDATION", NIGHT, RED)

# ---- Vintage park poster: Mount Shelem (NPS photo of the Tetons, public domain) ----
def shelem():
    global slug; slug = "shelem"
    img = canvas(); mark(img, BONE, GOLD, y=640)
    text(img, (W / 2, 1000), "MOUNT SHELEM", fit_text("MOUNT SHELEM", "black", 3300, 700), BONE)
    text(img, (W / 2, 1420), "ALPINE CLUB  ·  EST. ETHER 3", font("semi", 120), GOLD, spacing=30)
    ph = duotone_photo("art/src/mountain-nps-1.jpg", (3100, 2100), (190, 92, 60), (255, 226, 190), box=(0, 300, 3840, 2900), cutoff=0.05)
    m = Image.new("L", ph.size, 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, 3100, 2100), 90, fill=255)
    ph.putalpha(ImageChops.multiply(ph.getchannel("A"), m)); paste_center(img, ph, 2700)
    text(img, (W / 2, 4000), "BECAUSE OF ITS EXCEEDING HEIGHT", fit_text("BECAUSE OF ITS EXCEEDING HEIGHT", "black", 3000, 200), BONE)
    verse_ref(img, 4260, "ETHER 3:1", GOLD); save(img, "concept-shelem-back")
    front_mark("MOUNT SHELEM", BONE, GOLD)

# ---- Antique chart: the Liahona as a 1748 compass rose (for missionaries leaving) ----
def liahona():
    global slug; slug = "liahona"
    img = canvas(); mark(img, NIGHT, RED, y=640)
    src = Image.open("art/src/compass-engraving-1.jpg").convert("L")
    rose = ink_from_engraving("art/src/compass-engraving-1.jpg", NIGHT, (2700, 2720), contrast=1.3, gamma=0.9)
    m = Image.new("L", rose.size, 0); ImageDraw.Draw(m).ellipse((40, 40, 2660, 2680), fill=255)
    rose.putalpha(ImageChops.multiply(rose.getchannel("A"), m)); paste_center(img, rose, 2250)
    d = ImageDraw.Draw(img); d.ellipse((420, 860, 3180, 3640), outline=RED, width=18)
    text(img, (W / 2, 3950), "BY SMALL MEANS THE LORD", fit_text("BY SMALL MEANS THE LORD", "black", 3200, 330), RED)
    text(img, (W / 2, 4280), "CAN BRING ABOUT GREAT THINGS", fit_text("CAN BRING ABOUT GREAT THINGS", "black", 3200, 260), NIGHT)
    verse_ref(img, 4560, "1 NEPHI 16:29", RED); save(img, "concept-liahona-back")
    front_mark("THE LIAHONA", NIGHT, RED)

# ---- Gothic script, small and sweet: for missionary moms (Mother's Day) ----
def mom():
    global slug; slug = "mom"
    img = canvas(); mark(img, NIGHT, RED, y=640)
    paste_center(img, chrome_text("We do not doubt", font("goth2", 330), [(0, (60, 70, 62)), (1, (22, 32, 27))]), 1300)
    paste_center(img, chrome_text("our mothers", font("goth2", 520), [(0, (190, 80, 60)), (1, (150, 50, 38))]), 1820)
    paste_center(img, chrome_text("knew it.", font("goth2", 520), [(0, (60, 70, 62)), (1, (22, 32, 27))]), 2380)
    verse_ref(img, 2900, "ALMA 56:48", RED); save(img, "concept-mom-back")
    img = canvas(); f = font("goth2", 250); d = ImageDraw.Draw(img)
    d.text((2560, 560), "Missionary", font=f, fill=NIGHT, anchor="mm"); d.text((2560, 800), "Mom", font=font("goth2", 300), fill=RED, anchor="mm")
    save(img, "concept-mom-front")

for fn in (jik_hoodie, samuel, storm, shelem, liahona, mom): fn()
