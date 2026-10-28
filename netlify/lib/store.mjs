// Shared store settings for the Rent Coat Co. checkout and order functions.
// Prices are in cents. Edit here, then redeploy.

// The Fall/Winter line. scripts/printful/setup.mjs creates each piece in Printful and gives every variant the
// external ID built here (rc-<id>-<size>), so a piece can be sold as soon as that script has run for it.
// live: false keeps a piece off the site and out of checkout. To launch one, set live: true and redeploy:
// the homepage shows every live piece in "The line" section on its own (it reads them from /api/config).
// price: that piece's own price in cents (the Drop 001 tees use PRICE and LAUNCH_PRICE instead).
// images: product photos with their view labels (see piece()). ref/verse: the scripture the piece points to (book slug, chapter, verse).
const APPAREL = ["S", "M", "L", "XL", "2XL"];
const ONE = ["OS"];
const tee = { default: 4000, "2XL": 4300 }, hoodie = { default: 6800, "2XL": 7100 }, crew = { default: 5800, "2XL": 6100 };
function piece(id, o) {
  const [book, chapter, verse] = o.verse || [];
  return {
    name: o.name, color: o.color, swatch: o.swatch, price: o.price, live: Boolean(o.live), kind: o.kind,
    // images: [{ src, label }], the first one leads. A plain path counts as an unlabeled photo.
    sizes: o.sizes || APPAREL, images: (o.images || []).map(i => typeof i === "string" ? { src: i, label: "" } : i),
    image: (o.images || []).map(i => i.src || i)[0] || "images/og-image-v3.jpg",
    ref: o.ref, refUrl: book ? `https://www.churchofjesuschrist.org/study/scriptures/bofm/${book}/${chapter}?lang=eng&id=p${verse}#p${verse}`
      : "https://www.churchofjesuschrist.org/study/scriptures/bofm?lang=eng",
    blurb: o.blurb,
    variants: Object.fromEntries((o.sizes || APPAREL).map(size => [size, `rc-${id}-${size}`])),
  };
}
const LINE_PIECES = {
  "rent-hoodie": { images: [{ src: "images/products/rent-hoodie-1.jpg", label: "Back" }, { src: "images/products/rent-hoodie-2.jpg", label: "Front" }, { src: "images/products/rent-hoodie-3.jpg", label: "Women's" }, { src: "images/products/rent-hoodie-4.jpg", label: "Flat" }],
    name: "Rent Coat Hoodie", kind: "Hoodie", color: "Black", swatch: "#080808", price: hoodie, ref: "Alma 46:12", verse: ["alma", 46, 12],
    blurb: "Heavyweight Cotton Heritage hoodie. A small gold flag on the chest and the whole title of liberty across the back." },
  "liberty-crew": { images: [{ src: "images/products/liberty-crew-1.jpg", label: "Front" }, { src: "images/products/liberty-crew-2.jpg", label: "Women's" }, { src: "images/products/liberty-crew-3.jpg", label: "Folded" }, { src: "images/products/liberty-crew-4.jpg", label: "Back" }],
    name: "Title of Liberty Crewneck", kind: "Crewneck", color: "Bone", swatch: "#F5E8CE", price: crew, ref: "Alma 46:12", verse: ["alma", 46, 12],
    blurb: "The quiet one. The words Moroni wrote on his coat, set like a book plate across the chest." },
  "stripling-hoodie": { images: [{ src: "images/products/stripling-hoodie-1.jpg", label: "Front" }, { src: "images/products/stripling-hoodie-2.jpg", label: "Women's" }, { src: "images/products/stripling-hoodie-3.jpg", label: "Flat" }, { src: "images/products/stripling-hoodie-4.jpg", label: "Back" }],
    name: "Stripling 2000 Hoodie", kind: "Hoodie", color: "Black", swatch: "#080808", price: hoodie, ref: "Alma 56:48", verse: ["alma", 56, 48],
    blurb: "Two thousand young men, and not one of them fell. Gold outline numerals on a heavyweight hoodie." },
  "strait-joggers": { images: [{ src: "images/products/strait-joggers-1.jpg", label: "Close-up" }, { src: "images/products/strait-joggers-2.jpg", label: "Full look" }, { src: "images/products/strait-joggers-3.jpg", label: "Flat" }],
    name: "Strait & Narrow Joggers", kind: "Joggers", color: "Charcoal Heather", swatch: "#3A3A38", price: { default: 6200, "2XL": 6500 }, ref: "1 Nephi 8:20", verse: ["1-ne", 8, 20],
    blurb: "Fleece joggers with STRAIT & NARROW running up the left thigh. Made to go with any of the hoodies." },
  "flag-cap": { images: [{ src: "images/products/flag-cap-1.jpg", label: "Men's" }, { src: "images/products/flag-cap-2.jpg", label: "Women's" }, { src: "images/products/flag-cap-3.jpg", label: "Front" }, { src: "images/products/flag-cap-4.jpg", label: "Styled" }],
    name: "Rent Coat Dad Cap", kind: "Cap", color: "Spruce", swatch: "#183A31", price: { default: 3200 }, sizes: ONE, ref: "Alma 46:13", verse: ["alma", 46, 13],
    blurb: "Washed cotton dad cap with the torn flag stitched in old gold." },
  "flag-beanie": { images: [{ src: "images/products/flag-beanie-1.jpg", label: "Men's" }, { src: "images/products/flag-beanie-2.jpg", label: "Women's" }, { src: "images/products/flag-beanie-3.jpg", label: "Front" }, { src: "images/products/flag-beanie-4.jpg", label: "Styled" }],
    name: "Torn Flag Beanie", kind: "Beanie", color: "Red", swatch: "#B91616", price: { default: 2800 }, sizes: ONE, ref: "Alma 46:12", verse: ["alma", 46, 12],
    blurb: "Cuffed knit beanie in rent red with a white flag on the cuff." },
  "shelem-fleece": { images: [{ src: "images/products/shelem-fleece-1.jpg", label: "Men's" }, { src: "images/products/shelem-fleece-2.jpg", label: "Women's" }, { src: "images/products/shelem-fleece-3.jpg", label: "Close-up" }, { src: "images/products/shelem-fleece-4.jpg", label: "Flat" }],
    name: "Mount Shelem Alpine Club Fleece", kind: "Fleece", color: "Black", swatch: "#151515", price: { default: 7800, "2XL": 8100 }, ref: "Ether 3:1", verse: ["ether", 3, 1],
    blurb: "Quarter-zip fleece with the club crest stitched on the chest. Named for the mount of exceeding height." },
  "hagoth-windbreaker": { images: [{ src: "images/products/hagoth-windbreaker-1.jpg", label: "Men's" }, { src: "images/products/hagoth-windbreaker-2.jpg", label: "Women's" }, { src: "images/products/hagoth-windbreaker-3.jpg", label: "Flat" }],
    name: "Hagoth Shipbuilding Co. Windbreaker", kind: "Windbreaker", color: "Forest Green", swatch: "#283D2C", price: { default: 8500, "2XL": 8800 }, ref: "Alma 63:5", verse: ["alma", 63, 5],
    blurb: "Lightweight full-zip windbreaker with an embroidered boatyard crest, for an exceedingly curious man." },
  "ironrod-anorak": { images: [{ src: "images/products/ironrod-anorak-1.jpg", label: "Men's" }, { src: "images/products/ironrod-anorak-2.jpg", label: "Women's" }, { src: "images/products/ironrod-anorak-3.jpg", label: "Close-up" }, { src: "images/products/ironrod-anorak-4.jpg", label: "Flat" }],
    name: "Iron Rod Trail Club Anorak", kind: "Anorak", color: "Navy", swatch: "#1E303F", price: { default: 9500, "2XL": 9800 }, ref: "1 Nephi 8:24", verse: ["1-ne", 8, 24],
    blurb: "Champion packable half-zip rain shell. A straight rod running to a tree, stitched on the chest." },
  "barge-tee": { images: [{ src: "images/products/barge-tee-1.jpg", label: "Back" }, { src: "images/products/barge-tee-2.jpg", label: "Front" }],
    name: "Jaredite Barge Works Tee", kind: "Tee", color: "Cream", swatch: "#F3EEE1", price: tee, ref: "Ether 2:17", verse: ["ether", 2, 17],
    blurb: "A patent drawing of the barge, holes in the top and bottom included. Tight like unto a dish." },
  "irreantum-tee": { images: [{ src: "images/products/irreantum-tee-1.jpg", label: "Back" }, { src: "images/products/irreantum-tee-2.jpg", label: "Front" }],
    name: "Irreantum Surf Club Tee", kind: "Tee", color: "Oatmeal", swatch: "#B7A99A", price: tee, ref: "1 Nephi 17:5", verse: ["1-ne", 17, 5],
    blurb: "An old surf shop sun over stacked waves, for the sea Lehi's family named many waters." },
  "deseret-crew": { images: [{ src: "images/products/deseret-crew-1.jpg", label: "Front" }, { src: "images/products/deseret-crew-2.jpg", label: "Women's" }, { src: "images/products/deseret-crew-3.jpg", label: "Folded" }, { src: "images/products/deseret-crew-4.jpg", label: "Back" }],
    name: "Deseret Apiary Crewneck", kind: "Crewneck", color: "Khaki", swatch: "#D2A26F", price: crew, ref: "Ether 2:3", verse: ["ether", 2, 3],
    blurb: "A honey label crewneck: a hexagon bee and the word's definition, straight from Ether." },
  "samuel-tee": { images: [{ src: "images/products/samuel-tee-1.jpg", label: "Back" }, { src: "images/products/samuel-tee-2.jpg", label: "Front" }],
    name: "Samuel's Wall Archery Club Tee", kind: "Tee", color: "Shadow", swatch: "#4A4748", price: tee, ref: "Helaman 16:2", verse: ["hel", 16, 2],
    blurb: "A target with every arrow around the outside. The club with a perfect record of missing." },
  "stones-tee": { images: [{ src: "images/products/stones-tee-1.jpg", label: "Front" }, { src: "images/products/stones-tee-2.jpg", label: "Back" }],
    name: "Sixteen Small Stones Tee", kind: "Tee", color: "Black", swatch: "#000000", price: tee, ref: "Ether 3:1", verse: ["ether", 3, 1],
    blurb: "Sixteen glowing stones in a grid, white and clear, even as transparent glass." },
  "curelom-cap": { images: [{ src: "images/products/curelom-cap-1.jpg", label: "Men's" }, { src: "images/products/curelom-cap-2.jpg", label: "Women's" }, { src: "images/products/curelom-cap-3.jpg", label: "Front" }, { src: "images/products/curelom-cap-4.jpg", label: "Back" }],
    name: "Cureloms & Cumoms Cap", kind: "Cap", color: "Khaki", swatch: "#B49771", price: { default: 3200 }, sizes: ONE, ref: "Ether 9:19", verse: ["ether", 9, 19],
    blurb: "The Wildlife Society on a dad cap, to wear with the Cureloms tee." },
  "stories-tee": { images: [{ src: "images/products/stories-tee-1.jpg", label: "Back" }, { src: "images/products/stories-tee-2.jpg", label: "Front" }],
    name: "Book of Mormon Stories Tee", kind: "Tee", color: "Cream", swatch: "#F3EEE1", price: tee, ref: "Twelve stories",
    blurb: "Twelve stories on the back, from Lehi's dream to the sixteen stones, each with its chapter." },
  "stories-hoodie": { images: [{ src: "images/products/stories-hoodie-1.jpg", label: "Back" }, { src: "images/products/stories-hoodie-2.jpg", label: "Front" }, { src: "images/products/stories-hoodie-3.jpg", label: "Women's" }, { src: "images/products/stories-hoodie-4.jpg", label: "Flat" }],
    name: "Book of Mormon Stories Hoodie", kind: "Hoodie", color: "Bone", swatch: "#F5E8CE", price: hoodie, ref: "Twelve stories",
    blurb: "The storybook back on a heavyweight hoodie, with a small Vol. I badge on the chest." },
  "lehi-tee": { images: [{ src: "images/products/lehi-tee-1.jpg", label: "Back" }, { src: "images/products/lehi-tee-2.jpg", label: "Front" }],
    name: "Lehi's Tent Co. Tee", kind: "Tee", color: "Mocha", swatch: "#77574C", price: tee, ref: "1 Nephi 2:15", verse: ["1-ne", 2, 15],
    blurb: "The shortest verse in the book, on a camp supply tee. Est. in the valley of Lemuel." },
  "liahona-crew": { images: [{ src: "images/products/liahona-crew-1.jpg", label: "Front" }, { src: "images/products/liahona-crew-2.jpg", label: "Women's" }, { src: "images/products/liahona-crew-3.jpg", label: "Folded" }, { src: "images/products/liahona-crew-4.jpg", label: "Back" }],
    name: "Curious Workmanship Crewneck", kind: "Crewneck", color: "Forest Green", swatch: "#335231", price: crew, ref: "1 Nephi 16:10", verse: ["1-ne", 16, 10],
    blurb: "A round ball of fine brass with its two spindles, in gold on forest green." },
  "barge-mug": { images: [{ src: "images/products/barge-mug-1.jpg", label: "Desk" }, { src: "images/products/barge-mug-2.jpg", label: "In hand" }, { src: "images/products/barge-mug-3.jpg", label: "Other side" }],
    name: "Jaredite Barge Works Mug", kind: "Mug", color: "White, 11 oz", swatch: "#FFFFFF", price: { default: 2000 }, sizes: ONE, ref: "Ether 2:17", verse: ["ether", 2, 17],
    blurb: "The barge drawing wrapped around a ceramic mug. Holds water like unto a dish." },
  "lehi-mug": { images: [{ src: "images/products/lehi-mug-1.jpg", label: "Outdoors" }, { src: "images/products/lehi-mug-2.jpg", label: "Women's" }, { src: "images/products/lehi-mug-3.jpg", label: "Other side" }],
    name: "Lehi's Tent Co. Camp Mug", kind: "Mug", color: "Enamel, 12 oz", swatch: "#FFFFFF", price: { default: 2600 }, sizes: ONE, ref: "1 Nephi 2:15", verse: ["1-ne", 2, 15],
    blurb: "An enamel camp mug for the man who dwelt in a tent. Hand wash only." },
};
export const LINE = Object.fromEntries(Object.entries(LINE_PIECES).map(([id, o]) => [id, piece(id, o)]));
// What the homepage needs to show the live pieces.
export const liveLine = () => Object.entries(LINE).filter(([, p]) => p.live).map(([id, p]) =>
  ({ id, name: p.name, kind: p.kind, color: p.color, swatch: p.swatch, price: p.price, sizes: p.sizes, images: p.images, ref: p.ref, refUrl: p.refUrl, blurb: p.blurb }));

