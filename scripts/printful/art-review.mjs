// Design review, Nov 2026: proposed v4 back prints for the Drop 001 tees. These are NEW files for Eli to compare
// against the live art; nothing here is wired into setup.mjs or Printful. Renders to print/review/.
// Run from the repo root: node scripts/printful/art-review.mjs
// Canvas is Printful's 12 x 16 in DTG area at 150 units per inch, rendered at 2x (3600 x 4800 px = 300 DPI).
// Rules: no stroke or line thinner than 6 units (about 3 pt), no type smaller than 54 units (0.36 in).
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { INK, t, lock, chest } from "./art.mjs";
import { worn } from "./art-bold.mjs";

const FOREST = "#1F3A2E", RED = INK.red, BONE = INK.bone, NIGHT = INK.night;

// One line of display type stretched to an exact width, like the poster blocks in art-bold.mjs.
const wide = (y, size, txt, fill, w = 1700, stretch = 62) =>
  `<text x="${900 - w / 2}" y="${y}" textLength="${w}" lengthAdjust="spacingAndGlyphs" fill="${fill}" style="font-family:'Archivo';font-weight:900;font-stretch:${stretch}%;font-size:${size}px">${txt.replace(/&/g, "&amp;")}</text>`;

// Title of Liberty v4 (flag leveled and red stripe kept inside the cloth, Nov 11): the same idea as the live shirt, built to fill the back. Torn coat on a pole across the
// shoulders, TITLE OF / LIBERTY stacked to the full 12 in width, a worn screen-print texture, and the verse line big
// enough to read. Ink: bone, rent red, gold, night (the flag lettering). Blank: Shadow.
function liberty() {
  const cloth = "M190 285 C520 255 820 315 1150 280 C1350 260 1520 295 1660 285 L1590 380 L1690 455 L1580 525 L1670 600 L1560 670 L1640 780 C1400 815 1180 765 950 795 C700 825 450 765 190 790 Z";
  return lock(900, 120, 62, BONE, RED) + worn(
    `<rect x="150" y="250" width="40" height="680" rx="8" fill="${BONE}"/><circle cx="170" cy="236" r="34" fill="${BONE}"/>`
    + `<path d="${cloth}" fill="${BONE}"/>`
    + `<path d="M190 638 C460 615 700 662 950 638 C1180 615 1380 650 1520 638" stroke="${RED}" stroke-width="44" stroke-linecap="butt" fill="none"/>`
    + `<text x="900" y="545" text-anchor="middle" fill="${NIGHT}" style="font-family:'Instrument Serif';font-style:italic;font-size:250px">Liberty</text>`
    + wide(1300, 430, "TITLE OF", BONE)
    + wide(1990, 720, "LIBERTY", BONE)
    + `<rect x="50" y="2045" width="1700" height="14" fill="${RED}"/>`
    + t(50, 2150, 72, "“HE RENT HIS COAT”", { f: "m", w: 600, a: "start", fill: BONE, ls: 6 })
    + t(1750, 2150, 72, "ALMA 46:12", { f: "m", w: 600, a: "end", fill: INK.gold, ls: 6 })
    + t(900, 2300, 92, "RENT COAT CO.", { wd: 100, fill: BONE, ls: 18 }));
}

// Elephant silhouette in a 300 x 220 box centered on cx, cy.
const elephant = (cx, cy, fill) => `<g transform="translate(${cx - 150} ${cy - 110})" fill="${fill}">
  <ellipse cx="165" cy="95" rx="110" ry="70"/><circle cx="70" cy="70" r="55"/><ellipse cx="95" cy="72" rx="42" ry="55"/>
  <path d="M30 80 C10 120 15 170 40 205 L62 198 C45 165 45 130 60 100 Z"/>
  <rect x="80" y="130" width="40" height="88" rx="8"/><rect x="130" y="140" width="40" height="78" rx="8"/>
  <rect x="200" y="140" width="40" height="78" rx="8"/><rect x="245" y="130" width="38" height="88" rx="8"/>
  <path d="M270 80 C300 85 305 110 292 130" stroke="${fill}" stroke-width="12" fill="none"/></g>`;
