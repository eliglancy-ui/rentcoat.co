// Print files for the Fall/Winter line. Each entry is one file Printful prints or stitches.
// `node scripts/printful/render.mjs` turns these into transparent PNGs in /print.
//
// Canvas sizes, in pixels at 150 DPI (render.mjs doubles them, so the PNGs are 300 DPI):
//   DTG    1800 x 2400  the full 12" x 16" print area; small chest prints sit inside it where they belong
//   CHEST   600 x 600   4" x 4" embroidered chest patch
//   HAT     750 x 270   5" x 1.8" embroidered hat front
//   HATBACK 600 x 150   4" x 1" embroidered above the strap
//   BEANIE  750 x 300   5" x 2" embroidered beanie cuff
//   LEG     420 x 1800  a strip that sits at the top of the left leg
//   MUG    1350 x 525   9" x 3.5" wrap around a mug
// Embroidered files use only Printful thread colors (THREAD), with lettering at least 0.25" tall.

export const INK = { gold: "#C9A45C", goldDark: "#9C7A36", bone: "#ECE8DF", red: "#A83A2C", night: "#16201B" };
export const THREAD = { white: "#FFFFFF", black: "#000000", oldGold: "#A67843", maroon: "#660000", red: "#CC3333", grey: "#96A1A8" };

export const SIZE = { DTG: [1800, 2400], CHEST: [600, 600], HAT: [750, 270], HATBACK: [600, 150], BEANIE: [750, 300], LEG: [420, 1800], MUG: [1350, 525] };

const FLAG = "M14 14 H88 L80 22 L91 30 L78 37 L89 45 L76 51 L86 58 H14 Z";
export const flag = (cx, cy, s, cloth, pole) => `<g transform="translate(${cx - s / 2} ${cy - s / 2}) scale(${s / 100})"><circle cx="11" cy="5" r="5" fill="${pole}"/><rect x="8" y="8" width="6" height="92" rx="2" fill="${pole}"/><path d="${FLAG}" fill="${cloth}"/></g>`;
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const FONT = { d: "Archivo", s: "Instrument Serif", m: "IBM Plex Mono" };
// t(x, y, size, text, {f: d|s|m, w: weight, fill, ls: letter-spacing, a: anchor, wd: width %})
export function t(x, y, size, txt, o = {}) {
  const f = o.f || "d";
  const st = [`font-family:'${FONT[f]}'`, `font-size:${size}px`, `font-weight:${o.w || (f === "d" ? 900 : f === "m" ? 500 : 400)}`,
    f === "d" ? `font-stretch:${o.wd || 66}%` : "", f === "s" ? "font-style:italic" : "", `letter-spacing:${o.ls || 0}px`].filter(Boolean).join(";");
  return `<text x="${x}" y="${y}" fill="${o.fill || INK.bone}" text-anchor="${o.a || "middle"}" style="${st}">${esc(txt)}</text>`;
}
// The Rent Coat Co. mark: the torn flag beside the name, sitting on baseline y. render.mjs centers it on cx once the
// fonts have loaded, so it lines up the same on every piece. Every piece in the line carries it somewhere.
export const lock = (cx, y, size, ink, cloth, pole = ink) => `<g class="lock" data-cx="${cx}">${flag(size * 0.5, y - size * 0.6, size * 1.2, cloth, pole)}`
  + `${t(size * 1.15, y, size, "RENT COAT CO.", { a: "start", fill: ink, wd: 78, ls: size * 0.06 })}</g>`;
// Each file may add `mark` (extra SVG drawn on top, usually the mark) and `fit` (a transform that makes room for it).

// Left-chest graphics on a DTG front: centered 3.6" right of center (the wearer's left), 1.9" below the top of the area.
export const chest = inner => `<g transform="translate(1440 280)">${inner}</g>`;