export const PRODUCTS = {
  liberty: {
    name: "Title of Liberty Tee",
    color: "Shadow",
    image: "images/liberty-back-v3.jpg",
    // Printful variant IDs for the "Rent Coat Co." API store (Shaka Wear SHGDD "(Boxy)" products). Strings are Printful's external
    // variant IDs (shown as #6adb... on each product's page in Printful); numbers are sync variant IDs.
    // /api/printful-variants?key=YOUR_ADMIN_KEY lists both.
    variants: { S: "6adb8c541a39d5", M: "6adb8c541a39f3", L: "6adb8c541a3a06", XL: "6adb8c541a3a16", "2XL": "6adb8c541a3a31" },
  },
  stripling: {
    name: "Stripling 2000 Tee",
    color: "Black",
    image: "images/stripling-back-v3.jpg",
    variants: { S: "6adb8ce71d63e8", M: "6adb8ce71d6412", L: "6adb8ce71d6427", XL: "6adb8ce71d6446", "2XL": "6adb8ce71d6455" },
  },
  cureloms: {
    name: "Cureloms & Cumoms Tee",
    color: "Cream",
    image: "images/cureloms-back-v2.jpg",
    variants: { S: "6adb8dac24e0a4", M: "6adb8dac24e0e8", L: "6adb8dac24e0f7", XL: "6adb8dac24e113", "2XL": "6adb8dac24e135" },
  },
  ...LINE,
};