// An unknown animal: a dashed outline (6+ unit dashes so it prints) with a big question mark.
const unknown = (cx, cy, ink, accent) => `<ellipse cx="${cx}" cy="${cy}" rx="150" ry="105" fill="none" stroke="${ink}" stroke-width="12" stroke-dasharray="34 22"/>`
  + t(cx, cy + 78, 220, "?", { fill: accent, wd: 100 });
const card = (x, n, name, status, art, statusFill) => `<rect x="${x}" y="1080" width="540" height="640" fill="none" stroke="${FOREST}" stroke-width="12"/>`
  + t(x + 34, 1160, 58, `NO. ${n}`, { f: "m", w: 600, a: "start", fill: FOREST })
  + art(x + 270, 1360)
  + t(x + 270, 1600, 96, name, { wd: 70, fill: FOREST, ls: 2 })
  + t(x + 270, 1680, 54, status, { f: "m", w: 600, fill: statusFill, ls: 4 });

// Cureloms v3: same joke, bigger. The title runs the full width, the three cards are a third bigger with
// 4 pt borders, and the micro labels are gone or doubled in size. Ink: forest and rent red. Blank: Cream.
function cureloms() {
  return lock(900, 110, 56, FOREST, RED) + worn(
    t(900, 250, 72, "EST. ETHER 9:19", { f: "m", w: 600, fill: RED, ls: 20 })
    + wide(570, 340, "CURELOMS", FOREST, 1700, 78)
    + `<text x="900" y="900" text-anchor="middle" style="font-family:'Archivo';font-weight:900;font-stretch:78%;font-size:340px"><tspan fill="${RED}">&amp; </tspan><tspan fill="${FOREST}">CUMOMS</tspan></text>`
    + `<rect x="30" y="945" width="1740" height="12" fill="${FOREST}"/><rect x="30" y="1035" width="1740" height="12" fill="${FOREST}"/>`
    + t(900, 1015, 62, "WILDLIFE SOCIETY", { f: "m", w: 600, fill: FOREST, ls: 30 })
    + card(30, 1, "ELEPHANT", "IDENTIFIED", (cx, cy) => elephant(cx, cy, FOREST), FOREST)
    + card(630, 2, "CURELOM", "UNKNOWN", (cx, cy) => unknown(cx, cy, FOREST, RED), RED)
    + card(1230, 3, "CUMOM", "UNKNOWN", (cx, cy) => unknown(cx, cy, FOREST, RED), RED)
    + t(900, 1900, 120, "“…elephants and cureloms and cumoms”", { f: "s", fill: FOREST })
    + t(900, 2040, 66, "SIGHTINGS: 0 · STILL LOOKING", { f: "m", w: 600, fill: RED, ls: 12 }));
}

// ---- Picture tees: a public-domain Carl Bloch painting as a one-color halftone (made by halftone.py into
// print/review/src/), with one big line of type and a red script accent over it. Blank: Black.
const SCRIPT_RED = "#C8503E"; // rent red lifted a step so it holds on a black garment-dyed tee
const art = (file, y, h) => `<image href="file://${resolve("print/review/src", file)}" x="50" y="${y}" width="1700" height="${h}" preserveAspectRatio="xMidYMax meet"/>`;
const script = (x, y, size, txt, rot = -6, fill = SCRIPT_RED) =>
  `<text x="${x}" y="${y}" transform="rotate(${rot} ${x} ${y})" fill="${fill}" style="font-family:'Instrument Serif';font-style:italic;font-size:${size}px">${txt}</text>`;

