// Renders every file in art.mjs to a transparent 300 DPI PNG in /print, plus print/_sheet.png to eyeball them all.
// Run from the repo root: node scripts/printful/render.mjs
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { FILES as BASE, SIZE, fileName } from "./art.mjs";
import { BOLD_FILES, TAG_FILES } from "./art-bold.mjs";
const ONLY = process.argv[2] ? new RegExp(process.argv[2]) : null;
const FILES = [...BASE, ...BOLD_FILES, ...TAG_FILES].filter(f => !ONLY || ONLY.test(f.id));

const fonts = resolve("public/fonts");
const head = `<style>
@font-face { font-family: "Archivo"; font-weight: 100 900; font-stretch: 62% 125%; src: url("file://${fonts}/archivo-variable-latin.woff2") }
@font-face { font-family: "Instrument Serif"; font-style: italic; src: url("file://${fonts}/instrument-serif-latin-400-italic.woff2") }
@font-face { font-family: "IBM Plex Mono"; font-weight: 400; src: url("file://${fonts}/ibm-plex-mono-latin-400-normal.woff2") }
@font-face { font-family: "IBM Plex Mono"; font-weight: 500; src: url("file://${fonts}/ibm-plex-mono-latin-500-normal.woff2") }
@font-face { font-family: "IBM Plex Mono"; font-weight: 600; src: url("file://${fonts}/ibm-plex-mono-latin-600-normal.woff2") }
html, body { margin: 0; background: transparent } svg { display: block }
</style>`;

mkdirSync("print", { recursive: true });
const browser = await chromium.launch();
for (const f of FILES) {
  const [w, h] = SIZE[f.size];
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  // Loaded from a file:// page so the file:// font URLs are allowed.
  const tmp = resolve(tmpdir(), `rc-art-${process.pid}.html`);
  writeFileSync(tmp, `<!doctype html><html><head>${head}</head><body><svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><g transform="${f.fit || ""}">${f.svg()}</g>${f.mark ? f.mark() : ""}</svg></body></html>`);
  await page.goto(`file://${tmp}`);
  await page.evaluate(() => document.fonts.ready);
  // Center each Rent Coat Co. mark on its data-cx now that the text has its real width.
  await page.evaluate(() => document.querySelectorAll("g.lock").forEach(g => {
    const box = g.getBBox();
    g.setAttribute("transform", `translate(${Number(g.dataset.cx) - (box.x + box.width / 2)} 0)`);
  }));
  const missing = await page.evaluate(() => [...document.fonts].filter(x => x.status === "error").map(x => x.family));
  if (missing.length) console.warn(`  ${fileName(f)}: fonts failed to load: ${missing.join(", ")}`);
  rmSync(tmp);
  await page.screenshot({ path: `print/${fileName(f)}`, omitBackground: true });
  await page.close();
  console.log(fileName(f), `${w * 2}x${h * 2}`);
}
await browser.close();