// The Printful store orders go to ("Rent Coat Co.", the Manual order / API store). Not a secret.
// The PRINTFUL_STORE_ID environment variable overrides it.
export const PRINTFUL_STORE_ID = "18950104";

// Regular prices, from the end of launch week on.
export const PRICE = { default: 4000, "2XL": 4300 };
// Launch-week prices: only between DROP.opens and DROP.closes.
export const LAUNCH_PRICE = { default: 3500, "2XL": 3800 };
export const SHIPPING = { amount: 599 };
export const shippingLabel = phase => phase === "launch"
  ? "Standard shipping (printed after launch week ends Nov 21)"
  : "Standard shipping";
export const SHIP_TO = ["US"];
export const MAX_ITEMS = 10;

// Drop 001 launch week: launch prices and preorders between these two times. After DROP.closes the shop
// stays open at regular prices and orders print right away. The website reads this from /api/config.
// Netlify environment variables DROP_OPENS and DROP_CLOSES override it without a code change (redeploy after changing them).
export const DROP = {
  opens: process.env.DROP_OPENS || "2026-11-14T10:00:00-05:00",
  closes: process.env.DROP_CLOSES || "2026-11-21T10:00:00-05:00",
};

// Checkout pauses on Sundays (Eastern time). Set CLOSED_SUNDAYS=off in Netlify to sell every day.
export const CLOSED_SUNDAYS = process.env.CLOSED_SUNDAYS !== "off";
const easternDay = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short" });
export const isSunday = (now = Date.now()) => easternDay.format(now) === "Sun";