// One picture tee: the halftone picture under the collar mark, a red script lead-in, one big word or line, and
// the verse reference in gold. The picture's faded bottom sits behind the script, so they read as one piece.
// tee "dark" (Black, Shadow, Mocha): bone type, gold reference. tee "light" (Cream, Oatmeal): forest type, red reference.
function picture({ file, imgH = 1560, script: [lead, sx = 80, sy = 1700, ssize = 210], big: [word, bsize, bwide = 62], ref, tee = "dark" }) {
  const light = tee === "light", ink = light ? FOREST : BONE;
  return lock(900, 110, 56, ink, RED)
    + art(file, 170, imgH)
    + worn(wide(2030, bsize, word, ink, 1700, bwide)
      + t(900, 2180, 58, ref, { f: "m", w: 600, fill: light ? RED : INK.gold, ls: 4 }))
    + script(sx, sy, ssize, lead, -6, light ? RED : SCRIPT_RED);
}

// The color line: the same layouts with the painting in full color, each on its own tee color so the shirts don't
// all look alike. [id, color source made by halftone.py --color (or --invert for a dark-ink halftone), tee tone, tee].
// Three stay black and white on purpose: King and Great Things (Doré is black and white already) and None Other Name.
export const COLOR_LINE = [
  ["behold", "bloch-sermon-color.png", "light", "Cream"],
  ["mercy", "bloch-consolator-color.png", "dark", "Black"],
  ["come", "bloch-little-children-color.png", "light", "Oatmeal"],
  ["talk", "bloch-christ-and-child-color.png", "dark", "Black"],
  ["rejoice", "bloch-christ-and-child-color.png", "light", "Natural"],
  ["foundation", "rembrandt-storm-color.png", "dark", "Shadow"],
  ["shelem", "bierstadt-mountain-color.png", "dark", "Black"],
  ["tree", "friedrich-tree-color.png", "light", "Cream"],
  ["ship", "aivazovsky-wave-color.png", "dark", "Mocha"],
  ["come-forth", "bloch-thomas-color.png", "dark", "Black"],
  ["glad-tidings", "bloch-shepherds-color.png", "dark", "Black"],
  ["press-forward", "aivazovsky-walking-color.png", "dark", "Shadow"],
  ["barges", "aivazovsky-among-color.png", "dark", "Shadow"],
  ["irreantum", "friedrich-moonrise-color.png", "dark", "Mocha"],
  ["none-other", "bloch-gethsemane-halftone.png", "dark", "Black"],
  ["king", "dore-entry-ink.png", "light", "Cream"],
  ["liahona", "dore-abraham-ink.png", "light", "Oatmeal"],
];

