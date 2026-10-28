// The "big back" designs: one bold illustration from a Book of Mormon story with the verse set as a justified
// block underneath, a worn print texture, the Rent Coat Co. mark under the collar and a small mark on the chest.
// Also printed sweatpants and a custom inside tag for the hoodies. No crosses or other non-LDS imagery.
// These are previews to choose from: PREVIEWS says which blank and color Printful photographs each one on.
// render.mjs renders these with the rest; setup.mjs with { "preview": true } makes the photos.
import { INK, SIZE, lock, flag, t, chest } from "./art.mjs";

const C = { ...INK, sky: "#ECE8DF" };

// Every line of the verse block is set to the same width, like a printed poster.
// The block shrinks as a whole (width and size together) until it fits between y0 and `bottom`.
function block(lines, y0, { W = 1560, max = 230, lead = 0.96, gap = 26, bottom = 2190 } = {}) {
  const natural = lines.map(([txt]) => Math.min(max, W / (txt.length * 0.47)));
  const height = natural.reduce((h, size) => h + size * lead + gap, -gap);
  const k = Math.min(1, (bottom - y0) / height), w = W * k;
  let y = y0, out = "";
  lines.forEach(([txt, fill], i) => {
    const size = natural[i] * k;
    y += size * lead;
    out += `<text x="${(900 - w / 2).toFixed(1)}" y="${y.toFixed(1)}" textLength="${w.toFixed(1)}" lengthAdjust="spacingAndGlyphs" fill="${fill}" style="font-family:'Archivo';font-weight:900;font-stretch:62%;font-size:${size.toFixed(1)}px">${txt.replace(/&/g, "&amp;")}</text>`;
    y += gap * k;
  });
  return { svg: out, bottom: y };
}
// A worn, screen-printed texture: small specks knocked out of the ink.
const WEAR = `<filter id="wear" x="0" y="0" width="100%" height="100%" filterUnits="userSpaceOnUse">
  <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="11" result="n"/>
  <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -9 6.1" result="m"/>
  <feComposite in="SourceGraphic" in2="m" operator="in"/></filter>`;
const worn = inner => `<defs>${WEAR}</defs><g filter="url(#wear)">${inner}</g>`;
const rays = (cx, cy, r, n, fill, skip = 0) => {
  let d = "";
  for (let i = 0; i < n; i++) {
    const a0 = (2 * Math.PI * i) / n + skip, a1 = a0 + Math.PI / n;
    d += `M${cx} ${cy} L${(cx + r * Math.cos(a0)).toFixed(1)} ${(cy + r * Math.sin(a0)).toFixed(1)} L${(cx + r * Math.cos(a1)).toFixed(1)} ${(cy + r * Math.sin(a1)).toFixed(1)} Z`;
  }
  return `<path d="${d}" fill="${fill}"/>`;
};
// Halftone dots that shrink toward the edge of a disc (or toward a direction with `toward`).
function halftone(cx, cy, R, fill, { step = 30, max = 13, toward = null, clip = null } = {}) {
  let out = "";
  for (let y = cy - R; y <= cy + R; y += step) for (let x = cx - R; x <= cx + R; x += step) {
    const d = Math.hypot(x - cx, y - cy) / R;
    if (d > 1) continue;
    let k = 1 - d;
    if (toward) k = Math.max(0, ((x - cx) * toward[0] + (y - cy) * toward[1]) / R);
    const r = max * Math.pow(k, 0.7);
    if (r > 1.2) out += `<circle cx="${x}" cy="${y}" r="${r.toFixed(1)}"/>`;
  }
  return `<g fill="${fill}"${clip ? ` clip-path="url(#${clip})"` : ""}>${out}</g>`;
}
const ref = (y, txt, fill) => t(900, y, 64, txt, { f: "m", fill, ls: 22, w: 600 });
const kicker = (y, txt, fill) => t(900, y, 120, txt, { f: "s", fill });
const neck = (ink, accent) => lock(900, 96, 66, ink, accent);
const front = (ink, accent) => chest(lock(0, 0, 44, ink, accent));

