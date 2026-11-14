// Word-only hoodies (Eli, Nov 14 2026: no pictures on hoodies). Print files for Tapstitch UT0200, black.
// Back 12 x 16 in, sleeves 2.8 x 12 in, chest 3.5 in wide (trimmed), all 300 DPI transparent PNG.
// Run from the repo root: node scripts/tapstitch/word-hoodies.mjs
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";

const F = resolve("public/fonts");
const C = { bone: "#ECE8DF", gold: "#C9A45C" };
const T = (x, y, s, t, o = {}) => `<text x="${x}" y="${y}" text-anchor="middle" fill="${o.fill || C.bone}" style="font-family:'${o.f || "Archivo"}';font-size:${s}px;font-weight:${o.w || 900};font-stretch:${o.wd || 100}%;letter-spacing:${o.ls || 0}px;${o.it ? "font-style:italic;" : ""}">${t}</text>`;

const HOODIES = {
  steadfast: { word: "STEADFAST", size: 600, quote: "press forward with a steadfastness in Christ", ref: "2 NEPHI 31:20", chest: "steadfast", left: "PRESS FORWARD", right: "2 NEPHI 31:20" },
  forgiven: { word: "FORGIVEN", size: 690, quote: "“thy sins are forgiven thee”", ref: "ENOS 1:5", chest: "forgiven", left: "THY SINS ARE FORGIVEN", right: "ENOS 1:5" },
};

// Back: one word arched edge to edge across the shoulders, the verse in serif under it, the reference in mono.
const back = h => `<defs><path id="arc" d="M60 1500 A 6200 6200 0 0 1 3540 1500"/></defs>
<text text-anchor="middle" fill="${C.bone}" style="font-family:Archivo;font-weight:900;font-stretch:72%;font-size:${h.size}px;letter-spacing:${h.size * 0.06}px"><textPath href="#arc" startOffset="50%">${h.word}</textPath></text>
${T(1800, 1900, 150, h.quote, { f: "Instrument Serif", w: 400, it: 1, fill: C.gold })}
${T(1800, 2130, 84, `${h.ref} · RENT COAT CO.`, { f: "IBM Plex Mono", w: 500, ls: 28, fill: C.gold })}`;
// Sleeves: read top to bottom down the arm, starting near the shoulder.
const sleeve = (txt, fill) => `<g transform="translate(420 1800) rotate(90)">${T(0, 50, 150, txt, { f: "IBM Plex Mono", w: 500, ls: 52, fill })}</g>`;
// Chest: the word in italic serif with the brand under it, trimmed to the art.
const chest = h => `${T(600, 230, 230, h.chest, { f: "Instrument Serif", w: 400, it: 1 })}${T(600, 330, 62, "RENT COAT CO.", { f: "IBM Plex Mono", w: 500, ls: 22, fill: C.gold })}`;

const head = `<style>
@font-face{font-family:"Archivo";font-weight:100 900;font-stretch:62% 125%;src:url("file://${F}/archivo-variable-latin.woff2")}
@font-face{font-family:"Instrument Serif";font-style:italic;src:url("file://${F}/instrument-serif-latin-400-italic.woff2")}
@font-face{font-family:"IBM Plex Mono";font-weight:500;src:url("file://${F}/ibm-plex-mono-latin-500-normal.woff2")}
html,body{margin:0;background:transparent} svg{display:block}</style>`;

mkdirSync("print/tapstitch", { recursive: true });
const browser = await chromium.launch();
async function render(name, w, h, svg, trim = false) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  const tmp = resolve(tmpdir(), `rc-word-${process.pid}.html`);
  writeFileSync(tmp, `<!doctype html><html><head>${head}</head><body><svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${svg}</svg></body></html>`);
  await page.goto(`file://${tmp}`);
  await page.evaluate(() => document.fonts.ready);
  const bad = await page.evaluate(() => [...document.fonts].filter(f => f.status === "error").map(f => f.family));
  if (bad.length) throw new Error(`${name}: fonts failed: ${bad}`);
  let clip;
  if (trim) { const b = await page.evaluate(() => { const r = document.querySelector("svg").getBBox(); return [r.x, r.y, r.width, r.height]; });
    clip = { x: Math.max(0, Math.floor(b[0]) - 10), y: Math.max(0, Math.floor(b[1]) - 10), width: Math.ceil(b[2]) + 20, height: Math.ceil(b[3]) + 20 }; }
  await page.screenshot({ path: `print/tapstitch/${name}.png`, omitBackground: true, ...(clip && { clip }) });
  await page.close();
  console.log(`print/tapstitch/${name}.png`);
}
for (const [k, h] of Object.entries(HOODIES)) {
  await render(`hoodie-${k}-back`, 3600, 4800, back(h));
  await render(`hoodie-${k}-sleeve-left`, 840, 3600, sleeve(h.left, C.bone));
  await render(`hoodie-${k}-sleeve-right`, 840, 3600, sleeve(h.right, C.gold));
  await render(`hoodie-${k}-chest`, 1200, 400, chest(h), true);
}
await browser.close();