// Every picture tee. Verses checked word for word on churchofjesuschrist.org. Sources: art-sources/*/SOURCES.md.
const PICTURES = [
  // Bloch, The Sermon on the Mount (1877)
  ["behold", "bloch-sermon-halftone.png", { imgH: 1480, script: ["Behold, I am"], big: ["JESUS CHRIST", 380], ref: "3 NEPHI 11:10" }],
  // Bloch, Consolator
  ["mercy", "bloch-consolator-halftone.png", { script: ["mine arm of", 90, 1640, 220], big: ["MERCY", 560], ref: "MINE ARM OF MERCY IS EXTENDED · 3 NEPHI 9:14" }],
  // Bloch, Christ and Child
  ["talk", "bloch-christ-and-child-halftone.png", { script: ["And we", 90, 1700, 230], big: ["TALK OF CHRIST", 330], ref: "WE REJOICE IN CHRIST · 2 NEPHI 25:26" }],
  // Bloch, Christ and Child. The 2027 youth theme ("Rejoice in Christ", see Philippians 4:4), quoted from 2 Nephi 25:26.
  ["rejoice", "bloch-christ-and-child-halftone.png", { script: ["we", 90, 1700, 260], big: ["REJOICE", 600], ref: "IN CHRIST · 2 NEPHI 25:26" }],
  // Bloch, Let the Little Children Come unto Jesus
  ["come", "bloch-little-children-halftone.png", { script: ["come unto", 90, 1680, 230], big: ["CHRIST", 540], ref: "AND BE PERFECTED IN HIM · MORONI 10:32" }],
  // Bloch, The Resurrection (1875)
  ["hosanna", "bloch-resurrection-halftone.png", { script: ["they did cry", 90, 1690, 210], big: ["HOSANNA!", 470], ref: "BLESSED BE THE NAME · 3 NEPHI 11:17" }],
  // Bloch, The Transfiguration
  ["light", "bloch-transfiguration-halftone.png", { script: ["I am the", 90, 1660, 230], big: ["LIGHT", 600], ref: "AND THE LIFE OF THE WORLD · 3 NEPHI 11:11" }],
  // Bloch, Christ in Gethsemane
  ["none-other", "bloch-gethsemane-halftone.png", { script: ["there is", 90, 1720, 220], big: ["NONE OTHER NAME", 300], ref: "SAVE IT BE THIS JESUS CHRIST · 2 NEPHI 25:20" }],
  // Hofmann, Christ and the Rich Young Ruler (1889)
  ["son-of-god", "hofmann-christ-halftone.png", { script: ["O Jesus, thou", 90, 1700, 210], big: ["SON OF GOD", 420], ref: "HAVE MERCY ON ME · ALMA 36:18" }],
  // Rembrandt, The Storm on the Sea of Galilee (1633)
  ["foundation", "rembrandt-storm-halftone.png", { script: ["upon the", 90, 1640, 230], big: ["ROCK", 640], ref: "OF OUR REDEEMER, WHO IS CHRIST · HELAMAN 5:12" }],
  // Bierstadt, A Storm in the Rocky Mountains, Mt. Rosalie (1866)
  ["shelem", "bierstadt-mountain-halftone.png", { script: ["shine forth in", 90, 1690, 210], big: ["DARKNESS", 430], ref: "TOUCH THESE STONES, O LORD · ETHER 3:4" }],
  // Aivazovsky, The Ninth Wave (1850)
  ["ship", "aivazovsky-wave-halftone.png", { script: ["thou shalt construct a", 90, 1660, 190], big: ["SHIP", 640], ref: "1 NEPHI 17:8" }],
  // Friedrich, The Lone Tree (1822)
  ["tree", "friedrich-tree-halftone.png", { script: ["I beheld a", 90, 1660, 230], big: ["TREE", 640], ref: "WHOSE FRUIT WAS DESIRABLE · 1 NEPHI 8:10" }],

  // ---- Round 2 (Nov 6): more public-domain paintings. Files named on Wikimedia Commons; verses checked word for word
  // on churchofjesuschrist.org the same day. New shirts first, then pictures for shirts that had none.
  // NEW. Bloch, The Doubting Thomas (Ugerløse Kirke altarpiece). File: 'The Doubting Thomas' by Carl Heinrich Bloch, Ugerløse Kirke.jpg
  ["come-forth", "bloch-thomas-halftone.png", { script: ["Arise and", 90, 1680, 230], big: ["COME FORTH", 430], ref: "UNTO ME · 3 NEPHI 11:14" }],
  // NEW. Bloch, The Shepherds and the Angel (1879). File: The Shepherds and the Angel.jpg (only 1024 px wide: print it smaller)
  ["glad-tidings", "bloch-shepherds-halftone.png", { imgH: 1300, script: ["the glad tidings of", 90, 1600, 190], big: ["GREAT JOY", 450], ref: "I AM COME TO DECLARE UNTO YOU · MOSIAH 3:3" }],
  // Press Forward tee. Aivazovsky, Walking on the Water (1888). File: Po vodam 1888.jpg
  ["press-forward", "aivazovsky-walking-halftone.png", { script: ["press forward with a", 90, 1660, 190], big: ["STEADFASTNESS", 300], ref: "IN CHRIST · 2 NEPHI 31:20" }],
  // Jesus Is King tee. Doré, Christ's Entry into Jerusalem (engraving, 1866). File: Gustave Doré - Christ's Entry into Jerusalem.jpg
  ["king", "dore-entry-halftone.png", { script: ["will be their", 90, 1660, 230], big: ["KING", 640], ref: "THE KING OF HEAVEN · 2 NEPHI 10:14" }],
  // Liahona. Doré, Abraham Journeying into the Land of Canaan (engraving). File: Abraham Journeying into the Land of Canaan (89393798).jpg
  ["liahona", "dore-abraham-halftone.png", { script: ["by small means", 90, 1660, 210], big: ["GREAT THINGS", 380], ref: "THE LORD CAN BRING ABOUT · 1 NEPHI 16:29" }],
  // Barges. Aivazovsky, Among the Waves (1898). File: Ivan Konstantinovich Aivazovsky - Among the Waves, 1898.jpg
  ["barges", "aivazovsky-among-halftone.png", { script: ["ye shall be as a", 90, 1660, 200], big: ["WHALE", 620], ref: "IN THE MIDST OF THE SEA · ETHER 2:24" }],
  // Irreantum. Friedrich, Moonrise over the Sea (1822). File: Caspar David Friedrich - Mondaufgang über dem Meer.jpg
  ["irreantum", "friedrich-moonrise-halftone.png", { script: ["being interpreted, is", 90, 1660, 190], big: ["MANY WATERS", 400], ref: "IRREANTUM · 1 NEPHI 17:5" }],
];

