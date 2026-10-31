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
    // Colors of the same design share a group; the site shows one card per group with a color picker.
    group: o.group || id,
    variants: Object.fromEntries((o.sizes || APPAREL).map(size => [size, `rc-${id}-${size}`])),
  };
}
const LINE_PIECES = {
  "rent-hoodie": { images: [{ src: "images/products/rent-hoodie-1.jpg", label: "Front" }, { src: "images/products/rent-hoodie-6.jpg", label: "Back" }, { src: "images/products/rent-hoodie-7.jpg", label: "Flat" }, { src: "images/products/rent-hoodie-3.jpg", label: "Close-up" }],
    name: "Rent Coat Hoodie", kind: "Hoodie", color: "Black", swatch: "#080808", price: hoodie, ref: "Alma 46:12", verse: ["alma", 46, 12],
    blurb: "Heavyweight Cotton Heritage hoodie. A small gold flag on the chest and the whole title of liberty across the back." },
  "strait-joggers": { images: [{ src: "images/products/strait-joggers-1.jpg", label: "Close-up" }, { src: "images/products/strait-joggers-2.jpg", label: "Full look" }, { src: "images/products/strait-joggers-3.jpg", label: "Flat" }],
    name: "Strait & Narrow Joggers", kind: "Joggers", color: "Charcoal Heather", swatch: "#3A3A38", price: { default: 6200, "2XL": 6500 }, ref: "1 Nephi 8:20", verse: ["1-ne", 8, 20],
    blurb: "Fleece joggers with STRAIT & NARROW running up the left thigh. Made to go with any of the hoodies." },
  "flag-cap": { images: [{ src: "images/products/flag-cap-1.jpg", label: "Men's" }, { src: "images/products/flag-cap-2.jpg", label: "Women's" }, { src: "images/products/flag-cap-3.jpg", label: "Front" }, { src: "images/products/flag-cap-4.jpg", label: "Styled" }],
    name: "Rent Coat Dad Cap", kind: "Cap", color: "Spruce", swatch: "#183A31", price: { default: 3200 }, sizes: ONE, ref: "Alma 46:13", verse: ["alma", 46, 13],
    blurb: "Washed cotton dad cap with the torn flag stitched in old gold." },
  "flag-beanie": { images: [{ src: "images/products/flag-beanie-1.jpg", label: "Men's" }, { src: "images/products/flag-beanie-2.jpg", label: "Women's" }, { src: "images/products/flag-beanie-3.jpg", label: "Front" }, { src: "images/products/flag-beanie-4.jpg", label: "Styled" }],
    name: "Torn Flag Beanie", kind: "Beanie", color: "Red", swatch: "#B91616", price: { default: 2800 }, sizes: ONE, ref: "Alma 46:12", verse: ["alma", 46, 12],
    blurb: "Cuffed knit beanie in rent red with a white flag on the cuff." },
  "shelem-fleece": { images: [{ src: "images/products/shelem-fleece-1.jpg", label: "Front" }, { src: "images/products/shelem-fleece-2.jpg", label: "Back" }, { src: "images/products/shelem-fleece-3.jpg", label: "Side" }],
    name: "Mount Shelem Alpine Club Fleece", kind: "Fleece", color: "Black", swatch: "#151515", price: { default: 7800, "2XL": 8100 }, ref: "Ether 3:1", verse: ["ether", 3, 1],
    blurb: "Quarter-zip fleece with the club crest stitched on the chest. Named for the mount of exceeding height." },
  "hagoth-windbreaker": { images: [{ src: "images/products/hagoth-windbreaker-1.jpg", label: "Front" }, { src: "images/products/hagoth-windbreaker-2.jpg", label: "Back" }],
    name: "Hagoth Shipbuilding Co. Windbreaker", kind: "Windbreaker", color: "Forest Green", swatch: "#283D2C", price: { default: 8500, "2XL": 8800 }, ref: "Alma 63:5", verse: ["alma", 63, 5],
    blurb: "Lightweight full-zip windbreaker with an embroidered boatyard crest, for an exceedingly curious man." },
  "ironrod-anorak": { images: [{ src: "images/products/ironrod-anorak-1.jpg", label: "Men's" }, { src: "images/products/ironrod-anorak-2.jpg", label: "Women's" }, { src: "images/products/ironrod-anorak-3.jpg", label: "Close-up" }, { src: "images/products/ironrod-anorak-4.jpg", label: "Flat" }],
    name: "Iron Rod Trail Club Anorak", kind: "Anorak", color: "Navy", swatch: "#1E303F", price: { default: 9500, "2XL": 9800 }, ref: "1 Nephi 8:24", verse: ["1-ne", 8, 24],
    blurb: "Champion packable half-zip rain shell. A straight rod running to a tree, stitched on the chest." },
  "barge-tee": { images: [{ src: "images/products/barge-tee-2.jpg", label: "Front" }, { src: "images/products/barge-tee-1.jpg", label: "Back" }],
    name: "Jaredite Barge Works Tee", kind: "Tee", color: "Cream", swatch: "#F3EEE1", price: tee, ref: "Ether 2:17", verse: ["ether", 2, 17],
    blurb: "A patent drawing of the barge, holes in the top and bottom included. Tight like unto a dish." },
  "irreantum-tee": { images: [{ src: "images/products/irreantum-tee-2.jpg", label: "Front" }, { src: "images/products/irreantum-tee-1.jpg", label: "Back" }],
    name: "Irreantum Surf Club Tee", kind: "Tee", color: "Oatmeal", swatch: "#B7A99A", price: tee, ref: "1 Nephi 17:5", verse: ["1-ne", 17, 5],
    blurb: "An old surf shop sun over stacked waves, for the sea Lehi's family named many waters." },
  "samuel-tee": { images: [{ src: "images/products/samuel-tee-2.jpg", label: "Front" }, { src: "images/products/samuel-tee-1.jpg", label: "Back" }],
    name: "Samuel's Wall Archery Club Tee", kind: "Tee", color: "Shadow", swatch: "#4A4748", price: tee, ref: "Helaman 16:2", verse: ["hel", 16, 2],
    blurb: "A target with every arrow around the outside. The club with a perfect record of missing." },
  "curelom-cap": { images: [{ src: "images/products/curelom-cap-3.jpg", label: "Front" }, { src: "images/products/curelom-cap-4.jpg", label: "Back" }, { src: "images/products/curelom-cap-1.jpg", label: "Men's" }, { src: "images/products/curelom-cap-2.jpg", label: "Women's" }],
    name: "Cureloms & Cumoms Cap", kind: "Cap", color: "Khaki", swatch: "#B49771", price: { default: 3200 }, sizes: ONE, ref: "Ether 9:19", verse: ["ether", 9, 19],
    blurb: "The Wildlife Society on a dad cap, to wear with the Cureloms tee." },
  "stories-tee": { images: [{ src: "images/products/stories-tee-2.jpg", label: "Front" }, { src: "images/products/stories-tee-1.jpg", label: "Back" }],
    name: "Book of Mormon Stories Tee", kind: "Tee", color: "Cream", swatch: "#F3EEE1", price: tee, ref: "Twelve stories",
    blurb: "Twelve stories on the back, from Lehi's dream to the sixteen stones, each with its chapter." },
  "stories-hoodie": { images: [{ src: "images/products/stories-hoodie-2.jpg", label: "Front" }, { src: "images/products/stories-hoodie-1.jpg", label: "Back" }, { src: "images/products/stories-hoodie-3.jpg", label: "Women's" }, { src: "images/products/stories-hoodie-4.jpg", label: "Flat" }],
    name: "Book of Mormon Stories Hoodie", kind: "Hoodie", color: "Bone", swatch: "#F5E8CE", price: hoodie, ref: "Twelve stories",
    blurb: "The storybook back on a heavyweight hoodie, with a small Vol. I badge on the chest." },
  "lehi-tee": { images: [{ src: "images/products/lehi-tee-2.jpg", label: "Front" }, { src: "images/products/lehi-tee-1.jpg", label: "Back" }],
    name: "Lehi's Tent Co. Tee", kind: "Tee", color: "Mocha", swatch: "#77574C", price: tee, ref: "1 Nephi 2:15", verse: ["1-ne", 2, 15],
    blurb: "The shortest verse in the book, on a camp supply tee. Est. in the valley of Lemuel." },
  "barge-mug": { images: [{ src: "images/products/barge-mug-1.jpg", label: "Desk" }, { src: "images/products/barge-mug-2.jpg", label: "In hand" }, { src: "images/products/barge-mug-3.jpg", label: "Other side" }],
    name: "Jaredite Barge Works Mug", kind: "Mug", color: "White, 11 oz", swatch: "#FFFFFF", price: { default: 2000 }, sizes: ONE, ref: "Ether 2:17", verse: ["ether", 2, 17],
    blurb: "The barge drawing wrapped around a ceramic mug. Holds water like unto a dish." },
  "lehi-mug": { images: [{ src: "images/products/lehi-mug-1.jpg", label: "Outdoors" }, { src: "images/products/lehi-mug-2.jpg", label: "Women's" }, { src: "images/products/lehi-mug-3.jpg", label: "Other side" }],
    name: "Lehi's Tent Co. Camp Mug", kind: "Mug", color: "Enamel, 12 oz", swatch: "#FFFFFF", price: { default: 2600 }, sizes: ONE, ref: "1 Nephi 2:15", verse: ["1-ne", 2, 15],
    blurb: "An enamel camp mug for the man who dwelt in a tent. Hand wash only." },
};
// Big backs: one bold illustration and the verse set big, each as a hoodie and a tee.
const BIG = [
  ["stripling", "Stripling 2000", ["Bone", "#F5E8CE"], ["Cream", "#F3EEE1"], "Alma 56:48", ["alma", 56, 48], "Two thousand young warriors marching under a big red 2000, and the words of their mothers."],
  ["shelem", "Mount Shelem", ["Navy Blazer", "#171F2C"], ["Black", "#000000"], "Ether 3:4", ["ether", 3, 4], "Sixteen stones shining above the peak, and the brother of Jared's prayer."],
  ["tree", "Tree of Life", ["Forest Green", "#335231"], ["Shadow", "#4A4748"], "1 Nephi 8:10", ["1-ne", 8, 10], "Lehi's tree, its white fruit and the rod of iron leading to it."],
  ["samuel", "Samuel on the Wall", ["Charcoal Heather", "#463E3D"], ["Shadow", "#4A4748"], "Helaman 16:2", ["hel", 16, 2], "Samuel on the city wall, arms raised, while every arrow misses."],
  ["ship", "Nephi's Ship", ["Bone", "#F5E8CE"], ["Oatmeal", "#B7A99A"], "1 Nephi 17:8", ["1-ne", 17, 8], "Nephi's ship on the waves under a red halftone sun."],
  ["liahona", "The Liahona", ["Maroon", "#7D263A"], ["Black", "#000000"], "1 Nephi 16:29", ["1-ne", 16, 29], "The brass ball with its two spindles. By small means, great things."],
];
// Photos come from Printful (Front first, then Back), numbered images/products/<id>-<n>.jpg.
const views = (id, labels) => labels.map((label, i) => ({ src: `images/products/${id}-${i + 1}.jpg`, label }));
for (const [k, name, [hc, hs], [tc, ts], ref, verse, blurb] of BIG) {
  const h = `${k}-hoodie`, tid = k === "samuel" ? "samuel-wall-tee" : `${k}-tee`;
  LINE_PIECES[h] = { name: `${name} Hoodie`, kind: "Hoodie", color: hc, swatch: hs, price: hoodie, ref, verse, blurb, images: views(h, ["Front", "Back", "Women's", "Flat"]) };
  LINE_PIECES[tid] = { name: `${name} Tee`, kind: "Tee", color: tc, swatch: ts, price: tee, ref, verse, blurb, images: views(tid, ["Front", "Back"]) };
}
// Printful returned the rebuilt Stripling hoodie's photos in a different order.
LINE_PIECES["stripling-hoodie"].images = [{ src: "images/products/stripling-hoodie-4.jpg", label: "Front" }, { src: "images/products/stripling-hoodie-1.jpg", label: "Back" }, { src: "images/products/stripling-hoodie-5.jpg", label: "Flat" }, { src: "images/products/stripling-hoodie-3.jpg", label: "Close-up" }];
// Type tees: a chest line and a verse set big across the back (art in scripts/printful/art-type.mjs).
const TYPE = [
  ["jesus-king-tee", "Jesus Is King Tee", "Black", "#000000", "2 Nephi 10:14", ["2-ne", 10, 14], "Jesus is King across the chest, and the king of heaven set big across the shoulders."],
  ["jesus-king-cream-tee", "Jesus Is King Tee", "Cream", "#F3EEE1", "2 Nephi 10:14", ["2-ne", 10, 14], "Jesus is King across the chest, and the king of heaven set big across the shoulders."],
  ["talk-christ-tee", "We Talk of Christ Tee", "Cream", "#F3EEE1", "2 Nephi 25:26", ["2-ne", 25, 26], "Nephi's four lines about Christ, stacked big across the back."],
  ["sure-foundation-tee", "Sure Foundation Tee", "Shadow", "#4A4748", "Helaman 5:12", ["hel", 5, 12], "Upon the rock of our Redeemer, in big gold and bone type across the back."],
  ["light-life-tee", "Light and Life Tee", "Black", "#000000", "3 Nephi 11:11", ["3-ne", 11, 11], "The Savior's words at Bountiful: I am the light and the life of the world."],
  ["come-unto-tee", "Come Unto Christ Tee", "Oatmeal", "#B7A99A", "Moroni 10:32", ["moro", 10, 32], "Moroni's last invitation, set big across the back."],
  ["seek-jesus-tee", "Seek This Jesus Tee", "Oatmeal", "#B7A99A", "Ether 12:41", ["ether", 12, 41], "Moroni's counsel to seek this Jesus, across the shoulders."],
  ["none-other-tee", "None Other Name Tee", "Black", "#000000", "2 Nephi 25:20", ["2-ne", 25, 20], "There is none other name given under heaven, in five bold lines."],
  ["press-forward-tee", "Press Forward Tee", "Cream", "#F3EEE1", "2 Nephi 31:20", ["2-ne", 31, 20], "Press forward with a steadfastness in Christ, big across the back."],
  ["son-of-god-tee", "Thou Son of God Tee", "Black", "#000000", "Alma 36:18", ["alma", 36, 18], "Alma's prayer at the turning point of his life."],
  ["hosanna-tee", "Hosanna Tee", "Oatmeal", "#B7A99A", "3 Nephi 11:17", ["3-ne", 11, 17], "The multitude's cry at Bountiful, big across the back."],
  ["king-earth-tee", "King of All the Earth Tee", "Shadow", "#4A4748", "Alma 5:50", ["alma", 5, 50], "Behold the glory of the King of all the earth, in gold and bone."],
];
for (const [id, name, color, swatch, ref, verse, blurb] of TYPE)
  LINE_PIECES[id] = { name, kind: "Tee", color, swatch, price: tee, ref, verse, blurb, images: views(id, ["Front", "Back"]) };
