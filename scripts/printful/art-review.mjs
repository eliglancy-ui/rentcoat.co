// Design review, Nov 2026: proposed v4 back prints for the Drop 001 tees. These are NEW files for Eli to compare
// against the live art; nothing here is wired into setup.mjs or Printful. Renders to print/review/.
// Run from the repo root: node scripts/printful/art-review.mjs
// Canvas is Printful's 12 x 16 in DTG area at 150 units per inch, rendered at 2x (3600 x 4800 px = 300 DPI).
// Rules: no stroke or line thinner than 6 units (about 3 pt), no type smaller than 54 units (0.36 in).
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { INK, t, lock } from "./art.mjs";
import { worn } from "./art-bold.mjs";

const FOREST = "#1F3A2E", RED = INK.red, BONE = INK.bone, NIGHT = INK.night;

// One line of display type stretched to an exact width, like the poster blocks in art-bold.mjs.
const wide = (y, size, txt, fill, w = 1700, stretch = 62) =>
  `<text x="${900 - w / 2}" y="${y}" textLength="${w}" lengthAdjust="spacingAndGlyphs" fill="${fill}" style="font-family:'Archivo';font-weight:900;font-stretch:${stretch}%;font-size:${size}px">${txt.replace(/&/g, "&amp;")}</text>`;

// Title of Liberty v4: the same idea as the live shirt, built to fill the back. Torn coat on a pole across the
// shoulders, TITLE OF / LIBERTY stacked to the full 12 in width, a worn screen-print texture, and the verse line big
// enough to read. Ink: bone, rent red, gold, night (the flag lettering). Blank: Shadow.
function liberty() {
  const cloth = "M190 300 C520 250 820 330 1150 280 C1350 250 1520 290 1660 270 L1590 380 L1690 450 L1580 520 L1670 600 L1560 660 L1640 740 C1400 800 1180 740 950 790 C700 840 450 760 190 820 Z";
  return lock(900, 120, 62, BONE, RED) + worn(
    `<rect x="150" y="250" width="40" height="680" rx="8" fill="${BONE}"/><circle cx="170" cy="236" r="34" fill="${BONE}"/>`
    + `<path d="${cloth}" fill="${BONE}"/>`
    + `<path d="M190 640 C460 600 700 680 950 640 C1180 600 1400 660 1600 620" stroke="${RED}" stroke-width="44" fill="none"/>`
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
const art = (file, y, h) => `<image href="file://${resolve("print/review/src", file)}" x="50" y="${y}" width="1700" height="${h}" preserveAspectRatio="xMidYMin meet"/>`;
const script = (x, y, size, txt, rot = -6) =>
  `<text x="${x}" y="${y}" transform="rotate(${rot} ${x} ${y})" fill="${SCRIPT_RED}" style="font-family:'Instrument Serif';font-style:italic;font-size:${size}px">${txt}</text>`;

// "Behold, I am JESUS CHRIST" from 3 Nephi 11:10, over Christ from Bloch's Sermon on the Mount (1877).
function behold() {
  return lock(900, 110, 56, BONE, RED)
    + art("bloch-sermon-halftone.png", 170, 1480)
    + worn(wide(2010, 380, "JESUS CHRIST", BONE)
      + t(900, 2160, 64, "3 NEPHI 11:10", { f: "m", w: 600, fill: INK.gold, ls: 20 }))
    + script(80, 1700, 210, "Behold, I am");
}

// "mine arm of MERCY" from 3 Nephi 9:14, over Bloch's Consolator.
function mercy() {
  return lock(900, 110, 56, BONE, RED)
    + art("bloch-consolator-halftone.png", 170, 1500)
    + worn(wide(2040, 560, "MERCY", BONE)
      + t(900, 2190, 58, "MINE ARM OF MERCY IS EXTENDED TOWARDS YOU · 3 NEPHI 9:14", { f: "m", w: 600, fill: INK.gold, ls: 4 }))
    + script(90, 1600, 220, "mine arm of");
}

const ONLY = process.argv[2] ? new RegExp(process.argv[2]) : null;
const FILES = [
  { name: "liberty-v4-back.png", svg: liberty },
  { name: "cureloms-v3-back.png", svg: cureloms },
  { name: "behold-bloch-back.png", svg: behold },
  { name: "mercy-bloch-back.png", svg: mercy },
].filter(f => !ONLY || ONLY.test(f.name));

const fonts = resolve("public/fonts");
const head = `<style>
@font-face { font-family: "Archivo"; font-weight: 100 900; font-stretch: 62% 125%; src: url("file://${fonts}/archivo-variable-latin.woff2") }
@font-face { font-family: "Instrument Serif"; font-style: italic; src: url("file://${fonts}/instrument-serif-latin-400-italic.woff2") }
@font-face { font-family: "IBM Plex Mono"; font-weight: 500; src: url("file://${fonts}/ibm-plex-mono-latin-500-normal.woff2") }
@font-face { font-family: "IBM Plex Mono"; font-weight: 600; src: url("file://${fonts}/ibm-plex-mono-latin-600-normal.woff2") }
html, body { margin: 0; background: transparent } svg { display: block }
</style>`;
mkdirSync("print/review", { recursive: true });
const browser = await chromium.launch();
for (const f of FILES) {
  const page = await browser.newPage({ viewport: { width: 1800, height: 2400 }, deviceScaleFactor: 2 });
  const tmp = resolve(tmpdir(), `rc-review-${process.pid}.html`);
  writeFileSync(tmp, `<!doctype html><html><head>${head}</head><body><svg xmlns="http://www.w3.org/2000/svg" width="1800" height="2400" viewBox="0 0 1800 2400">${f.svg()}</svg></body></html>`);
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