// ---- The five Drop 002 ideas from the design review (type and crest pieces, in the style of the reference shirts).
const GOLD = INK.gold, SKY = "#9CC8E8";
const esc = x => String(x).replace(/&/g, "&amp;");
const scriptK = (x, y, size, txt, fill, rot = -8) =>
  `<text x="${x}" y="${y}" transform="rotate(${rot} ${x} ${y})" fill="${fill}" style="font-family:'Kaushan Script';font-size:${size}px">${esc(txt)}</text>`;
// Text set along a circle arc: top arcs read left to right over the top, bottom arcs under the bottom.
let arcN = 0;
function arcText(cx, cy, r, txt, size, fill, { bottom = false, font = "Graduate", ls = 6, weight = 400 } = {}) {
  const id = `arc${++arcN}`;
  const d = bottom
    ? `M ${cx - r} ${cy} A ${r} ${r} 0 0 0 ${cx + r} ${cy}`
    : `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  return `<defs><path id="${id}" d="${d}"/></defs><text fill="${fill}" style="font-family:'${font}';font-size:${size}px;font-weight:${weight};letter-spacing:${ls}px"><textPath href="#${id}" startOffset="50%" text-anchor="middle">${esc(txt)}</textPath></text>`;
}
// A laurel branch: leaves along an arc on one side of a crest, from angle a0 to a1 (degrees, 0 = right, 90 = down).
function laurel(cx, cy, r, a0, a1, fill, n = 13, flip = 1) {
  let out = "";
  for (let i = 0; i < n; i++) {
    const a = (a0 + (a1 - a0) * i / (n - 1)) * Math.PI / 180;
    const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
    const tang = a * 180 / Math.PI + 90 * flip;
    for (const side of [-1, 1]) {
      const ox = x + Math.cos(a) * side * 26, oy = y + Math.sin(a) * side * 26;
      out += `<ellipse cx="${ox.toFixed(1)}" cy="${oy.toFixed(1)}" rx="46" ry="17" transform="rotate(${(tang + side * 35).toFixed(1)} ${ox.toFixed(1)} ${oy.toFixed(1)})" fill="${fill}"/>`;
    }
  }
  const p0 = [cx + r * Math.cos(a0 * Math.PI / 180), cy + r * Math.sin(a0 * Math.PI / 180)], p1 = [cx + r * Math.cos(a1 * Math.PI / 180), cy + r * Math.sin(a1 * Math.PI / 180)];
  return out + `<path d="M ${p0[0].toFixed(1)} ${p0[1].toFixed(1)} A ${r} ${r} 0 0 ${a1 > a0 ? 1 : 0} ${p1[0].toFixed(1)} ${p1[1].toFixed(1)}" stroke="${fill}" stroke-width="8" fill="none"/>`;
}

// 1. GO AND DO · 1 Nephi 3:7 · Black tee. Huge stacked cream type with a red script "I will" across it.
function goAndDo() {
  return lock(900, 110, 56, BONE, RED) + worn(
    wide(980, 760, "GO AND", BONE, 1700, 62)
    + wide(1900, 980, "DO", BONE, 1700, 70)
    + t(900, 2080, 54, "THE THINGS WHICH THE LORD HATH COMMANDED", { f: "m", w: 600, fill: GOLD, ls: 3 })
    + t(900, 2170, 64, "1 NEPHI 3:7", { f: "m", w: 600, fill: GOLD, ls: 20 }))
    + scriptK(70, 470, 330, "I will", "#D2533F");
}

// 2. HE RENT HIS COAT · Alma 46:12 · Black hoodie. Collegiate arch over the torn coat on its pole, verse under it,
// and a line down each sleeve.
function rentBack() {
  return lock(900, 110, 56, BONE, RED) + worn(
    arcText(900, 1180, 620, "HE RENT HIS COAT", 200, BONE, { ls: 8 })
    + `<g transform="translate(900 1260) scale(1.0) translate(-950 -1200)"><rect x="690" y="760" width="34" height="880" rx="7" fill="${BONE}"/><circle cx="707" cy="748" r="30" fill="${BONE}"/>`
    + `<path d="M724 800 C880 760 1010 840 1210 790 L1150 870 L1240 930 L1135 975 L1225 1045 L1115 1080 L1190 1140 C1030 1190 880 1110 724 1160 Z" fill="${RED}"/></g>`
    + wide(1960, 170, "IN MEMORY OF OUR GOD", BONE, 1500, 70)
    + t(900, 2080, 90, "our religion, and freedom", { f: "s", fill: GOLD })
    + t(900, 2200, 60, "ALMA 46:12 · RENT COAT CO.", { f: "m", w: 600, fill: GOLD, ls: 14 }));
}
// Sleeves: a 2.8 x 12 in strip, read from the cuff up.
const sleeve = txt => worn(`<g transform="translate(290 900) rotate(-90)">${t(0, 0, 200, txt, { fill: BONE, wd: 70, ls: 8 })}</g>`);

// 3. TRUE AT ALL TIMES · Alma 53:20 · Shadow tee. A varsity crest: arched title, laurels, a shield with 2000.
function trueCrest() {
  const cx = 900, cy = 1180;
  return lock(900, 110, 56, BONE, RED) + worn(
    arcText(cx, cy, 640, "TRUE AT ALL TIMES", 190, BONE, { ls: 8 })
    + laurel(cx, cy + 40, 560, 170, 95, GOLD, 12, 1) + laurel(cx, cy + 40, 560, 10, 85, GOLD, 12, -1)
    + `<path d="M${cx - 260} ${cy - 330} H${cx + 260} V${cy + 20} C${cx + 260} ${cy + 260} ${cx + 90} ${cy + 380} ${cx} ${cy + 440} C${cx - 90} ${cy + 380} ${cx - 260} ${cy + 260} ${cx - 260} ${cy + 20} Z" fill="none" stroke="${BONE}" stroke-width="24"/>`
    + `<text x="${cx}" y="${cy + 70}" text-anchor="middle" fill="${RED}" style="font-family:'Graduate';font-size:170px">2000</text>`
    + t(cx, cy - 190, 56, "STRIPLING", { f: "m", w: 600, fill: BONE, ls: 8 })
    + t(cx, cy + 190, 50, "EST. ALMA 53", { f: "m", w: 600, fill: BONE, ls: 6 })
    + wide(2010, 120, "MEN OF TRUTH AND SOBERNESS", BONE, 1500, 70)
    + t(900, 2140, 60, "ALMA 53:20–21", { f: "m", w: 600, fill: GOLD, ls: 20 }));
}

// 4. SERVICE CLUB · Mosiah 2:17 · Cream tee. Country-club crest: King Benjamin's tower (Mosiah 2:7) in laurels.
function serviceCrest() {
  const cx = 900, cy = 1120, ink = FOREST;
  const tower = `<g fill="${ink}"><rect x="${cx - 95}" y="${cy - 230}" width="190" height="420"/><rect x="${cx - 130}" y="${cy - 290}" width="260" height="70"/>`
    + [-130, -65, 0, 65].map(dx => `<rect x="${cx + dx}" y="${cy - 340}" width="44" height="60"/>`).join("")
    + `<rect x="${cx - 26}" y="${cy + 70}" width="52" height="120" fill="#EFEAD8"/><rect x="${cx - 200}" y="${cy + 190}" width="400" height="34"/></g>`;
  return lock(900, 110, 56, ink, RED) + worn(
    arcText(cx, cy, 620, "MOSIAH 2:17", 150, ink, { ls: 14 })
    + laurel(cx, cy - 40, 470, 160, 95, RED, 10, 1) + laurel(cx, cy - 40, 470, 20, 85, RED, 10, -1)
    + `<g transform="translate(${cx} ${cy - 60}) scale(1.15) translate(${-cx} ${-cy})">${tower}</g>`
    + `<path d="M${cx - 560} ${cy + 330} H${cx + 560} L${cx + 500} ${cy + 405} L${cx + 560} ${cy + 480} H${cx - 560} L${cx - 500} ${cy + 405} Z" fill="${ink}"/>`
    + `<text x="${cx}" y="${cy + 455}" text-anchor="middle" fill="#EFEAD8" style="font-family:'Graduate';font-size:130px;letter-spacing:14px">SERVICE CLUB</text>`
    + t(900, 1830, 100, "when ye are in the service of your fellow beings", { f: "s", fill: ink })
    + t(900, 1950, 100, "ye are only in the service of your God", { f: "s", fill: RED })
    + t(900, 2090, 54, "KING BENJAMIN'S TOWER · MOSIAH 2:7", { f: "m", w: 600, fill: ink, ls: 8 }));
}

// 5. CHILDREN OF CHRIST · Mosiah 5:7 · Shadow tee. Big light-blue brush script, the verse small underneath.
function childrenOfChrist() {
  return lock(900, 110, 56, BONE, RED) + worn(
    `<text x="900" y="760" text-anchor="middle" fill="${SKY}" style="font-family:'Caveat Brush';font-size:520px">children</text>`
    + `<text x="900" y="1150" text-anchor="middle" fill="${SKY}" style="font-family:'Caveat Brush';font-size:330px">of</text>`
    + `<text x="900" y="1640" text-anchor="middle" fill="${SKY}" style="font-family:'Caveat Brush';font-size:560px">Christ</text>`
    + t(900, 1900, 64, "HIS SONS, AND HIS DAUGHTERS", { f: "m", w: 600, fill: BONE, ls: 10 })
    + t(900, 2010, 64, "MOSIAH 5:7", { f: "m", w: 600, fill: BONE, ls: 26 }));
}

export const IDEAS = [
  // [id, back svg, blank, tee/hoodie color, extra placements]
  ["go-and-do", goAndDo, "tee", "Black"],
  ["he-rent-his-coat", rentBack, "hoodie", "Black"],
  ["true-at-all-times", trueCrest, "tee", "Shadow"],
  ["service-club", serviceCrest, "tee", "Cream"],
  ["children-of-christ", childrenOfChrist, "tee", "Shadow"],
];

const ONLY = process.argv[2] ? new RegExp(process.argv[2]) : null;
const FILES = [
  { name: "liberty-v4-back.png", svg: liberty },
  { name: "cureloms-v3-back.png", svg: cureloms },
  ...PICTURES.map(([id, file, o]) => ({ name: `${id}-picture-back.png`, svg: () => picture({ file, ...o }), needs: file })),
  ...COLOR_LINE.map(([id, file, tee]) => {
    const o = PICTURES.find(p => p[0] === id)[2];
    return { name: `${id}-color-back.png`, svg: () => picture({ ...o, file, tee }), needs: file };
  }),
  ...IDEAS.map(([id, svg]) => ({ name: `idea-${id}-back.png`, svg })),
  { name: "idea-he-rent-his-coat-sleeve-left.png", size: [420, 1800], svg: () => sleeve("ALMA 46:12") },
  { name: "idea-he-rent-his-coat-sleeve-right.png", size: [420, 1800], svg: () => sleeve("TITLE OF LIBERTY") },
  // Small chest marks for the front: bone for dark tees, forest for light ones.
  { name: "front-mark-bone.png", svg: () => chest(lock(0, 0, 44, BONE, RED)) },
  { name: "front-mark-forest.png", svg: () => chest(lock(0, 0, 44, FOREST, RED)) },
// A picture tee renders only once its halftone exists (make it with halftone.py; the command is in art-sources/bloch/SOURCES.md).
].filter(f => (!ONLY || ONLY.test(f.name)) && (!f.needs || existsSync(resolve("print/review/src", f.needs))));

const fonts = resolve("public/fonts");
const extra = resolve("scripts/printful/fonts"); // Graduate, Kaushan Script, Caveat Brush: SIL Open Font License, licenses beside them
const head = `<style>
@font-face { font-family: "Archivo"; font-weight: 100 900; font-stretch: 62% 125%; src: url("file://${fonts}/archivo-variable-latin.woff2") }
@font-face { font-family: "Instrument Serif"; font-style: italic; src: url("file://${fonts}/instrument-serif-latin-400-italic.woff2") }
@font-face { font-family: "IBM Plex Mono"; font-weight: 500; src: url("file://${fonts}/ibm-plex-mono-latin-500-normal.woff2") }
@font-face { font-family: "IBM Plex Mono"; font-weight: 600; src: url("file://${fonts}/ibm-plex-mono-latin-600-normal.woff2") }
@font-face { font-family: "Graduate"; src: url("file://${extra}/graduate-latin-400-normal.woff2") }
@font-face { font-family: "Kaushan Script"; src: url("file://${extra}/kaushan-script-latin-400-normal.woff2") }
@font-face { font-family: "Caveat Brush"; src: url("file://${extra}/caveat-brush-latin-400-normal.woff2") }
html, body { margin: 0; background: transparent } svg { display: block }
</style>`;
mkdirSync("print/review", { recursive: true });
const browser = await chromium.launch();
for (const f of FILES) {
  const [W, H] = f.size || [1800, 2400];
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
  const tmp = resolve(tmpdir(), `rc-review-${process.pid}.html`);
  writeFileSync(tmp, `<!doctype html><html><head>${head}</head><body><svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${f.svg()}</svg></body></html>`);
  await page.goto(`file://${tmp}`);
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => document.querySelectorAll("g.lock").forEach(g => {
    const box = g.getBBox();
    g.setAttribute("transform", `translate(${Number(g.dataset.cx) - (box.x + box.width / 2)} 0)`);
  }));
  const missing = await page.evaluate(() => [...document.fonts].filter(x => x.status === "error").map(x => x.family));
  if (missing.length) console.warn(`  ${f.name}: fonts failed to load: ${missing.join(", ")}`);
  rmSync(tmp);
  await page.screenshot({ path: `print/review/${f.name}`, omitBackground: true });
  await page.close();
  console.log(`print/review/${f.name}`);
}
await browser.close();