const DESIGNS = {
  // Captain Moroni's torn coat on a pole, planted on a hill, with the sun behind it.
  liberty: { ink: C.bone, accent: C.gold, red: C.rent || INK.red, back() {
    const { svg } = block([["IN MEMORY OF OUR GOD,", C.bone], ["OUR RELIGION, AND FREEDOM,", INK.red], ["AND OUR PEACE, OUR WIVES,", C.bone], ["AND OUR CHILDREN", INK.red]], 1450);
    return neck(C.bone, C.gold) + worn(
      kicker(300, "the title of liberty", C.gold)
      + `<clipPath id="sun"><circle cx="900" cy="860" r="560"/></clipPath><g clip-path="url(#sun)">${rays(900, 860, 700, 36, C.gold)}</g>`
      + `<circle cx="900" cy="860" r="560" fill="none" stroke="${C.gold}" stroke-width="14"/>`
      + `<path d="M120 1330 C420 1180 640 1160 900 1180 C1160 1160 1380 1180 1680 1330 Z" fill="${INK.red}"/>`
      + `<rect x="700" y="380" width="30" height="860" rx="6" fill="${C.bone}"/><circle cx="715" cy="372" r="26" fill="${C.bone}"/>`
      + `<path d="M730 420 C900 380 1040 470 1250 410 L1190 490 L1290 560 L1170 610 L1270 690 L1150 730 L1230 800 C1050 850 900 770 730 820 Z" fill="${C.bone}"/>`
      + `<path d="M730 520 C880 490 1000 560 1150 520 M730 640 C880 610 1000 680 1130 640" stroke="${INK.red}" stroke-width="10" fill="none"/>`
      + svg + ref(2290, "ALMA 46:12", C.gold));
  }, front: () => front(C.bone, C.gold) },

  // Two thousand young warriors marching under a giant 2000.
  stripling: { back() {
    const n = INK.night, r = INK.red;
    let army = "";
    for (let row = 0; row < 3; row++) {
      const s = 0.62 + row * 0.16, y = 1130 + row * 95, cols = 17 - row * 2, w = 1560 / cols;
      for (let i = 0; i < cols; i++) {
        const x = 120 + w * (i + 0.5) + (row % 2 ? w / 4 : 0);
        army += `<g transform="translate(${x.toFixed(1)} ${y}) scale(${s.toFixed(2)})"><path d="M-30 -118 A30 30 0 0 1 30 -118 L30 -108 L-30 -108 Z"/><path d="M0 -150 L0 -120" stroke="${n}" stroke-width="8"/><rect x="-22" y="-104" width="44" height="70" rx="10"/><circle cx="-26" cy="-62" r="30" fill="${r}"/><path d="M34 -190 L34 10" stroke="${n}" stroke-width="9"/><path d="M26 -190 L34 -214 L42 -190 Z"/><rect x="-20" y="-34" width="14" height="44"/><rect x="6" y="-34" width="14" height="44"/></g>`;
      }
    }
    const { svg } = block([["WE DO NOT DOUBT", n], ["OUR MOTHERS", r], ["KNEW IT.", n]], 1440, { max: 260 });
    return neck(n, r) + worn(
      kicker(300, "two thousand stripling sons", r)
      + `<text x="900" y="980" text-anchor="middle" fill="${r}" style="font-family:'Archivo';font-weight:900;font-stretch:62%;font-size:700px">2000</text>`
      + `<g fill="${n}">${army}</g>` + svg + ref(2290, "ALMA 56:48", r));
  }, front: () => front(INK.night, INK.red) },

  // Sixteen stones above the peak of Mount Shelem, each shining.
  stones: { back() {
    const b = C.bone, g = C.gold;
    let stones = "";
    for (let i = 0; i < 16; i++) {
      const a = Math.PI * (1.08 + (0.84 * i) / 15), x = 900 + 600 * Math.cos(a), y = 900 + 460 * Math.sin(a);
      stones += `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})">${rays(0, 0, 78, 12, g)}<circle r="30" fill="${b}"/></g>`;
    }
    const { svg } = block([["TOUCH THESE STONES, O LORD,", b], ["WITH THY FINGER, AND", g], ["PREPARE THEM THAT THEY", b], ["MAY SHINE FORTH", g], ["IN DARKNESS", b]], 1420, { max: 200, gap: 18 });
    return neck(b, g) + worn(
      kicker(300, "mount shelem", g) + stones
      + `<path d="M120 1340 L560 860 L690 960 L900 660 L1110 960 L1230 870 L1680 1340 Z" fill="${b}"/>`
      + `<path d="M900 660 L840 760 L900 735 L955 790 L1000 740 Z M560 860 L520 920 L570 905 Z" fill="${g}"/>`
      + svg + ref(2290, "ETHER 3:4", g));
  }, front: () => front(C.bone, C.gold) },

  // Lehi's tree, its white fruit, the rod of iron and the path leading to it.
  tree: { back() {
    const b = C.bone, g = C.gold;
    let fruit = "";
    [[-260, -120], [-140, -250], [20, -300], [190, -230], [300, -90], [-320, 30], [-170, -40], [0, -140], [160, -60], [300, 60], [-60, 40], [100, 80], [-220, 120], [230, 160]].forEach(([x, y]) => fruit += `<circle cx="${900 + x}" cy="${840 + y}" r="30" fill="${b}"/>`);
    const canopy = [[-230, -40, 230], [0, -170, 260], [230, -40, 230], [-80, 90, 220], [130, 100, 210]].map(([x, y, r]) => `<circle cx="${900 + x}" cy="${840 + y}" r="${r}"/>`).join("");
    const { svg } = block([["I BEHELD A TREE,", b], ["WHOSE FRUIT WAS", g], ["DESIRABLE TO", b], ["MAKE ONE HAPPY.", g]], 1440, { max: 250 });
    return neck(b, g) + worn(
      kicker(300, "the tree of life", g)
      + `<g fill="${g}">${canopy}</g>${fruit}`
      + `<path d="M860 1300 L880 1020 L800 930 M880 1020 L960 900 M900 1300 L920 1010 L1010 940" stroke="${b}" stroke-width="40" stroke-linecap="round" fill="none"/>`
      + `<path d="M760 1300 C820 1270 980 1270 1040 1300 Z" fill="${b}"/>`
      + `<path d="M140 1390 L780 1290" stroke="${g}" stroke-width="16" stroke-linecap="round"/><circle cx="140" cy="1390" r="18" fill="${g}"/>`
      + svg + ref(2290, "1 NEPHI 8:10", g));
  }, front: () => front(C.bone, C.gold) },

  // Samuel on the city wall, arms raised, with arrows flying past.
  samuel: { back() {
    const b = C.bone, g = C.gold;
    let bricks = "";
    for (let row = 0; row < 6; row++) for (let i = -1; i < 12; i++) {
      const x = 160 + i * 130 + (row % 2) * 65, y = 1020 + row * 56;
      const x0 = Math.max(160, x), x1 = Math.min(1640, x + 120);
      if (x1 - x0 > 20) bricks += `<rect x="${x0}" y="${y}" width="${x1 - x0}" height="48"/>`;
    }
    const tops = Array.from({ length: 12 }, (_, i) => `<rect x="${160 + i * 130}" y="960" width="80" height="56"/>`).join("");
    const arrows = [[360, 640, 62], [560, 560, 40], [1290, 600, -48], [1460, 720, -70], [1170, 560, -25], [620, 790, 75], [1320, 860, -95], [450, 890, 100]]
      .map(([x, y, a]) => `<g transform="translate(${x} ${y}) rotate(${a})"><path d="M0 70 L0 -110" stroke="${g}" stroke-width="16"/><path d="M-26 -110 L0 -168 L26 -110 Z" fill="${g}"/><path d="M-22 70 L0 34 L22 70 M-22 100 L0 64 L22 100" fill="none" stroke="${g}" stroke-width="9"/></g>`).join("");
    const { svg } = block([["THEY COULD NOT HIT HIM", b], ["WITH THEIR STONES", g], ["NEITHER WITH", b], ["THEIR ARROWS", g]], 1440, { max: 240 });
    return neck(b, g) + worn(
      kicker(300, "samuel on the wall", g) + arrows
      + `<g fill="${b}">${tops}${bricks}</g>`
      + `<g fill="${b}"><circle cx="900" cy="610" r="48"/><path d="M846 676 C820 690 790 640 760 560 L728 470 C722 452 750 444 758 462 L800 548 C830 600 850 640 900 650 C950 640 970 600 1000 548 L1042 462 C1050 444 1078 452 1072 470 L1040 560 C1010 640 980 690 954 676 L1000 960 L800 960 Z"/></g>`
      + svg + ref(2290, "HELAMAN 16:2", g));
  }, front: () => front(C.bone, C.gold) },

  // Nephi's ship on the waves under a halftone sun.
  ship: { back() {
    const n = INK.night, r = INK.red;
    const waves = Array.from({ length: 5 }, (_, i) => `<path d="M140 ${1180 + i * 62} q90 -46 180 0 t180 0 t180 0 t180 0 t180 0 t180 0 t180 0 t180 0" fill="none" stroke="${n}" stroke-width="26" stroke-linecap="round"/>`).join("");
    const { svg } = block([["THOU SHALT", n], ["CONSTRUCT A SHIP,", r], ["AFTER THE MANNER", n], ["WHICH I SHALL", r], ["SHOW THEE", n]], 1480, { max: 190, gap: 16 });
    return neck(n, r) + worn(
      kicker(300, "nephi's ship", r) + halftone(900, 800, 470, r, { step: 30, max: 15 })
      + `<g fill="${n}"><path d="M430 1110 L1370 1110 L1270 1220 L530 1220 Z"/><path d="M880 420 L880 1100 L520 1100 Z"/><path d="M920 480 L920 1100 L1270 1100 Z"/><rect x="890" y="380" width="22" height="740"/><path d="M912 380 L990 402 L912 424 Z"/></g>`
      + waves + svg + ref(2290, "1 NEPHI 17:8", r));
  }, front: () => front(INK.night, INK.red) },

  // The Liahona: an engraved ball of fine brass with its two spindles.
  liahona: { back() {
    const b = C.bone, g = C.gold;
    let ticks = "";
    for (let i = 0; i < 48; i++) { const a = (i * Math.PI) / 24, r0 = i % 4 ? 470 : 440; ticks += `<path d="M${(900 + r0 * Math.cos(a)).toFixed(1)} ${(820 + r0 * Math.sin(a)).toFixed(1)} L${(900 + 500 * Math.cos(a)).toFixed(1)} ${(820 + 500 * Math.sin(a)).toFixed(1)}"/>`; }
    const { svg } = block([["BY SMALL MEANS", b], ["THE LORD CAN BRING", g], ["ABOUT GREAT THINGS", b]], 1450, { max: 250 });
    return neck(b, g) + worn(
      kicker(300, "a round ball of curious workmanship", g)
      + `<clipPath id="ball"><circle cx="900" cy="820" r="520"/></clipPath>` + halftone(900, 820, 520, g, { step: 26, max: 12, toward: [0.6, 0.8], clip: "ball" })
      + `<g fill="none" stroke="${g}"><circle cx="900" cy="820" r="520" stroke-width="30"/><ellipse cx="900" cy="820" rx="260" ry="520" stroke-width="12"/><ellipse cx="900" cy="820" rx="520" ry="180" stroke-width="12"/><ellipse cx="900" cy="820" rx="520" ry="380" stroke-width="8"/><ellipse cx="900" cy="820" rx="420" ry="520" stroke-width="8"/></g>`
      + `<path d="M900 820 L690 560" stroke="${b}" stroke-width="44" stroke-linecap="round"/><path d="M660 520 L740 560 L690 600 Z" fill="${b}"/>`
      + `<path d="M900 820 L1150 960" stroke="${b}" stroke-width="44" stroke-linecap="round"/><circle cx="900" cy="820" r="62" fill="${b}"/><circle cx="900" cy="820" r="26" fill="${g}"/>`
      + svg + ref(2290, "1 NEPHI 16:29", g));
  }, front: () => front(C.bone, C.gold) },

  // The Jaredite barges riding mountain waves at night, lit by the stones.
  barges: { back() {
    const b = C.bone, g = C.gold;
    const stars = Array.from({ length: 60 }, (_, i) => { const x = 160 + ((i * 397) % 1480), y = 380 + ((i * 211) % 380); return `<circle cx="${x}" cy="${y}" r="${4 + (i % 3) * 3}"/>`; }).join("");
    const wave = (y, amp, off) => `M80 ${y} ` + Array.from({ length: 5 }, (_, i) => { const x0 = 80 + i * 340 + off; return `C${x0 + 120} ${y - amp} ${x0 + 230} ${y - amp * 1.15} ${x0 + 260} ${y - amp * 0.55} Q${x0 + 300} ${y - amp * 0.2} ${x0 + 340} ${y}`; }).join(" ") + ` L1720 1360 L80 1360 Z`;
    const cuts = Array.from({ length: 14 }, (_, i) => `<path d="M60 ${940 + i * 32} q105 -16 210 0 t210 0 t210 0 t210 0 t210 0 t210 0 t210 0 t210 0" fill="none" stroke="#000" stroke-width="9"/>`).join("");
    const barge = (x, y, a) => `<g transform="translate(${x} ${y}) rotate(${a})"><path d="M-150 0 C-90 -70 90 -70 150 0 C90 70 -90 70 -150 0 Z" fill="${b}"/><circle cx="-40" cy="0" r="16" fill="${g}"/><circle cx="40" cy="0" r="16" fill="${g}"/></g>`;
    const { svg } = block([["YE SHALL BE", b], ["AS A WHALE IN THE", g], ["MIDST OF THE SEA", b]], 1460, { max: 250 });
    return neck(b, g) + worn(
      kicker(300, "the jaredite barges", g) + `<g fill="${b}">${stars}</g>`
      + barge(560, 860, -14) + barge(1250, 900, 12)
      + Array.from({ length: 7 }, (_, i) => { const y = 980 + i * 58, amp = 120 - i * 12, w = 300 + i * 20; let d = `M100 ${y}`; for (let x = 100; x < 1700; x += w) d += ` C${x + w * 0.3} ${y - amp} ${x + w * 0.7} ${y - amp} ${x + w} ${y}`; return `<path d="${d}" fill="none" stroke="${i % 3 === 1 ? g : b}" stroke-width="${22 - i * 1.5}" stroke-linecap="round"/>`; }).join("")
      + barge(900, 1020, -5)
      + svg + ref(2290, "ETHER 2:24", g));
  }, front: () => front(C.bone, C.gold) },
};

