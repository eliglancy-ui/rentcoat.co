// Shared store settings for the Rent Coat Co. checkout and order functions.
// Prices are in cents. Edit here, then redeploy.

export const PRODUCTS = {
  liberty: {
    name: "Title of Liberty Tee",
    color: "Shadow",
    image: "images/liberty-back-v2.jpg",
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
};

// The Printful store orders go to ("Rent Coat Co.", the Manual order / API store). Not a secret.
// The PRINTFUL_STORE_ID environment variable overrides it.
export const PRINTFUL_STORE_ID = "18950104";

export const PRICE = { default: 4000, "2XL": 4300 };
export const SHIPPING = { amount: 599, label: "Standard shipping (ships after the preorder closes)" };
export const SHIP_TO = ["US"];
export const MAX_ITEMS = 10;

// The 7-day preorder window. This is the one place to change it: the website reads it from /api/config.
// Netlify environment variables DROP_OPENS and DROP_CLOSES override it without a code change (redeploy after changing them).
export const DROP = {
  opens: process.env.DROP_OPENS || "2026-11-14T10:00:00-05:00",
  closes: process.env.DROP_CLOSES || "2026-11-21T10:00:00-05:00",
};

// Checkout pauses on Sundays (Eastern time) while a drop is open. Set CLOSED_SUNDAYS=off in Netlify to sell every day.
export const CLOSED_SUNDAYS = process.env.CLOSED_SUNDAYS !== "off";
const easternDay = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short" });
export const isSunday = (now = Date.now()) => easternDay.format(now) === "Sun";

const own = (obj, key) => typeof key === "string" && Object.hasOwn(obj, key);
export const unitPrice = size => own(PRICE, size) ? PRICE[size] : PRICE.default;

export function dropPhase(now = Date.now()) {
  if (now < Date.parse(DROP.opens)) return "before";
  if (now < Date.parse(DROP.closes)) return CLOSED_SUNDAYS && isSunday(now) ? "sunday" : "live";
  return "closed";
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
    if (!own(PRODUCTS, line?.id) || !own(PRODUCTS[line.id].variants, line.size)) {
      throw new Error("One of the shirts in your bag isn't available.");
    }
    const qty = Math.floor(Number(line.qty));
    if (!(qty >= 1 && qty <= MAX_ITEMS)) throw new Error("Quantity must be between 1 and 10.");
    const key = `${line.id}:${line.size}`;
    merged.set(key, { id: line.id, size: line.size, qty: (merged.get(key)?.qty || 0) + qty });
  }
  const items = [...merged.values()];
  if (items.reduce((n, i) => n + i.qty, 0) > MAX_ITEMS) throw new Error("You can order up to 10 shirts at a time.");
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