// ---- Icons for the Book of Mormon Stories grid. Each draws in a 200 x 200 box centered on 0,0. ----
const ICON = (ink, accent) => {
  const s = `fill="none" stroke="${ink}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"`;
  return {
    tree: `<path d="M0 90 L0 10 M0 40 L-30 10 M0 30 L28 2" ${s}/><circle cx="0" cy="-30" r="62" ${s}/>${[[-28, -48], [18, -60], [30, -20], [-10, -14], [-36, -8], [6, -36]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9" fill="${accent}"/>`).join("")}<path d="M-70 90 L70 90" ${s}/>`,
    liahona: `<circle cx="0" cy="0" r="72" ${s}/><circle cx="0" cy="0" r="54" fill="none" stroke="${ink}" stroke-width="4"/><path d="M0 0 L-30 -42" stroke="${accent}" stroke-width="12" stroke-linecap="round"/><path d="M0 0 L40 22" stroke="${ink}" stroke-width="12" stroke-linecap="round"/><circle cx="0" cy="0" r="9" fill="${ink}"/>`,
    ship: `<path d="M-82 34 L82 34 L60 70 L-60 70 Z" fill="${ink}"/><path d="M-6 -78 L-6 26 L-70 26 Z" fill="${ink}"/><path d="M6 -62 L6 26 L58 26 Z" fill="${accent}"/><path d="M-96 88 q16 -10 32 0 t32 0 t32 0 t32 0 t32 0 t32 0" ${s} stroke-width="7"/>`,
    flame: `<path d="M0 -86 C26 -50 58 -24 58 22 C58 60 32 86 0 86 C-32 86 -58 60 -58 22 C-58 -10 -34 -26 -26 -54 C-12 -34 -12 -14 -4 -6 C4 -30 -6 -60 0 -86 Z" fill="${accent}"/><path d="M0 10 C14 26 24 38 24 56 C24 72 12 82 0 82 C-12 82 -24 72 -24 56 C-24 40 -10 30 0 10 Z" fill="${ink}"/>`,
    waters: [-44, 0, 44].map(y => `<path d="M-84 ${y} q21 -18 42 0 t42 0 t42 0 t42 0" ${s} stroke="${y === 0 ? accent : ink}"/>`).join(""),
    sheep: `<path d="M-54 10 C-74 6 -72 -30 -48 -30 C-46 -56 -10 -60 -2 -40 C8 -62 46 -56 46 -30 C70 -30 72 6 50 10 C50 30 20 40 0 34 C-20 40 -52 30 -54 10 Z" fill="${ink}"/><ellipse cx="66" cy="-30" rx="22" ry="17" fill="${ink}"/><path d="M-34 36 L-34 78 M-10 40 L-10 78 M18 40 L18 78 M40 34 L40 78" ${s}/><circle cx="72" cy="-34" r="4" fill="${accent}"/>`,
    liberty: flag(0, 0, 170, accent, ink),
    shield: `<path d="M0 -84 L70 -58 L70 4 C70 46 40 72 0 88 C-40 72 -70 46 -70 4 L-70 -58 Z" ${s}/><text x="0" y="22" text-anchor="middle" fill="${accent}" style="font-family:'Archivo';font-weight:900;font-stretch:62%;font-size:66px">2000</text>`,
    wall: `${[[-80, 20], [0, 20], [-40, 50], [40, 50], [-80, 80], [0, 80]].map(([x, y]) => `<rect x="${x}" y="${y}" width="80" height="30" ${s} stroke-width="7"/>`).join("")}<circle cx="0" cy="-26" r="14" fill="${ink}"/><path d="M0 -12 L0 18" ${s}/>${[[-74, -60, 40], [78, -46, -42], [-58, -4, 60]].map(([x, y, a]) => `<g transform="translate(${x} ${y}) rotate(${a})"><path d="M0 0 L0 -34" stroke="${accent}" stroke-width="7"/><path d="M-7 -34 L0 -48 L7 -34 Z" fill="${accent}"/></g>`).join("")}`,
    star: `<path d="${Array.from({ length: 16 }, (_, i) => { const r = i % 2 ? 30 : (i % 4 ? 62 : 86), a = Math.PI * i / 8 - Math.PI / 2; return `${i ? "L" : "M"}${(r * Math.cos(a)).toFixed(1)} ${(r * Math.sin(a)).toFixed(1)}`; }).join(" ")} Z" fill="${accent}"/><circle cx="0" cy="0" r="14" fill="${ink}"/>`,
    barge: `<path d="M-90 0 C-50 -52 50 -52 90 0 C50 52 -50 52 -90 0 Z" ${s}/><path d="M-70 0 L70 0" ${s} stroke-width="6" stroke-dasharray="10 14"/><circle cx="0" cy="-22" r="8" fill="${accent}"/><circle cx="0" cy="22" r="8" fill="${accent}"/>`,
    stones: Array.from({ length: 16 }, (_, i) => `<circle cx="${-60 + (i % 4) * 40}" cy="${-60 + Math.floor(i / 4) * 40}" r="14" fill="${i === 5 || i === 10 ? accent : ink}"/>`).join(""),
  };
};
const STORIES = [
  ["tree", "Lehi's Dream", "1 Nephi 8"], ["liahona", "The Liahona", "1 Nephi 16"], ["ship", "Nephi's Ship", "1 Nephi 17"],
  ["flame", "Abinadi", "Mosiah 17"], ["waters", "Waters of Mormon", "Mosiah 18"], ["sheep", "Ammon & the Flocks", "Alma 17"],
  ["liberty", "Title of Liberty", "Alma 46"], ["shield", "Stripling Warriors", "Alma 56"], ["wall", "Samuel on the Wall", "Helaman 16"],
  ["star", "The New Star", "3 Nephi 1"], ["barge", "The Barges", "Ether 2"], ["stones", "Sixteen Stones", "Ether 3"],
];
function storiesBack(ink, accent) {
  const icons = ICON(ink, accent);
  const cells = STORIES.map(([icon, title, ref], i) => {
    const x = 300 + (i % 3) * 600, y = 760 + Math.floor(i / 3) * 400;
    return `<g transform="translate(${x} ${y})"><g transform="scale(.95)">${icons[icon]}</g>${t(0, 158, 56, title.toUpperCase(), { fill: ink, wd: 72, w: 800, ls: 1 })}${t(0, 204, 32, ref.toUpperCase(), { f: "m", fill: accent, ls: 5 })}</g>`;
  }).join("");
  return t(900, 210, 74, "BOOK OF MORMON", { f: "m", fill: ink, ls: 30, w: 600 })
    + t(900, 470, 300, "Stories", { f: "s", fill: accent })
    + `<path d="M120 540 L1680 540" stroke="${ink}" stroke-width="6"/>`
    + cells
    + `<path d="M120 2290 L1680 2290" stroke="${ink}" stroke-width="6"/>`
    + t(900, 2365, 38, "VOL. I · TWELVE STORIES · RENT COAT CO.", { f: "m", fill: ink, ls: 9 });
}
const storiesFront = (ink, accent) => chest(`<rect x="-200" y="-150" width="400" height="300" rx="26" fill="none" stroke="${ink}" stroke-width="7"/>`
  + t(0, -66, 36, "BOOK OF MORMON", { f: "m", fill: ink, ls: 7, w: 600 }) + t(0, 52, 132, "Stories", { f: "s", fill: accent }) + t(0, 112, 30, "VOL. I", { f: "m", fill: ink, ls: 8 }));

// A ridge tent with its door open, drawn around cx, cy at scale s (about 200 x 150 at s = 1).
const tent = (cx, cy, s, ink, accent) => `<g transform="translate(${cx} ${cy}) scale(${s})" fill="none" stroke="${ink}" stroke-width="${8 / Math.max(s, 1) * Math.min(s, 2)}" stroke-linejoin="round" stroke-linecap="round">`
  + `<path d="M-100 70 L0 -80 L100 70 Z"/><path d="M0 -80 L0 -102"/><path d="M0 -102 L22 -95 L0 -88" fill="${accent}" stroke="none"/>`
  + `<path d="M0 -40 L-34 70 L0 70 Z" fill="${accent}" stroke="none"/><path d="M0 -40 L28 70"/><path d="M-130 70 L130 70"/>`
  + `<path d="M-100 70 L-124 86 M100 70 L124 86"/></g>`;

// ---- The files. id: product id in products.json; place: Printful placement; size: canvas key. ----
export const FILES = [
  // The Standard
  { id: "rent-hoodie", place: "front", size: "DTG", svg: () => chest(flag(0, 0, 330, INK.gold, INK.bone)) },
  { id: "rent-hoodie", place: "back", size: "DTG", svg: () => flag(900, 420, 560, INK.gold, INK.bone)
      + t(900, 1050, 300, "IN MEMORY") + t(900, 1340, 300, "OF OUR GOD")
      + t(900, 1540, 130, "our religion, and freedom", { f: "s", fill: INK.gold })
      + t(900, 1720, 56, "ALMA 46:12 · RENT COAT CO.", { f: "m", ls: 14 }) },
  { id: "strait-joggers", place: "leg_front_left", size: "LEG", svg: () => `<g transform="translate(210 600) rotate(-90)">${t(0, -10, 116, "STRAIT & NARROW", { wd: 78, ls: 8 })}${t(0, 110, 64, "1 NEPHI 8:20", { f: "m", ls: 16, fill: INK.gold })}</g>` },
  { id: "flag-cap", place: "embroidery_front_large", size: "HAT", threads: [THREAD.oldGold, THREAD.white], svg: () => flag(375, 84, 160, THREAD.oldGold, THREAD.white) + t(375, 252, 74, "RENT COAT CO.", { fill: THREAD.white, wd: 72, ls: 5 }) },
  { id: "flag-beanie", place: "embroidery_front", size: "BEANIE", threads: [THREAD.white], svg: () => flag(375, 96, 172, THREAD.white, THREAD.white) + t(375, 282, 76, "RENT COAT CO.", { fill: THREAD.white, wd: 72, ls: 5 }) },

  // Wilderness Supply
  { id: "shelem-fleece", place: "embroidery_chest_left", size: "CHEST", threads: [THREAD.white, THREAD.oldGold], svg: () =>
      `<path d="M120 300 L250 100 L320 200 L370 140 L480 300 Z" fill="${THREAD.white}"/><path d="M250 100 L214 156 L250 144 L278 172 Z" fill="${THREAD.oldGold}"/>`
      + t(300, 420, 82, "MOUNT SHELEM", { wd: 72, fill: THREAD.white, ls: 2 }) + t(300, 520, 62, "ALPINE CLUB", { f: "m", fill: THREAD.oldGold, ls: 10, w: 600 }) },
  { id: "hagoth-windbreaker", place: "embroidery_chest_left", size: "CHEST", threads: [THREAD.white, THREAD.oldGold], svg: () =>
      `<g transform="translate(300 200) scale(3.4)" fill="${THREAD.white}"><path d="M-30 6 L30 6 L22 18 L-22 18 Z"/><path d="M-2 -34 L-2 4 L-26 4 Z"/><path d="M2 -28 L2 4 L22 4 Z" fill="${THREAD.oldGold}"/></g>`
      + t(300, 420, 104, "HAGOTH", { wd: 72, fill: THREAD.white, ls: 8 }) + t(300, 515, 52, "SHIPBUILDING CO.", { f: "m", fill: THREAD.oldGold, ls: 4, w: 600 }) },
  { id: "ironrod-anorak", place: "embroidery_chest_left", size: "CHEST", threads: [THREAD.white, THREAD.oldGold], svg: () =>
      `<path d="M90 260 L380 260" stroke="${THREAD.oldGold}" stroke-width="22" stroke-linecap="round"/><circle cx="90" cy="260" r="22" fill="${THREAD.oldGold}"/><rect x="434" y="190" width="22" height="80" fill="${THREAD.white}"/><circle cx="445" cy="150" r="64" fill="${THREAD.white}"/>`
      + t(300, 420, 100, "IRON ROD", { wd: 72, fill: THREAD.white, ls: 8 }) + t(300, 515, 60, "TRAIL CLUB", { f: "m", fill: THREAD.oldGold, ls: 10, w: 600 }) },

  // Field Guide
  { id: "barge-tee", place: "front", size: "DTG", svg: () => chest(t(0, 20, 120, "J.B.W.", { fill: INK.night, ls: 10, wd: 80 }) + t(0, 90, 34, "EST. AT MORIANCUMER", { f: "m", fill: INK.red, ls: 4 })) },
  { id: "barge-tee", place: "back", size: "DTG", svg: () => {
      const n = INK.night, s = `fill="none" stroke="${n}" stroke-width="12"`;
      return t(900, 260, 190, "JAREDITE BARGE WORKS", { fill: n, wd: 60 })
        + `<g transform="translate(900 1000)"><path d="M-620 0 C-360 -330 360 -330 620 0 C360 330 -360 330 -620 0 Z" ${s}/><path d="M-540 0 L540 0" ${s} stroke-width="8" stroke-dasharray="26 30"/>`
        + `<circle cx="0" cy="-150" r="36" ${s}/><circle cx="0" cy="150" r="36" ${s}/>`
        + `<path d="M0 -186 L0 -430 L300 -430 M0 186 L0 430 L300 430 M-620 0 L-720 0 L-720 -330 L-500 -330 M620 0 L720 0 L720 330 L540 330" ${s} stroke-width="7"/></g>`
        + t(1220, 586, 42, "HOLE IN THE TOP", { f: "m", fill: n, a: "start", ls: 2 }) + t(1220, 1446, 42, "HOLE IN THE BOTTOM", { f: "m", fill: n, a: "start", ls: 2 })
        + t(390, 650, 46, "ENDS PEAKED", { f: "m", fill: n, ls: 3 }) + t(1350, 1305, 46, "LENGTH OF A TREE", { f: "m", fill: n, ls: 3 })
        + t(900, 1830, 170, "tight like unto a dish", { f: "s", fill: INK.red })
        + t(900, 1990, 60, "ETHER 2:17", { f: "m", fill: n, ls: 18 })
        + t(900, 2200, 40, "PLATE NO. 1 · FIG. A · BARGE, SMALL, LIGHT UPON THE WATER", { f: "m", fill: n, ls: 5 });
    } },
  { id: "irreantum-tee", place: "front", size: "DTG", svg: () => chest(t(0, 10, 72, "IRREANTUM", { f: "m", fill: INK.night, ls: 10, w: 600 }) + t(0, 80, 46, "SURF CLUB", { f: "m", fill: INK.red, ls: 12 })) },
  { id: "irreantum-tee", place: "back", size: "DTG", svg: () => t(900, 320, 260, "IRREANTUM", { fill: INK.night, wd: 62, ls: 14 })
      + `<path d="M500 1090 A400 400 0 0 1 1300 1090 Z" fill="${INK.red}"/>`
      + [0, 1, 2, 3, 4].map(i => `<path d="M400 ${1140 + i * 110} q62.5 -60 125 0 t125 0 t125 0 t125 0 t125 0 t125 0 t125 0 t125 0" fill="none" stroke="${INK.night}" stroke-width="34" stroke-linecap="round"/>`).join("")
      + t(900, 1900, 190, "many waters", { f: "s", fill: INK.night })
      + t(900, 2060, 60, "SURF CLUB · 1 NEPHI 17:5", { f: "m", fill: INK.red, ls: 14 }) },
  { id: "samuel-tee", place: "front", size: "DTG", svg: () => chest(t(0, 10, 62, "SAMUEL'S WALL", { f: "m", ls: 6, w: 600 }) + t(0, 76, 44, "ARCHERY CLUB", { f: "m", fill: INK.gold, ls: 10 })) },
  { id: "samuel-tee", place: "back", size: "DTG", svg: () => [400, 280, 160].map(r => `<circle cx="900" cy="980" r="${r}" fill="none" stroke="${INK.bone}" stroke-width="56"/>`).join("")
      + `<circle cx="900" cy="980" r="58" fill="${INK.bone}"/>`
      + [[300, 520, 34], [1520, 620, -36], [330, 1480, -24], [1490, 1420, 30], [900, 440, 0], [1620, 1020, 12]].map(([x, y, a]) => `<g transform="translate(${x} ${y}) rotate(${a})"><path d="M0 0 L0 -220" stroke="${INK.gold}" stroke-width="18"/><path d="M-34 -220 L0 -290 L34 -220 Z" fill="${INK.gold}"/><path d="M-26 0 L0 -40 L26 0 M-26 30 L0 -10 L26 30" fill="none" stroke="${INK.gold}" stroke-width="10"/></g>`).join("")
      + t(900, 1880, 168, "THEY COULD NOT HIT HIM", { wd: 60 })
      + t(900, 2040, 60, "HELAMAN 16:2", { f: "m", fill: INK.gold, ls: 18 }) },
  { id: "curelom-cap", place: "embroidery_front_large", size: "HAT", threads: [THREAD.black], svg: () => t(375, 150, 150, "C&C", { fill: THREAD.black, wd: 80, ls: 14 }) + t(375, 246, 66, "WILDLIFE SOCIETY", { f: "m", fill: THREAD.black, w: 600, ls: 4 }) },
  { id: "curelom-cap", place: "embroidery_back", size: "HATBACK", threads: [THREAD.black], svg: () => t(300, 104, 70, "RENT COAT CO.", { fill: THREAD.black, wd: 72, ls: 6 }) },
  { id: "stories-tee", place: "front", size: "DTG", svg: () => storiesFront(INK.night, INK.red) },
  { id: "stories-tee", place: "back", size: "DTG", svg: () => storiesBack(INK.night, INK.red) },
  { id: "stories-hoodie", place: "front", size: "DTG", svg: () => storiesFront(INK.night, INK.red) },
  { id: "stories-hoodie", place: "back", size: "DTG", svg: () => storiesBack(INK.night, INK.red) },

  // Added after the first batch
  { id: "lehi-tee", place: "front", size: "DTG", svg: () => chest(tent(0, -40, .9, INK.bone, INK.gold) + t(0, 90, 50, "LEHI'S TENT CO.", { f: "m", ls: 6, w: 600 })) },
  { id: "lehi-tee", place: "back", size: "DTG", svg: () => t(900, 300, 66, "EST. IN THE VALLEY OF LEMUEL", { f: "m", ls: 18, fill: INK.gold })
      + tent(900, 900, 4.2, INK.bone, INK.gold)
      + t(900, 1640, 260, "LEHI'S TENT CO.", { wd: 62, ls: 4 })
      + t(900, 1860, 150, "And my father dwelt in a tent.", { f: "s", fill: INK.gold })
      + t(900, 2030, 60, "1 NEPHI 2:15", { f: "m", ls: 18 }) },
  { id: "barge-mug", place: "default", size: "MUG", svg: () => {
      const n = INK.night, s = `fill="none" stroke="${n}" stroke-width="7"`;
      return `<g transform="translate(330 262)"><path d="M-250 0 C-150 -130 150 -130 250 0 C150 130 -150 130 -250 0 Z" ${s}/><path d="M-210 0 L210 0" ${s} stroke-width="5" stroke-dasharray="14 16"/><circle cy="-60" r="16" ${s}/><circle cy="60" r="16" ${s}/><path d="M0 -76 L0 -170 L130 -170 M0 76 L0 170 L130 170" ${s} stroke-width="4"/></g>`
        + t(470, 98, 24, "HOLE IN THE TOP", { f: "m", fill: n, a: "start", ls: 1 }) + t(470, 438, 24, "HOLE IN THE BOTTOM", { f: "m", fill: n, a: "start", ls: 1 })
        + t(1010, 200, 92, "JAREDITE", { fill: n, wd: 62, ls: 4 }) + t(1010, 290, 92, "BARGE WORKS", { fill: n, wd: 62, ls: 4 })
        + t(1010, 378, 64, "tight like unto a dish", { f: "s", fill: INK.red }) + t(1010, 438, 26, "ETHER 2:17", { f: "m", fill: n, ls: 8 });
    } },
  { id: "lehi-mug", place: "default", size: "MUG", svg: () => tent(330, 250, 1.75, INK.night, INK.red)
      + t(990, 180, 96, "LEHI'S TENT CO.", { fill: INK.night, wd: 62, ls: 2 })
      + t(990, 268, 54, "And my father dwelt in a tent.", { f: "s", fill: INK.red })
      + t(990, 350, 26, "EST. IN THE VALLEY OF LEMUEL", { f: "m", fill: INK.night, ls: 6 })
      + t(990, 400, 26, "1 NEPHI 2:15", { f: "m", fill: INK.night, ls: 8 }) },
];

// Where the mark goes on pieces whose main design doesn't already say Rent Coat Co.
const MARK = {
  // Back prints: at the top of the back, just under the collar.
  "barge-tee:back": () => lock(900, 96, 66, INK.night, INK.red),
  "irreantum-tee:back": () => lock(900, 96, 66, INK.night, INK.red),
  "samuel-tee:back": () => lock(900, 96, 66, INK.bone, INK.gold),
  "lehi-tee:back": () => lock(900, 96, 66, INK.bone, INK.gold),
  // Front-only prints: under the scripture line.
  // Joggers: further up the same leg.
  "strait-joggers:leg_front_left": () => `<g transform="translate(210 1490) rotate(-90)">${lock(0, 22, 48, INK.bone, INK.gold)}</g>`,
  // Embroidered patches: the club crest shrinks a little and the mark goes underneath.
  "shelem-fleece:embroidery_chest_left": () => lock(300, 568, 50, THREAD.white, THREAD.oldGold),
  "hagoth-windbreaker:embroidery_chest_left": () => lock(300, 568, 50, THREAD.white, THREAD.oldGold),
  "ironrod-anorak:embroidery_chest_left": () => lock(300, 568, 50, THREAD.white, THREAD.oldGold),
  // Mugs: under the drawing.
  "barge-mug:default": () => lock(330, 506, 40, INK.night, INK.red),
  "lehi-mug:default": () => lock(330, 500, 40, INK.night, INK.red),
};
const FIT = {
  // Back prints move down a little to make room for the mark under the collar.
  "barge-tee:back": "translate(0 90)", "irreantum-tee:back": "translate(0 90)", "samuel-tee:back": "translate(0 90)", "lehi-tee:back": "translate(0 90)",
  "shelem-fleece:embroidery_chest_left": "translate(60 0) scale(.8)",
  "hagoth-windbreaker:embroidery_chest_left": "translate(60 0) scale(.8)",
  "ironrod-anorak:embroidery_chest_left": "translate(60 0) scale(.8)",
};
for (const f of FILES) {
  const key = `${f.id}:${f.place}`;
  if (MARK[key]) f.mark = MARK[key];
  if (FIT[key]) f.fit = FIT[key];
}

export const fileName = f => f.file || `${f.id}-${f.place}.png`;