// Printed sweatpants. The left leg carries the art; the right leg a small mark low on the shin.
const SWEATS = {
  "press-forward": { ink: INK.night, accent: INK.red, left: () => `<g transform="translate(210 1000) rotate(-90)">${t(0, 30, 190, "PRESS FORWARD", { fill: INK.night, wd: 62, ls: 6 })}${t(0, 130, 54, "WITH A STEADFASTNESS · 2 NEPHI 31:20", { f: "m", fill: INK.red, ls: 6 })}</g>${flag(210, 190, 260, INK.red, INK.night)}` },
  "iron-rod": { ink: C.bone, accent: C.gold, left: () => `<path d="M210 120 L210 1700" stroke="${C.gold}" stroke-width="22" stroke-linecap="round"/><circle cx="210" cy="1700" r="30" fill="${C.gold}"/>`
      + `<g transform="translate(150 980) rotate(-90)">${t(0, 0, 100, "HOLDING FAST TO THE ROD OF IRON", { fill: C.bone, wd: 62, ls: 3 })}</g>`
      + `<g transform="translate(320 980) rotate(-90)">${t(0, 0, 48, "1 NEPHI 8:30 · RENT COAT CO.", { f: "m", fill: C.gold, ls: 10 })}</g>` },
};

// The custom inside tag printed where the manufacturer's label was. Printful requires the size, material and country
// of origin on it, so each size gets its own file. Only some blanks take one (the hoodies and the fleece; not the tees).
const TAG = (ink, accent) => flag(300, 170, 200, accent, ink)
  + t(300, 345, 72, "RENT COAT CO.", { fill: ink, wd: 72, ls: 4 }) + t(300, 405, 26, "BOOK OF MORMON STREETWEAR", { f: "m", fill: ink, ls: 2 })
  + `<path d="M120 440 L480 440" stroke="${ink}" stroke-width="3"/>` + t(300, 490, 30, "IN MEMORY OF OUR GOD", { f: "m", fill: accent, ls: 5 }) + t(300, 540, 26, "MADE TO ORDER · RENTCOAT.CO", { f: "m", fill: ink, ls: 4 });