const own = (obj, key) => typeof key === "string" && Object.hasOwn(obj, key);
export const isLaunch = (now = Date.now()) => now >= Date.parse(DROP.opens) && now < Date.parse(DROP.closes);
export const priceTable = (now = Date.now()) => isLaunch(now) ? LAUNCH_PRICE : PRICE;
export const unitPrice = (id, size, now = Date.now()) => {
  const table = PRODUCTS[id].price || priceTable(now);
  return own(table, size) ? table[size] : table.default;
};
// "OS" is Printful's one-size hats and beanies.
export const sizeLabel = size => size === "OS" ? "one size" : `size ${size}`;

// "before" launch week, "launch" during it, "open" after it (regular shop), or "sunday" (checkout paused).
export function storePhase(now = Date.now()) {
  if (now < Date.parse(DROP.opens)) return "before";
  if (CLOSED_SUNDAYS && isSunday(now)) return "sunday";
  return isLaunch(now) ? "launch" : "open";
}

// Cart lines travel through Stripe metadata as "liberty:M:1,stripling:L:2".
export const encodeItems = items => items.map(i => `${i.id}:${i.size}:${i.qty}`).join(",");
export const decodeItems = s => (s || "").split(",").filter(Boolean).map(part => {
  const [id, size, qty] = part.split(":");
  return { id, size, qty: Number(qty) };
});