// Extra colors: the same art on another color of the same blank, picked so the ink still reads well (light ink on
// dark shirts, dark ink on light ones). Each color is its own piece with its own Printful product; `group` ties it
// to the base piece. [base piece, new piece, color, swatch]
const COLORS = [
  ["jesus-king-tee", "jesus-king-cream-tee", null, null], ["jesus-king-tee", "jesus-king-shadow-tee", "Shadow", "#4A4748"],
  ["talk-christ-tee", "talk-christ-oatmeal-tee", "Oatmeal", "#B7A99A"], ["sure-foundation-tee", "sure-foundation-black-tee", "Black", "#000000"],
  ["light-life-tee", "light-life-shadow-tee", "Shadow", "#4A4748"], ["come-unto-tee", "come-unto-cream-tee", "Cream", "#F3EEE1"],
  ["seek-jesus-tee", "seek-jesus-cream-tee", "Cream", "#F3EEE1"], ["none-other-tee", "none-other-shadow-tee", "Shadow", "#4A4748"],
  ["press-forward-tee", "press-forward-oatmeal-tee", "Oatmeal", "#B7A99A"], ["son-of-god-tee", "son-of-god-shadow-tee", "Shadow", "#4A4748"],
  ["hosanna-tee", "hosanna-cream-tee", "Cream", "#F3EEE1"], ["king-earth-tee", "king-earth-black-tee", "Black", "#000000"],
  ["stripling-tee", "stripling-oatmeal-tee", "Oatmeal", "#B7A99A"], ["shelem-tee", "shelem-shadow-tee", "Shadow", "#4A4748"],
  ["tree-tee", "tree-black-tee", "Black", "#000000"], ["samuel-wall-tee", "samuel-wall-black-tee", "Black", "#000000"],
  ["ship-tee", "ship-cream-tee", "Cream", "#F3EEE1"], ["liahona-tee", "liahona-shadow-tee", "Shadow", "#4A4748"],
  ["barge-tee", "barge-oatmeal-tee", "Oatmeal", "#B7A99A"], ["irreantum-tee", "irreantum-cream-tee", "Cream", "#F3EEE1"],
  ["samuel-tee", "samuel-black-tee", "Black", "#000000"], ["stories-tee", "stories-oatmeal-tee", "Oatmeal", "#B7A99A"],
  ["lehi-tee", "lehi-black-tee", "Black", "#000000"],
  ["rent-hoodie", "rent-navy-hoodie", "Navy Blazer", "#171F2C"], ["shelem-hoodie", "shelem-black-hoodie", "Black", "#080808"],
  ["tree-hoodie", "tree-black-hoodie", "Black", "#080808"], ["samuel-hoodie", "samuel-black-hoodie", "Black", "#080808"],
  ["liahona-hoodie", "liahona-black-hoodie", "Black", "#080808"],
];
// Printful's default photos: a tee's first two are front and back; a hoodie's back comes 6th, after four front views.
const shots = id => id.endsWith("-hoodie") ? [{ src: `images/products/${id}-1.jpg`, label: "Front" }, { src: `images/products/${id}-6.jpg`, label: "Back" }] : views(id, ["Front", "Back"]);
// A null color means the piece already exists and only joins the group.
for (const [base, id, color, swatch] of COLORS)
  LINE_PIECES[id] = color ? { ...LINE_PIECES[base], group: base, color, swatch, images: shots(id) } : { ...LINE_PIECES[id], group: base };