// A sized tag: what Printful requires, under the brand.
export const sizedTag = (ink, accent, size, material, origin) => flag(300, 92, 120, accent, ink)
  + t(300, 205, 56, "RENT COAT CO.", { fill: ink, wd: 72, ls: 4 })
  + `<rect x="235" y="232" width="130" height="104" rx="10" fill="none" stroke="${ink}" stroke-width="5"/>` + t(300, 312, size.length > 2 ? 62 : 80, size, { fill: ink, wd: 72 })
  + t(300, 392, 28, material, { f: "m", fill: ink, ls: 2 }) + t(300, 434, 28, origin, { f: "m", fill: ink, ls: 3 })
  + t(300, 476, 24, "WASH COLD · INSIDE OUT", { f: "m", fill: ink, ls: 2 }) + t(300, 540, 26, "IN MEMORY OF OUR GOD", { f: "m", fill: accent, ls: 4 });
const SIZES = ["S", "M", "L", "XL", "2XL"];
// Tags for the pieces already in Printful whose blank takes one.
const TAGGED = { "rent-hoodie": ["dark", "label_inside"], "stories-hoodie": ["light", "label_inside"], "shelem-fleece": ["dark", "label_inside_dtf"] };
export const TAG_FILES = Object.entries(TAGGED).flatMap(([id, [tone, place]]) => SIZES.map(size => ({
  id, place, size: "TAG", forSize: size, file: `${id}-tag-${size}.png`,
  svg: () => tone === "dark" ? sizedTag(INK.bone, INK.gold, size, "65% COTTON / 35% POLYESTER", "MADE IN PAKISTAN") : sizedTag(INK.night, INK.red, size, "65% COTTON / 35% POLYESTER", "MADE IN PAKISTAN"),
})));

