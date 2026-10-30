// Creates the Fall/Winter line in the Printful API store and saves a photo of each piece.
// Runs in GitHub Actions (.github/workflows/printful.yml) with PRINTFUL_TOKEN as a repository secret, because
// Printful can't be reached from where the site is built. Safe to run again: pieces already in Printful are left
// alone, and photos are only made for pieces that don't have one yet.
//
// For each piece it:
//   1. creates the Printful product with every size, its retail price and the external variant IDs store.mjs uses
//   2. asks Printful's mockup generator for product photos and saves them to public/images/products
//   3. asks Printful what one unit costs (size M), so the margin is a real number
// Everything it learns goes to scripts/printful/result.json.
//
// Env: PRINTFUL_TOKEN (required), FILE_BASE (URL of the /print folder Printful downloads from),
//      ONLY=id,id to run some pieces, REDO_PHOTOS=1 to make photos again.
// scripts/printful/run.json can also set these for the next push: { "redo_photos": true, "replace": ["id"] }.
// "replace" deletes those pieces from Printful and creates them again (use it after changing their print files).
import { mkdirSync, writeFileSync, existsSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";
import { PRODUCTS, PRINTFUL_STORE_ID } from "../../netlify/lib/store.mjs";
import { CATALOG } from "./catalog.mjs";
import { FILES, SIZE, fileName } from "./art.mjs";
import { BOLD_FILES, PREVIEWS, TAG_FILES } from "./art-bold.mjs";
import { TYPE_FILES } from "./art-type.mjs";

const TOKEN = process.env.PRINTFUL_TOKEN;
const FILE_BASE = process.env.FILE_BASE;
const RUN = existsSync("scripts/printful/run.json") ? JSON.parse(readFileSync("scripts/printful/run.json", "utf8")) : {};
const ONLY = [...(process.env.ONLY || "").split(",").filter(Boolean), ...(RUN.only || [])];
const REDO_PHOTOS = Boolean(process.env.REDO_PHOTOS || RUN.redo_photos);
const REPLACE = new Set(RUN.replace || []);
if (!TOKEN) {
  console.error("PRINTFUL_TOKEN is not set. Add it in GitHub: Settings > Secrets and variables > Actions > New repository secret.");
  process.exit(1);
}
if (!FILE_BASE) { console.error("FILE_BASE is not set."); process.exit(1); }

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function pf(path, { method = "GET", body } = {}, tries = 0) {
  const res = await fetch(`https://api.printful.com/${path}`, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json", "X-PF-Store-Id": process.env.PRINTFUL_STORE_ID || PRINTFUL_STORE_ID },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 429 && tries < 10) {
    const wait = Number(res.headers.get("retry-after")) || Number(String(data?.error?.message || data?.result || "").match(/(\d+) seconds/)?.[1]) || 60;
    console.log(`  Printful asked us to slow down, waiting ${wait}s`);
    await sleep((wait + 1) * 1000);
    return pf(path, { method, body }, tries + 1);
  }
  return { ok: res.ok, status: res.status, data };
}
const why = r => `Printful ${r.status}: ${JSON.stringify(r.data?.error?.message || r.data?.result || r.data).slice(0, 500)}`;

const catalogCache = new Map(), printfileCache = new Map();
async function catalogProduct(id) {
  if (!catalogCache.has(id)) {
    const r = await pf(`products/${id}`);
    if (!r.ok) throw new Error(`catalog product ${id}: ${why(r)}`);
    catalogCache.set(id, r.data.result);
  }
  return catalogCache.get(id);
}
async function printfiles(id) {
  if (!printfileCache.has(id)) {
    const r = await pf(`mockup-generator/printfiles/${id}`);
    if (!r.ok) throw new Error(`printfiles for ${id}: ${why(r)}`);
    printfileCache.set(id, r.data.result);
    const pfs = r.data.result;
    console.log(`  print areas for catalog product ${id}: ${pfs.printfiles.map(p => `#${p.printfile_id} ${p.width}x${p.height}`).join(", ")}`);
  }
  return printfileCache.get(id);
}

// Fits our file inside Printful's print area. Full-front prints and leg strips hang from the top; patches are centered.
async function position(product, variantId, file) {
  const pfs = await printfiles(product);
  const pid = pfs.variant_printfiles.find(v => v.variant_id === variantId)?.placements?.[file.place];
  const area = pfs.printfiles.find(p => p.printfile_id === pid);
  if (!area) throw new Error(`no print area "${file.place}" for variant ${variantId}. Areas: ${Object.keys(pfs.available_placements || {}).join(", ")}`);
  const [w, h] = SIZE[file.size].map(n => n * 2);
  const scale = Math.min(area.width / w, area.height / h);
  const width = Math.round(w * scale), height = Math.round(h * scale);
  const top = file.size === "DTG" || file.size === "LEG" ? 0 : Math.round((area.height - height) / 2);
  return { area_width: area.width, area_height: area.height, width, height, top, left: Math.round((area.width - width) / 2), limit_to_print_area: true };
}

// Thread colors for embroidered files, under whichever option name this blank uses for that placement.
async function threadOptions(product, files) {
  const names = new Set((await catalogProduct(product)).product.options.map(o => o.id));
  const out = [];
  if (names.has("embroidery_type") && files.some(f => f.threads)) out.push({ id: "embroidery_type", value: "flat" });
  for (const f of files.filter(f => f.threads)) {
    const name = [`thread_colors_${f.place.replace(/^embroidery_/, "")}`, "thread_colors"].find(n => names.has(n));
    if (name) out.push({ id: name, value: f.threads });
  }
  return out;
}

// Photo styles to try per catalog product, from Printful's own option groups for each blank (see "list_styles").
// "Premium" styles are left out.
const STYLES = {
  380: { groups: ["Men's", "Men's 2", "Men's Lifestyle", "Men's Lifestyle 2", "Women's", "Women's 2", "Flat", "Flat 2"], views: ["Front", "Back"] },
  411: { groups: ["Men's", "Men's 2", "Women's", "Women's Lifestyle", "Flat", "Folded"], views: ["Front", "Back"] },
  412: { groups: ["Men's", "Men's 2", "Men's 3", "Flat"], views: ["Front", "Front Left", "Front Left Leg", "Left Front"] },
  206: { groups: ["Men's", "Men's Lifestyle", "Men's Lifestyle 2", "Lifestyle", "Flat Lifestyle", "Women's Lifestyle"], views: ["Front", "Right Front", "Left Front", "Back"] },
  266: { groups: ["Men's Lifestyle", "Men's Lifestyle 2", "Women's Lifestyle", "Flat Lifestyle", "Flat"], views: ["Front", "Front 2"] },
  674: { groups: ["Men's", "Men's Lifestyle", "Women's", "Women's Lifestyle", "Flat"], views: ["Front", "Front 2", "Zoomed-in"] },
  661: { groups: ["Men's", "Men's Lifestyle", "Women's", "Flat"], views: ["Front", "Front 2", "Zoomed-in"] },
  399: { groups: ["Men's", "Men's 2", "Men's Lifestyle", "Women's Lifestyle", "Flat", "On Hanger"], views: ["Front", "Front 2", "Zoomed-in"] },
  1626: { groups: ["Flat"], views: ["Front", "Back"] },
  895: { groups: ["Men's", "Men's 2", "Men's 3", "Women's", "Flat"], views: ["Front", "Front Left", "Left Front", "Front Left Leg", "Front Right"] },
  19: { groups: ["Lifestyle", "Lifestyle 2", "Lifestyle 3", "Environment"], views: ["Front", "Handle on Right", "Handle on Left", "Woman", "Office environment", "Cutting board"] },
  407: { groups: ["Lifestyle", "Lifestyle 2", "Lifestyle 3", "Lifestyle 4", "Men's Lifestyle", "Women's Lifestyle"], views: ["Front", "Left", "Right"] },
};

const resultPath = "scripts/printful/result.json";
const result = existsSync(resultPath) ? JSON.parse(readFileSync(resultPath, "utf8")) : { products: {} };
mkdirSync("public/images/products", { recursive: true });

// "dump": save what Printful has for these sync variants (by external ID), files and positions included, to
// result.dump, without changing anything. Used to copy a piece designed in Printful's own designer.
if (RUN.dump) {
  result.dump = {};
  for (const ext of RUN.dump) {
    const r = await pf(`store/variants/@${ext}`);
    result.dump[ext] = r.ok ? r.data.result : { error: why(r) };
    console.log(`dump ${ext}: ${r.ok ? `${r.data.result.files?.length} files` : why(r)}`);
  }
  writeFileSync(resultPath, JSON.stringify(result, null, 2) + "\n");
  process.exit(0);
}

// "preview": photograph the designs in art-bold.mjs on their blanks without creating any products, and save the
// photos to candidates/preview/<key>/ (pushed to the photo-candidates branch) so the owner can choose.
if (RUN.preview) {
  let bad = 0;
  for (const pv of PREVIEWS) {
    if (ONLY.length && !ONLY.includes(pv.key)) continue;
    console.log(`\npreview ${pv.key} (${pv.color})`);
    try {
      const pfs = await printfiles(pv.product);
      const style = STYLES[pv.product] || { groups: [], views: [] };
      const groups = style.groups.filter(g => (pfs.option_groups || []).includes(g));
      const views = style.views.filter(v => (pfs.options || []).includes(v));
      const files = pv.files.flatMap(id => BOLD_FILES.filter(f => f.id === id)).filter(f => pfs.available_placements?.[f.place]);
      const task = await pf(`mockup-generator/create-task/${pv.product}`, { method: "POST", body: {
        variant_ids: [pv.variant], format: "jpg", ...(groups.length && { option_groups: groups }), ...(views.length && { options: views }),
        files: await Promise.all(files.map(async f => ({ placement: f.place, image_url: `${FILE_BASE}/${fileName(f)}`, position: await position(pv.product, pv.variant, f) }))),
      } });
      if (!task.ok) throw new Error(`start preview: ${why(task)}`);
      let done;
      for (let i = 0; i < 90 && !done; i++) {
        await sleep(5000);
        const r = await pf(`mockup-generator/task?task_key=${encodeURIComponent(task.data.result.task_key)}`);
        if (r.data?.result?.status === "completed") done = r.data.result;
        else if (r.data?.result?.status === "failed") throw new Error(`preview failed: ${JSON.stringify(r.data.result.error)}`);
      }
      if (!done) throw new Error("preview took longer than 7 minutes");
      const dir = `candidates/preview/${pv.key}`, list = [], seen = new Set();
      mkdirSync(dir, { recursive: true });
      for (const m of done.mockups) for (const shot of [{ option: m.placement, url: m.mockup_url }, ...(m.extra || [])]) {
        if (list.length >= 30 || seen.has(shot.url)) continue;
        seen.add(shot.url);
        const img = await fetch(shot.url);
        if (!img.ok) continue;
        const file = `${list.length + 1}.jpg`;
        writeFileSync(`${dir}/${file}`, Buffer.from(await img.arrayBuffer()));
        list.push({ file, placement: m.placement, group: shot.option_group || "", view: shot.option || "" });
      }
      writeFileSync(`${dir}/index.json`, JSON.stringify(list, null, 2) + "\n");
      console.log(`  saved ${list.length} photos (styles: ${groups.join(", ") || "default"})`);
    } catch (e) { bad++; console.error(`  FAILED: ${e.message}`); }
  }
  process.exit(bad ? 1 : 0);
}

let failures = 0;
for (const [id, cat] of Object.entries(CATALOG)) {
  if (ONLY.length && !ONLY.includes(id)) continue;
  const product = PRODUCTS[id];
  // Printful's API refuses printed inside tags ("Unsupported file type: label_inside"), so TAG_FILES are only
  // artwork for adding a tag by hand in Printful's dashboard.
  const files = [...FILES, ...BOLD_FILES, ...TYPE_FILES].filter(f => f.id === (cat.art || id));
  // A file with forSize (a sized tag) only goes on that size.
  const filesFor = size => files.filter(f => !f.forSize || f.forSize === size);
  const sizes = Object.keys(product.variants);
  const out = (result.products[id] ||= {});
  delete out.error;
  console.log(`\n${product.name} (${cat.color})`);
  try {
    const options = await threadOptions(cat.product, files);

    // "list_styles": only record which photo styles (option groups) and views Printful offers for this blank.
    if (RUN.list_styles) {
      const pfs = await printfiles(cat.product);
      out.styles = { option_groups: pfs.option_groups, options: pfs.options };
      console.log(`  styles: ${(pfs.option_groups || []).join(", ")}`);
      continue;
    }

    // 1. The product.
    const existing = await pf(`store/products/@rc-${id}`);
    const replacing = existing.ok && REPLACE.has(id);
    if (existing.ok && !replacing) {
      out.sync_product_id = existing.data.result.sync_product.id;
      console.log(`  already in Printful (#${out.sync_product_id}), leaving it as is`);
    } else {
      const sync_variants = [];
      for (const size of sizes) {
        const variant_id = cat.variants[size];
        const price = product.price[size] ?? product.price.default;
        sync_variants.push({
          variant_id,
          external_id: product.variants[size],
          retail_price: (price / 100).toFixed(2),
          files: await Promise.all(filesFor(size).map(async f => ({ type: f.place, url: `${FILE_BASE}/${fileName(f)}`, position: await position(cat.product, variant_id, f) }))),
          ...(options.length && { options }),
        });
      }
      // The new version is fully built before the old one is deleted, so a failure never leaves the piece missing.
      if (replacing) {
        const gone = await pf(`store/products/@rc-${id}`, { method: "DELETE" });
        if (!gone.ok) throw new Error(`delete old product: ${why(gone)}`);
        console.log(`  deleted the old version (#${existing.data.result.sync_product.id}) to make it again`);
        if (!RUN.keep_photos) out.images = [];
      }
      const made = await pf("store/products", { method: "POST", body: { sync_product: { name: `${product.name} | ${cat.color}`, external_id: `rc-${id}` }, sync_variants } });
      if (!made.ok) throw new Error(`create product: ${why(made)}`);
      out.sync_product_id = made.data.result.id;
      console.log(`  created in Printful (#${out.sync_product_id}) with sizes ${sizes.join(", ")}`);
    }

    // "styles": make photos in the styles listed in STYLES (models, lifestyle, flat lays) and save every one
    // to candidates/<id>/ so the best can be picked by eye. The workflow pushes them to the photo-candidates branch.
    if (RUN.styles) {
      const style = STYLES[cat.product];
      if (!style) { console.log("  no styles listed for this blank"); continue; }
      const photoVariant = cat.variants.M || cat.variants.OS;
      const product_options = Object.fromEntries(options.map(o => [o.id, o.value]));
      const task = await pf(`mockup-generator/create-task/${cat.product}`, { method: "POST", body: {
        variant_ids: [photoVariant], format: "jpg", option_groups: style.groups, options: style.views,
        files: await Promise.all(filesFor(cat.variants.M ? "M" : "OS").map(async f => ({ placement: f.place, image_url: `${FILE_BASE}/${fileName(f)}`, position: await position(cat.product, photoVariant, f) }))),
        ...(options.length && { product_options }),
      } });
      if (!task.ok) throw new Error(`start styled photos: ${why(task)}`);
      let done;
      for (let i = 0; i < 90 && !done; i++) {
        await sleep(5000);
        const r = await pf(`mockup-generator/task?task_key=${encodeURIComponent(task.data.result.task_key)}`);
        if (r.data?.result?.status === "completed") done = r.data.result;
        else if (r.data?.result?.status === "failed") throw new Error(`styled photos failed: ${JSON.stringify(r.data.result.error)}`);
      }
      if (!done) throw new Error("styled photos took longer than 7 minutes");
      mkdirSync(`candidates/${id}`, { recursive: true });
      const list = [], seen = new Set();
      for (const m of done.mockups) {
        for (const shot of [{ option: m.placement, url: m.mockup_url }, ...(m.extra || [])]) {
          if (list.length >= 40 || seen.has(shot.url)) continue;
          seen.add(shot.url);
          const img = await fetch(shot.url);
          if (!img.ok) continue;
          const file = `${list.length + 1}.jpg`;
          writeFileSync(`candidates/${id}/${file}`, Buffer.from(await img.arrayBuffer()));
          list.push({ file, placement: m.placement, group: shot.option_group || "", view: shot.option || shot.title || "", url: shot.url });
        }
      }
      writeFileSync(`candidates/${id}/index.json`, JSON.stringify(list, null, 2) + "\n");
      console.log(`  saved ${list.length} styled photos`);
      continue;
    }

    // 2. Photos, made on size M (or the one size).
    const photoVariant = cat.variants.M || cat.variants.OS;
    const have = (out.images || []).length && out.images.every(p => existsSync(`public/${p}`));
    if ((!have || REDO_PHOTOS) && !RUN.keep_photos) {
      const product_options = Object.fromEntries(options.map(o => [o.id, o.value]));
      const task = await pf(`mockup-generator/create-task/${cat.product}`, { method: "POST", body: {
        variant_ids: [photoVariant], format: "jpg",
        files: await Promise.all(filesFor(cat.variants.M ? "M" : "OS").map(async f => ({ placement: f.place, image_url: `${FILE_BASE}/${fileName(f)}`, position: await position(cat.product, photoVariant, f) }))),
        ...(options.length && { product_options }),
      } });
      if (!task.ok) throw new Error(`start photos: ${why(task)}`);
      const key = task.data.result.task_key;
      let done;
      for (let i = 0; i < 60 && !done; i++) {
        await sleep(5000);
        const r = await pf(`mockup-generator/task?task_key=${encodeURIComponent(key)}`);
        if (r.data?.result?.status === "completed") done = r.data.result;
        else if (r.data?.result?.status === "failed") throw new Error(`photos failed: ${JSON.stringify(r.data.result.error)}`);
      }
      if (!done) throw new Error("photos took longer than 5 minutes");
      // Photos are numbered in the order Printful returns them; the same picture is only kept once.
      for (const f of readdirSync("public/images/products")) if (f.startsWith(`${id}-`) && /^-(front|back|\d)/.test(f.slice(id.length))) rmSync(`public/images/products/${f}`);
      out.images = [];
      out.mockups = [];
      const seen = new Set();
      for (const m of done.mockups) {
        const shots = [{ title: m.placement, url: m.mockup_url }, ...(m.extra || []).map(x => ({ title: x.title || x.option, url: x.url }))];
        for (const shot of shots) {
          if (out.images.length >= 8 || seen.has(shot.url)) continue;
          seen.add(shot.url);
          const img = await fetch(shot.url);
          if (!img.ok) continue;
          const bytes = Buffer.from(await img.arrayBuffer());
          const hash = createHash("sha1").update(bytes).digest("hex");
          if (seen.has(hash)) continue;
          seen.add(hash);
          const path = `images/products/${id}-${out.images.length + 1}.jpg`;
          writeFileSync(`public/${path}`, bytes);
          out.images.push(path);
          out.mockups.push({ placement: m.placement, title: shot.title, url: shot.url, path });
        }
      }
      console.log(`  saved ${out.images.length} photos`);
    }

    // 3. What one unit costs.
    const est = await pf("orders/estimate-costs", { method: "POST", body: {
      recipient: { address1: "300 S Salisbury St", city: "Raleigh", state_code: "NC", country_code: "US", zip: "27601" },
      items: [{ external_variant_id: product.variants.M || product.variants.OS, quantity: 1 }],
    } });
    if (est.ok) {
      out.cost = est.data.result.costs;
      const price = product.price.default / 100;
      console.log(`  costs $${out.cost.subtotal} before shipping (sells for $${price.toFixed(2)}, about $${(price - Number(out.cost.subtotal)).toFixed(2)} left before tax and shipping)`);
    } else console.log(`  cost estimate unavailable: ${why(est)}`);
  } catch (e) {
    failures++;
    out.error = e.message;
    console.error(`  FAILED: ${e.message}`);
  }
}

result.generatedAt = new Date().toISOString();
writeFileSync(resultPath, JSON.stringify(result, null, 2) + "\n");
console.log(`\nDone. ${failures ? `${failures} piece(s) failed, see above.` : "Every piece is in Printful."}`);
process.exit(failures ? 1 : 0);