export const LINE = Object.fromEntries(Object.entries(LINE_PIECES).map(([id, o]) => [id, piece(id, o)]));
// What the homepage needs to show the live pieces.
export const liveLine = () => Object.entries(LINE).filter(([, p]) => p.live).map(([id, p]) =>
  ({ id, group: p.group, name: p.name, kind: p.kind, color: p.color, swatch: p.swatch, price: p.price, sizes: p.sizes, images: p.images, ref: p.ref, refUrl: p.refUrl, blurb: p.blurb }));

export const PRODUCTS = {
  liberty: {
    name: "Title of Liberty Tee",
    color: "Shadow",
    image: "images/liberty-back-v3.jpg",
    group: "liberty", swatch: "#4A4A47",
    images: [{ src: "images/liberty-front.jpg", label: "Front" }, { src: "images/liberty-back-v3.jpg", label: "Back" }],
    // Printful variant IDs for the "Rent Coat Co." API store (Shaka Wear SHGDD "(Boxy)" products). Strings are Printful's external
    // variant IDs (shown as #6adb... on each product's page in Printful); numbers are sync variant IDs.
    // /api/printful-variants?key=YOUR_ADMIN_KEY lists both.
    variants: { S: "6adb8c541a39d5", M: "6adb8c541a39f3", L: "6adb8c541a3a06", XL: "6adb8c541a3a16", "2XL": "6adb8c541a3a31" },
  },
  stripling: {
    name: "Stripling 2000 Tee",
    color: "Black",
    image: "images/stripling-back-v3.jpg",
    group: "stripling", swatch: "#1B1B1B",
    images: [{ src: "images/stripling-front-v3.jpg", label: "Front" }, { src: "images/stripling-back-v3.jpg", label: "Back" }],
    variants: { S: "6adb8ce71d63e8", M: "6adb8ce71d6412", L: "6adb8ce71d6427", XL: "6adb8ce71d6446", "2XL": "6adb8ce71d6455" },
  },
  cureloms: {
    name: "Cureloms & Cumoms Tee",
    color: "Cream",
    image: "images/cureloms-back-v2.jpg",
    group: "cureloms", swatch: "#EFEAD8",
    images: [{ src: "images/cureloms-front.jpg", label: "Front" }, { src: "images/cureloms-back-v2.jpg", label: "Back" }],
    variants: { S: "6adb8dac24e0a4", M: "6adb8dac24e0e8", L: "6adb8dac24e0f7", XL: "6adb8dac24e113", "2XL": "6adb8dac24e135" },
  },
  ...LINE,
};
// The Drop 001 tees and their colors, for the homepage's color picker (every color in a group shares one card).
export const dropTees = () => Object.entries(PRODUCTS).filter(([id]) => !LINE[id]).map(([id, p]) =>
  ({ id, group: p.group || id, name: p.name, color: p.color, swatch: p.swatch, images: p.images }));

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