export const BOLD_FILES = [
  ...Object.entries(DESIGNS).flatMap(([k, d]) => [
    { id: `bold-${k}`, place: "back", size: "DTG", svg: d.back },
    { id: `bold-${k}`, place: "front", size: "DTG", svg: d.front },
  ]),
  ...Object.entries(SWEATS).flatMap(([k, s]) => [
    { id: `sweats-${k}`, place: "leg_front_left", size: "LEG", svg: s.left },
    { id: `sweats-${k}`, place: "leg_front_right", size: "LEG", svg: () => `<g transform="translate(210 1500) rotate(-90)">${lock(0, 18, 40, s.ink, s.accent)}</g>` },
  ]),
  { id: "tag-dark", place: "label_inside", size: "TAG", svg: () => TAG(INK.bone, INK.gold) },
  { id: "tag-light", place: "label_inside", size: "TAG", svg: () => TAG(INK.night, INK.red) },
];
SIZE.TAG = [600, 600];

// Which blank and color each preview is photographed on (catalog product, size-M variant), and with which files.
const TEE = 1626, HOODIE = 380, SWEAT = 895;
const tee = { Black: 50244, Cream: 50232, Shadow: 50240, Oatmeal: 50252 };
const hood = { Black: 10780, Bone: 20285, "Forest Green": 16163, "Navy Blazer": 11492, Maroon: 11487, "Charcoal Heather": 11482 };
const both = (k, teeColor, hoodColor, tag) => [
  { key: `${k}-tee`, product: TEE, variant: tee[teeColor], color: teeColor, files: [`bold-${k}`] },
  { key: `${k}-hoodie`, product: HOODIE, variant: hood[hoodColor], color: hoodColor, files: [`bold-${k}`, tag] },
];
export const PREVIEWS = [
  ...both("liberty", "Black", "Black", "tag-dark"),
  ...both("stripling", "Cream", "Bone", "tag-light"),
  ...both("stones", "Black", "Navy Blazer", "tag-dark"),
  ...both("tree", "Shadow", "Forest Green", "tag-dark"),
  ...both("samuel", "Shadow", "Charcoal Heather", "tag-dark"),
  ...both("ship", "Oatmeal", "Bone", "tag-light"),
  ...both("liahona", "Black", "Maroon", "tag-dark"),
  ...both("barges", "Black", "Navy Blazer", "tag-dark"),
  { key: "press-forward-sweats", product: SWEAT, variant: 23113, color: "Athletic Heather", files: ["sweats-press-forward"] },
  { key: "iron-rod-sweats", product: SWEAT, variant: 23114, color: "Black", files: ["sweats-iron-rod"] },
];
