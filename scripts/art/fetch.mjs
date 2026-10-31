// Downloads public-domain source art listed in sources.json into art/src (run by .github/workflows/fetch-art.yml,
// since the build server can reach Wikimedia Commons and NASA). Keeps the top 3 matches for each entry.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
const UA = { "User-Agent": "RentCoatCo-art-fetch/1.0 (rentcoat.co@gmail.com)" };
const sources = JSON.parse(readFileSync("scripts/art/sources.json", "utf8"));
mkdirSync("art/src", { recursive: true });
let index = {}; try { index = JSON.parse(readFileSync("art/src/index.json", "utf8")); } catch {}
const save = async (name, url, meta) => {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) return console.log(`  ${name}: ${r.status} ${url}`);
  const ext = (url.match(/\.(jpe?g|png|tif?f)(\?|$)/i)?.[1] || "jpg").toLowerCase();
  writeFileSync(`art/src/${name}.${ext}`, Buffer.from(await r.arrayBuffer()));
  index[name] = { url, ...meta };
  console.log(`  saved ${name}.${ext}`);
};
for (const [key, s] of Object.entries(sources)) {
  console.log(key);
  if (s.wikimedia) {
    const q = new URLSearchParams({ action: "query", list: "search", srsearch: s.wikimedia, srnamespace: "6", srlimit: "4", format: "json" });
    const hits = (await (await fetch(`https://commons.wikimedia.org/w/api.php?${q}`, { headers: UA })).json()).query?.search || [];
    for (const [i, h] of hits.entries()) {
      const p = new URLSearchParams({ action: "query", titles: h.title, prop: "imageinfo", iiprop: "url|extmetadata", iiurlwidth: "3000", format: "json" });
      const page = Object.values((await (await fetch(`https://commons.wikimedia.org/w/api.php?${p}`, { headers: UA })).json()).query.pages)[0];
      const ii = page.imageinfo?.[0]; if (!ii) continue;
      await save(`${key}-${i + 1}`, ii.thumburl || ii.url, { title: h.title, license: ii.extmetadata?.LicenseShortName?.value, artist: ii.extmetadata?.Artist?.value?.replace(/<[^>]+>/g, "") });
    }
  }
  if (s.nasa) {
    const q = new URLSearchParams({ q: s.nasa, media_type: "image" });
    const items = (await (await fetch(`https://images-api.nasa.gov/search?${q}`)).json()).collection?.items?.slice(0, 3) || [];
    for (const [i, it] of items.entries()) {
      const files = await (await fetch(it.href)).json();
      const url = files.find(f => /~orig\.jpe?g$/i.test(f)) || files.find(f => /~large\.jpe?g$/i.test(f)) || files[0];
      await save(`${key}-${i + 1}`, url.replace(/^http:/, "https:"), { title: it.data?.[0]?.title, license: "NASA public domain", nasa_id: it.data?.[0]?.nasa_id });
    }
  }
}
writeFileSync("art/src/index.json", JSON.stringify(index, null, 2) + "\n");