// Validates a cart sent by the browser. Returns clean items or throws a message the shopper can read.
export function cleanCart(raw) {
  if (!Array.isArray(raw) || raw.length === 0) throw new Error("Your bag is empty.");
  const merged = new Map();
  for (const line of raw) {
    // Own-property checks only, so ids like "constructor" or "__proto__" can't slip through.
    if (!own(PRODUCTS, line?.id) || PRODUCTS[line.id].live === false || !own(PRODUCTS[line.id].variants, line.size)) {
      throw new Error("One of the items in your bag isn't available.");
    }
    const qty = Math.floor(Number(line.qty));
    if (!(qty >= 1 && qty <= MAX_ITEMS)) throw new Error("Quantity must be between 1 and 10.");
    const key = `${line.id}:${line.size}`;
    merged.set(key, { id: line.id, size: line.size, qty: (merged.get(key)?.qty || 0) + qty });
  }
  const items = [...merged.values()];
  if (items.reduce((n, i) => n + i.qty, 0) > MAX_ITEMS) throw new Error("You can order up to 10 items at a time.");
  return items;
}

// Stripe's API takes form-encoded nested params: a[b][0][c]=1
export function formEncode(obj, prefix = "", out = new URLSearchParams()) {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (typeof v === "object") formEncode(v, key, out);
    else out.append(key, String(v));
  }
  return out;
}

export const STRIPE_VERSION = "2024-06-20";

export async function stripe(path, { method = "GET", params } = {}) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      "Stripe-Version": STRIPE_VERSION,
      ...(params ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: params ? formEncode(params).toString() : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Stripe ${res.status}: ${data?.error?.message || "request failed"}`);
  return data;
}

export async function printful(path, { method = "GET", body } = {}) {
  const token = process.env.PRINTFUL_TOKEN;
  if (!token) throw new Error("PRINTFUL_TOKEN is not set");
  const res = await fetch(`https://api.printful.com/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-PF-Store-Id": process.env.PRINTFUL_STORE_ID || PRINTFUL_STORE_ID,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
