// Rent Coat HQ: the private back office at rentcoat.co/hq. Every route needs the x-hq-key header to equal ADMIN_KEY.
//   GET  /api/hq/overview              sales today / 7 days / 30 days, what's left to place, the post queue, visits
//   GET  /api/hq/orders?days=30        paid orders, newest first, with the Tapstitch pieces to place by hand
//   POST /api/hq/orders/:id/placed     { placed: true|false }   tick a Tapstitch order off
//   GET  /api/hq/queue                 posts waiting for approval, approved, posted
//   POST /api/hq/queue                 { account, title, caption, media, when }   add a post
//   POST /api/hq/queue/:id             { status | caption | when | delete }        approve, edit, mark posted, remove
//   POST /api/hq/queue/:id/publish     post an approved reel to Instagram (needs IG_*_USER_ID and IG_*_TOKEN)
//   GET  /api/hq/products              what's live on the site
//   POST /api/hq/mo                    { messages }  one turn of Mo, the HQ assistant (tools: snapshot, draft posts, list posts)
//   POST /api/hq/queue/:id/facebook    post an approved Rent Coat post to the Facebook Page (META_PAGE_ID, META_PAGE_TOKEN)
//   POST /api/hq/queue/:id/tiktok      send an approved Rent Coat post to TikTok drafts (TIKTOK_CLIENT_KEY, _SECRET, _REFRESH_TOKEN)
//   POST /api/hq/chat                  { messages }  ask Rent Coat's assistant (needs ANTHROPIC_API_KEY)
//   POST /api/hq/draft                 { account, idea, product }  Claude writes the image prompt, headline and caption with hashtags
//   POST /api/hq/image                 { prompt }    make an image with Cloudflare Workers AI (needs CF_ACCOUNT_ID, CF_AI_TOKEN)
//   POST /api/hq/upload                { image }     save a JPEG data URL from HQ's post maker
//   Images are served publicly at /api/media/<id>.jpg (netlify/functions/media.mjs) so Instagram can fetch them.
// Nothing is posted, sent or changed outside this site without an explicit tap in HQ.
import crypto from "node:crypto";
import { getStore } from "@netlify/blobs";
import Anthropic from "@anthropic-ai/sdk";
import { PRODUCTS, liveLine, decodeItems, stripe, json } from "../lib/store.mjs";
import { hydrate, setVault, getAccounts, setAccounts, makeState, PASTE_KEYS, tokenFor } from "../lib/vault.mjs";

const sameKey = (a, b) => crypto.timingSafeEqual(
  crypto.createHash("sha256").update(String(a)).digest(),
  crypto.createHash("sha256").update(String(b)).digest());
const day = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" });
const ACCOUNTS = { rentcoat: "@rentcoat.co", mission: "@whatisanldsmission" };
const GRAPH = `https://graph.facebook.com/${process.env.IG_GRAPH_VERSION || "v21.0"}`;
const store = () => getStore("hq");

// What a sale costs, so HQ shows what Eli keeps. Card fee 2.9% + 30c, Stripe Tax 0.5%, made-to-order cost per piece.
const COST = { tee: 1397, hoodie: 2888, sweats: 2198, set: 5086, cap: 1500, sticker: 254 }; // cents: Tapstitch tee (RU0014), hoodie and sweats (Nov 14 invoices)
const SHIP_COST = 900; // rough cost to ship one order to the customer
const pieceCost = id => {
  const p = PRODUCTS[id]; if (!p) return 0;
  return { Tee: COST.tee, Hoodie: COST.hoodie, Sweats: COST.sweats, Set: COST.set, Cap: COST.cap, Sticker: COST.sticker }[p.kind] ?? COST.tee;
};
const feeOf = total => Math.round(total * 0.034) + 30;

async function sessions(days) {
  const since = Math.floor(Date.now() / 1000) - days * 86400;
  const out = [];
  let after = "";
  for (let page = 0; page < 5; page++) {
    const r = await stripe(`checkout/sessions?status=complete&limit=100&created[gte]=${since}${after ? `&starting_after=${after}` : ""}`);
    out.push(...r.data.filter(s => s.payment_status === "paid"));
    if (!r.has_more) break;
    after = r.data[r.data.length - 1].id;
  }
  return out;
}

function orderView(s, placed) {
  const items = decodeItems(s.metadata?.items).map(i => ({ id: i.id, size: i.size, qty: i.qty, name: PRODUCTS[i.id]?.name || i.id,
    maker: PRODUCTS[i.id]?.maker || "printful", image: PRODUCTS[i.id]?.image }));
  const ship = s.shipping_details || {}, a = ship.address || {};
  const cost = items.reduce((n, i) => n + pieceCost(i.id) * i.qty, 0);
  const total = s.amount_total || 0, tax = s.total_details?.amount_tax || 0;
  return {
    id: s.id, created: s.created * 1000, total, tax, shipping: s.total_details?.amount_shipping || 0,
    name: ship.name || s.customer_details?.name || "", email: s.customer_details?.email || "",
    address: [a.line1, a.line2, `${a.city || ""}, ${a.state || ""} ${a.postal_code || ""}`.trim(), a.country].filter(Boolean),
    items, tapstitch: items.filter(i => i.maker === "tapstitch"), placed: placed[s.id] || null,
    keep: total - tax - feeOf(total) - cost - SHIP_COST, // about: shipping and cap cost are estimates
    foundUs: s.custom_fields?.find(f => f.key === "found_us")?.dropdown?.value || null,
  };
}

// Claude adds new posts by committing them to public/hq/seed.json (no HQ password needed). Each visit pulls in any
// post whose id HQ hasn't seen yet; posts Eli removed stay removed.
async function queue(req) {
  const q = (await store().get("queue", { type: "json" })) || [];
  const seen = new Set((await store().get("seen", { type: "json" })) || q.map(p => p.id));
  let feed = [];
  try { feed = await (await fetch(new URL("/hq/seed.json", req.url), { cache: "no-store" })).json(); } catch {}
  const fresh = feed.filter(p => p?.id && !seen.has(p.id));
  if (fresh.length || !(await store().get("seen"))) {
    fresh.forEach(p => seen.add(p.id));
    q.unshift(...fresh);
    await store().setJSON("queue", q);
    await store().setJSON("seen", [...seen]);
  }
  return q;
}

// Saves a file (jpg, mp4, webm) in Blobs and returns its public URL.
async function saveImage(bytes, origin, ext = "jpg") {
  const id = `${crypto.randomUUID()}.${ext}`;
  await getStore("hq-media").set(id, bytes);
  return `${origin}/api/media/${id}`;
}

const mediaOf = (post, kind) => (post.media || []).find(m => kind === "video" ? /\.(mp4|webm)($|\?)/i.test(m) : /\.jpe?g($|\?)/i.test(m));

// Facebook Page: one call, photo or video by URL.
async function fbPublish(post) {
  const id = process.env.META_PAGE_ID, token = process.env.META_PAGE_TOKEN;
  if (!id || !token) throw new Error("Facebook isn't connected yet. See Setup.");
  if (post.account !== "rentcoat") throw new Error("@whatisanldsmission stays Instagram only.");
  const video = mediaOf(post, "video"), image = mediaOf(post, "image");
  if (!video && !image) throw new Error("This post has no image or video.");
  const r = await fetch(`${GRAPH}/${id}/${video ? "videos" : "photos"}`, { method: "POST", body: new URLSearchParams(video
    ? { file_url: video, description: post.caption || "", access_token: token }
    : { url: image, caption: post.caption || "", access_token: token }) });
  const d = await r.json();
  if (!r.ok || !(d.post_id || d.id)) throw new Error(`Facebook: ${d.error?.message || r.status}`);
  return d.post_id || d.id;
}

// TikTok: sends the post to Eli's TikTok inbox as a draft; he finishes it in the app. Access tokens last a day, so
// each call trades the long-lived refresh token for a fresh one.
async function tiktokPublish(post) {
  const key = process.env.TIKTOK_CLIENT_KEY, secret = process.env.TIKTOK_CLIENT_SECRET, refresh = process.env.TIKTOK_REFRESH_TOKEN;
  if (!key || !secret || !refresh) throw new Error("TikTok isn't connected yet. See Setup.");
  if (post.account !== "rentcoat") throw new Error("@whatisanldsmission stays Instagram only.");
  const t = await (await fetch("https://open.tiktokapis.com/v2/oauth/token/", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_key: key, client_secret: secret, grant_type: "refresh_token", refresh_token: refresh }) })).json();
  if (!t.access_token) throw new Error(`TikTok login: ${t.error_description || t.error || "failed"}`);
  if (t.refresh_token && t.refresh_token !== refresh) await setVault({ TIKTOK_REFRESH_TOKEN: t.refresh_token });
  const video = mediaOf(post, "video"), image = mediaOf(post, "image");
  const [path, body] = video
    ? ["post/publish/inbox/video/init/", { source_info: { source: "PULL_FROM_URL", video_url: video } }]
    : ["post/publish/content/init/", { post_info: { title: (post.title || "").slice(0, 90), description: post.caption || "" }, source_info: { source: "PULL_FROM_URL", photo_cover_index: 0, photo_images: [image] }, post_mode: "MEDIA_UPLOAD", media_type: "PHOTO" }];
  if (!video && !image) throw new Error("This post has no image or video.");
  const r = await fetch(`https://open.tiktokapis.com/v2/${path}`, { method: "POST", headers: { authorization: `Bearer ${t.access_token}`, "content-type": "application/json; charset=UTF-8" }, body: JSON.stringify(body) });
  const d = await r.json();
  if (d.error?.code !== "ok") throw new Error(`TikTok: ${d.error?.message || d.error?.code || r.status}`);
  return d.data?.publish_id;
}

// Meta ads, read only: last 7 days for the ad account.
async function adsInsights() {
  const acct = process.env.META_AD_ACCOUNT_ID, token = process.env.META_ADS_TOKEN || process.env.META_PAGE_TOKEN;
  if (!acct || !token) return null;
  const r = await fetch(`${GRAPH}/act_${acct.replace(/^act_/, "")}/insights?fields=spend,impressions,reach,clicks,ctr,cpc&date_preset=last_7d&access_token=${token}`);
  const d = await r.json().catch(() => ({}));
  if (!r.ok) return { error: d.error?.message || String(r.status) };
  return d.data?.[0] || { spend: "0", impressions: "0", clicks: "0" };
}

// ---- Email (Resend). Marketing emails need a postal address in the footer (CAN-SPAM): MAIL_ADDRESS in Setup.
// Resend only sends from the verified domain, so "From" is always something@rentcoat.co. Whatever was typed in Setup
// ("hello", "hello@rentcoat.co", "Rent Coat <hello@rentcoat.co>", or a Gmail address by mistake) becomes a valid sender.
const SEND_DOMAIN = () => process.env.EMAIL_DOMAIN || "rentcoat.co";
const isEmail = e => /^[^@\s<>"]+@[^@\s<>"]+\.[^@\s<>"]+$/.test(e);
function fromAddress() {
  const raw = String(process.env.EMAIL_FROM || "").trim();
  const addr = (raw.match(/<([^>]+)>/)?.[1] || raw).trim().toLowerCase();
  let local = "hello";
  if (isEmail(addr) && addr.endsWith(`@${SEND_DOMAIN()}`)) local = addr.split("@")[0];
  else if (/^[a-z0-9._+-]+$/.test(addr)) local = addr;
  return `Rent Coat Co. <${local}@${SEND_DOMAIN()}>`;
}
const replyTo = () => { const r = String(process.env.EMAIL_REPLY_TO || "").trim(); return isEmail(r) ? r : "rentcoat.co@gmail.com"; };
const suppressed = async () => new Set((await store().get("suppress", { type: "json" })) || []);
async function sendEmail(list, subject, text, marketing) {
  if (!process.env.RESEND_API_KEY) throw new Error("Email isn't connected yet. See Setup.");
  if (marketing) { const stop = await suppressed(); list = list.filter(e => !stop.has(String(e).toLowerCase())); }
  if (!list.length) return 0;
  if (marketing && !process.env.MAIL_ADDRESS) throw new Error("Add a mailing address (a PO box is fine) in Setup first. The law requires it on marketing emails.");
  const from = fromAddress();
  const foot = `\n\n--\nRent Coat Co. · rentcoat.co${process.env.MAIL_ADDRESS ? ` · ${process.env.MAIL_ADDRESS}` : ""}${marketing ? "\nReply STOP and we'll take you off the list." : ""}`;
  const items = list.map(to => ({ from, to: [to], subject, text: text + foot, reply_to: replyTo() }));
  let sent = 0;
  for (let i = 0; i < items.length; i += 100) {
    const r = await fetch("https://api.resend.com/emails/batch", { method: "POST", headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json" }, body: JSON.stringify(items.slice(i, i + 100)) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`Email: ${d.message || r.status}${sent ? ` (after ${sent} sent)` : ""}`);
    sent += Math.min(100, items.length - i);
  }
  return sent;
}
const sentStore = async () => (await store().get("sent", { type: "json" })) || {};
const markSent = async (k) => { const m = await sentStore(); m[k] = Date.now(); await store().setJSON("sent", m); };

// Reminder signups from the Netlify "reminders" form (needs NETLIFY_TOKEN).
async function reminderList() {
  if (!process.env.NETLIFY_TOKEN) return { error: "Add a Netlify access token in Setup to read your reminder list." };
  const site = process.env.SITE_ID || "fa3fb2fb-3241-459b-8274-271f944a136a", h = { authorization: `Bearer ${process.env.NETLIFY_TOKEN}` };
  const forms = await (await fetch(`https://api.netlify.com/api/v1/sites/${site}/forms`, { headers: h })).json();
  const f = Array.isArray(forms) && forms.find(x => x.name === "reminders");
  if (!f) return { error: "No “reminders” form found on the site." };
  const emails = new Set();
  for (let page = 1; page < 20; page++) {
    const subs = await (await fetch(`https://api.netlify.com/api/v1/forms/${f.id}/submissions?per_page=100&page=${page}`, { headers: h })).json();
    if (!Array.isArray(subs) || !subs.length) break;
    subs.forEach(x => { const e = String(x.data?.email || x.email || "").trim().toLowerCase(); if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) emails.add(e); });
    if (subs.length < 100) break;
  }
  return { emails: [...emails] };
}

// Checkouts that expired with an email (last 7 days). Only those who opted in to promotions can be emailed.
async function abandoned() {
  const since = Math.floor(Date.now() / 1000) - 7 * 86400;
  const d = await stripe(`checkout/sessions?status=expired&limit=100&created[gte]=${since}`);
  const bought = new Set((await sessions(7).catch(() => [])).map(x => String(x.customer_details?.email || "").toLowerCase()).filter(Boolean));
  return (d.data || []).filter(x => x.customer_details?.email && !bought.has(x.customer_details.email.toLowerCase())).map(x => ({
    id: x.id, email: x.customer_details.email, name: x.customer_details.name || "", created: x.created * 1000, amount: x.amount_total,
    items: decodeItems(x.metadata?.items).map(i => `${i.qty || 1} × ${PRODUCTS[i.id]?.name || i.id} (${i.size})`),
    recovery: x.after_expiration?.recovery?.url || null, optedIn: x.consent?.promotions === "opt_in",
  }));
}

// Referral codes: one shared 10%-off-once coupon, a promotion code per buyer.
async function referralCode(name) {
  const ck = `refCoupon-${String(process.env.STRIPE_SECRET_KEY || "").startsWith("sk_live") ? "live" : "test"}`;
  let coupon = await store().get(ck);
  if (!coupon) { coupon = (await stripe("coupons", { method: "POST", params: { percent_off: 10, duration: "once", name: "Friend of a Rent Coat customer" } })).id; await store().set(ck, coupon); }
  const base = (String(name || "FRIEND").split(" ")[0].toUpperCase().replace(/[^A-Z]/g, "") || "FRIEND").slice(0, 10);
  for (let i = 0; i < 4; i++) {
    const code = `${base}${Math.floor(i < 2 ? 10 + Math.random() * 90 : 100 + Math.random() * 900)}`;
    try { await stripe("promotion_codes", { method: "POST", params: { coupon, code, max_redemptions: 25, restrictions: { first_time_transaction: true } } }); return code; }
    catch (e) { if (!/already|exists|in use/i.test(e.message)) throw e; }
  }
  throw new Error("Couldn't make a unique code. Try again.");
}

// AI video (fal.ai). Each clip costs real money, so there's a monthly cap (FAL_MONTHLY_CAP, default $10).
const VIDEO_MODEL = () => process.env.FAL_VIDEO_MODEL || "fal-ai/kling-video/v2.5-turbo/pro/image-to-video";
const VIDEO_COST = 0.35;
// "On a model" photos, two steps: the free image maker draws a person in a plain garment in Eli's scene, then FASHN
// virtual try-on (fal) dresses that person in the real product photo, keeping the print. About $0.075 each (estimate).
const TRYON_MODEL = () => process.env.FAL_TRYON_MODEL || "fal-ai/fashn/tryon/v1.6";
const TRYON_COST = 0.075;
const videoCap = () => { const c = parseFloat(String(process.env.FAL_MONTHLY_CAP || "").replace(/[^0-9.]/g, "")); return Number.isFinite(c) && c >= 0 ? c : 10; }; // about $0.07/s for a 5-second Kling 2.5 Turbo Pro clip (estimate; check fal.ai/pricing)
async function videoSpend(add = 0) {
  const k = `falspend-${new Date().toISOString().slice(0, 7)}`;
  const v = Number(await store().get(k)) || 0;
  if (add) await store().set(k, String(v + add));
  return v + add;
}

async function snapshot(req) {
  const placed = (await store().get("placed", { type: "json" })) || {};
  const all = (await sessions(30).catch(() => [])).map(s => orderView(s, placed));
  const weekAgo = Date.now() - 7 * 864e5, wk = all.filter(o => o.created >= weekAgo);
  const q = await queue(req);
  return {
    last7days: { orders: wk.length, sales: wk.reduce((n, o) => n + o.total, 0) / 100 },
    last30days: { orders: all.length, sales: all.reduce((n, o) => n + o.total, 0) / 100 },
    tapstitchOrdersToPlace: all.filter(o => o.tapstitch.length && !o.placed).length,
    posts: { waitingForReview: q.filter(p => p.status === "review").length, approved: q.filter(p => p.status === "approved").length, posted: q.filter(p => p.status === "posted").length },
    liveProducts: liveLine().map(p => `${p.name} $${(p.price.default / 100).toFixed(0)}`),
    connected: { instagramRentcoat: Boolean(process.env.IG_RENTCOAT_TOKEN), instagramMission: Boolean(process.env.IG_MISSION_TOKEN), facebook: Boolean(process.env.META_PAGE_TOKEN), tiktok: Boolean(process.env.TIKTOK_REFRESH_TOKEN), images: Boolean(process.env.CF_AI_TOKEN) },
  };
}

async function makeImage(prompt, origin) {
  if (!process.env.CF_ACCOUNT_ID || !process.env.CF_AI_TOKEN) throw new Error("Image maker isn't connected yet. See Setup.");
  const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT_ID}/ai/run/@cf/black-forest-labs/flux-1-schnell`, {
    method: "POST", headers: { authorization: `Bearer ${process.env.CF_AI_TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify({ prompt: String(prompt).slice(0, 2000), steps: 8 }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.result?.image) throw new Error(`Image maker: ${d.errors?.[0]?.message || r.status}`);
  return saveImage(Buffer.from(d.result.image, "base64"), origin);
}

const MO = `You are Mo, the little helper who lives in Rent Coat HQ. Your name comes from Captain Moroni, who rent his coat and made the title of liberty. You're warm, upbeat and a bit playful, but you get real work done fast and keep replies short.
What you can do with tools: check the business (business_snapshot), see the post queue (list_posts) and make post drafts (draft_post) that land in Posts → To review. Nothing posts, sends or spends money until Eli taps it in HQ; say so when you draft. Make at most 3 drafts per request.
Captions: a hook in the first line, 2-4 short lines, a clear call to action, then a blank line and 5-8 hashtags.
PICTURES, THE MOST IMPORTANT RULE: any post about a Rent Coat product MUST pass that product's product_id so the real product photo is used. Never ask the image maker to draw Rent Coat clothing: it can't reproduce the designs, so the picture would be wrong (a blank hoodie is not the Forgiven Hoodie). Use image_prompt (AI) only for scene or mood posts with no Rent Coat garment in frame: landscapes, light, a scripture page, a countdown mood shot. AI prompts: detailed, vertical, no text or logos.
WHAT MAKES A GOOD ROAD-TO-LAUNCH AD for @rentcoat.co: one product per post, shown with its real photo; a first line that stops the scroll (the verse story behind the design, or a feeling a young Latter-day Saint knows); the design detail and the verse reference from the catalog; price; "Opens Black Friday, Nov 27, 10 AM Eastern" until launch; "Link in bio" as the call to action. Audience: LDS teens and young adults, missionaries and their families, parents shopping Christmas gifts. Voice: confident, warm, a little witty, never preachy, no "elevate your wardrobe" filler. When asked for several posts, vary them: product spotlight, verse story, gift angle, countdown, the sweatsuit deal.
HONESTY ABOUT WHAT YOU DID: after drafting, say exactly how many drafts were saved and for which account, using only what the tool results confirm. If a draft failed, say so.
@rentcoat.co: faith streetwear; never invent product details, discounts, reviews or claims. @whatisanldsmission: church content only, Instagram only, never mention Rent Coat or products; never invent or paraphrase scripture or Church leaders' words; no images of Jesus Christ, prophets, apostles or real people.
Ads: you can plan ads and write ad copy, and the post maker makes the creatives, but Eli launches and pays for ads himself in Meta Ads Manager.`;

const MO_TOOLS = [
  { name: "business_snapshot", description: "Sales for the last 7 and 30 days, Tapstitch orders to place, post queue counts, live products with prices, and which accounts are connected.", input_schema: { type: "object", properties: {} } },
  { name: "list_posts", description: "The newest posts in the HQ queue with account, title and status.", input_schema: { type: "object", properties: {} } },
  { name: "draft_post", description: "Create a post draft in HQ's review queue. Makes the image too when the image maker is connected. Eli approves before anything is posted.",
    input_schema: { type: "object", properties: {
      account: { type: "string", enum: ["rentcoat", "mission"] },
      title: { type: "string", description: "Short internal title" },
      caption: { type: "string", description: "Final caption with hook, call to action and 5-8 hashtags" },
      product_id: { type: "string", description: "Id of the Rent Coat product this post shows (from the catalog). Required for any post about a product: HQ uses its real photo." },
      image_prompt: { type: "string", description: "Only for scene/mood posts with no Rent Coat clothing: a detailed AI image prompt, no text in the image" },
    }, required: ["account", "title", "caption"] } },
];

async function igPublishStart(post) {
  const user = process.env[`IG_${post.account.toUpperCase()}_USER_ID`], token = process.env[`IG_${post.account.toUpperCase()}_TOKEN`];
  if (!user || !token) throw new Error(`Instagram isn't connected for ${ACCOUNTS[post.account]} yet. See Setup.`);
  const video = (post.media || []).find(m => /\.mp4($|\?)/i.test(m));
  const image = (post.media || []).find(m => /\.jpe?g($|\?)/i.test(m));
  if (!video && !image) throw new Error("This post has no video or image to publish.");
  const body = video
    ? new URLSearchParams({ media_type: "REELS", video_url: video, caption: post.caption || "", share_to_feed: "true", access_token: token })
    : new URLSearchParams({ image_url: image, caption: post.caption || "", access_token: token });
  const r = await fetch(`${GRAPH}/${user}/media`, { method: "POST", body });
  const d = await r.json();
  if (!r.ok || !d.id) throw new Error(`Instagram: ${d.error?.message || r.status}`);
  return d.id;
}
async function igPublishCheck(post) {
  const user = process.env[`IG_${post.account.toUpperCase()}_USER_ID`], token = process.env[`IG_${post.account.toUpperCase()}_TOKEN`];
  const s = await (await fetch(`${GRAPH}/${post.container}?fields=status_code&access_token=${token}`)).json();
  if (s.status_code === "ERROR" || s.status_code === "EXPIRED") throw new Error(`Instagram couldn't process the video (${s.status_code}).`);
  if (s.status_code !== "FINISHED") return null;
  const r = await fetch(`${GRAPH}/${user}/media_publish`, { method: "POST", body: new URLSearchParams({ creation_id: post.container, access_token: token }) });
  const d = await r.json();
  if (!r.ok || !d.id) throw new Error(`Instagram: ${d.error?.message || r.status}`);
  return d.id;
}

const SYSTEM = `You are the operator inside Rent Coat HQ, the back office of Rent Coat Co. (rentcoat.co), faith streetwear for young Latter-day Saints, run by Eli, a high school senior in Holly Springs, NC.
Facts: the store opens Black Friday, Nov 27, 2026 at 10 AM Eastern. Black Friday sale: every tee $30 ($33 2XL) from opening through Cyber Monday, Nov 30; tees are $45 ($48 2XL) after that. Hoodies $48, Press Forward Sweats $55, the Steadfast Sweatsuit $100, die-cut stickers $6 (six designs, printed by Printful). US shipping $5.99, free over $60. The cap prints through Printful automatically; tees, hoodies, sweats and the set are made by Tapstitch and placed by hand from HQ's Orders tab (ships in 10 to 17 days). Hoodies carry words only, no pictures. Instagram accounts: @rentcoat.co (the brand) and @whatisanldsmission (church content only: no Rent Coat links or products, Instagram only).
How to answer: lead with the answer, short and direct, plain language. Show the math for money questions. Quote scripture and Church leaders only word for word with the reference. You can't post, send email, spend money or change the site from chat: say what to tap in HQ instead, and write captions, replies and plans ready to paste. If you don't know, say so.`;

export default async (req) => {
  const url = new URL(req.url);
  const key = req.headers.get("x-hq-key");
  if (!process.env.ADMIN_KEY || !key || !sameKey(key, process.env.ADMIN_KEY)) return json({ error: "Not found" }, 404);
  const path = url.pathname.replace(/^\/api\/hq\/?/, "").split("/").filter(Boolean);
  const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
  await hydrate().catch(e => console.error("vault", e.message));

  try {
    if (path[0] === "grow" && req.method === "GET") {
      const [list, ab, sent] = await Promise.all([reminderList().catch(e => ({ error: e.message })), abandoned().catch(e => ({ error: e.message })), sentStore()]);
      const reviews = (await getStore("reviews").get("all", { type: "json" })) || [];
      const stopCount = (await suppressed()).size;
      return json({ stopCount, list: list.emails ? { count: list.emails.length } : list, abandoned: ab, reviews, sent,
        email: { connected: Boolean(process.env.RESEND_API_KEY), address: Boolean(process.env.MAIL_ADDRESS) },
        video: { connected: Boolean(process.env.FAL_KEY), spent: await videoSpend(), cap: videoCap(), cost: VIDEO_COST } });
    }
    if (path[0] === "email" && req.method === "POST") {
      const subject = String(body.subject || "").trim().slice(0, 150), text = String(body.text || "").trim().slice(0, 8000);
      if (path[1] === "launch") {
        if (!subject || !text) return json({ error: "Add a subject and message." }, 400);
        if (body.test) return json({ sent: await sendEmail([replyTo()], `[TEST] ${subject}`, text, true), to: replyTo(), from: fromAddress() });
        const list = await reminderList(); if (list.error) return json({ error: list.error }, 400);
        const key = `launchSent-${subject.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}`; // same subject = same campaign
        const done = new Set((await store().get(key, { type: "json" })) || []);
        const todo = list.emails.filter(e => !done.has(e));
        let sent = 0;
        try {
          for (let i = 0; i < todo.length; i += 100) {
            const chunk = todo.slice(i, i + 100);
            sent += await sendEmail(chunk, subject, text, true);
            chunk.forEach(e => done.add(e)); await store().setJSON(key, [...done]);
          }
        } catch (e) { return json({ error: `${e.message} Sent ${sent} this time; ${todo.length - sent} still to go. Tap Send again tomorrow and it picks up where it stopped.` }, 502); }
        return json({ sent, skipped: list.emails.length - todo.length });
      }
      if (path[1] === "abandoned") {
        const a = (await abandoned()).find(x => x.id === path[2]);
        if (!a) return json({ error: "That checkout isn't in the last 7 days." }, 404);
        if (!a.optedIn) return json({ error: "They didn't agree to emails at checkout, so HQ won't email them." }, 403);
        const first = (a.name || "").split(" ")[0];
        await sendEmail([a.email], "You left something in your bag", `${first ? `Hi ${first},` : "Hi,"}\n\nYou were checking out at Rent Coat Co. and didn't finish:\n${a.items.join("\n")}\n\nPick up where you left off: ${a.recovery || "https://rentcoat.co/#shop"}\n\nQuestions about fit or shipping? Just reply.\n\nEli, Rent Coat Co.`, true);
        await markSent(`ab-${a.id}`); return json({ ok: true });
      }
      return json({ error: "Not found" }, 404);
    }
    if (path[0] === "orders" && (path[2] === "review-request" || path[2] === "referral") && req.method === "POST") {
      const s0 = await stripe(`checkout/sessions/${path[1]}`);
      const email = s0.customer_details?.email, first = (s0.customer_details?.name || "").split(" ")[0];
      if (!email) return json({ error: "No email on that order." }, 400);
      if (path[2] === "review-request") {
        const link = `${url.origin}/review/?s=${encodeURIComponent(s0.id)}&t=${tokenFor(s0.id)}`;
        await sendEmail([email], "How's your Rent Coat?", `${first ? `Hi ${first},` : "Hi,"}\n\nThanks again for your order. Now that it's been a little while, how is it? An honest review takes a minute and helps a small brand a lot:\n${link}\n\nIf anything's wrong with your order, reply and I'll make it right.\n\nEli, Rent Coat Co.`, false);
        await markSent(`rv-${s0.id}`); return json({ ok: true });
      }
      const code = await referralCode(s0.customer_details?.name);
      if (body.send) await sendEmail([email], "10% off for your friends", `${first ? `Hi ${first},` : "Hi,"}\n\nThanks for being one of the first Rent Coat customers. Here's a code for your friends: ${code} takes 10% off their first order at rentcoat.co.\n\nEli, Rent Coat Co.`, true);
      await markSent(`ref-${s0.id}`); return json({ code });
    }
    if (path[0] === "suppress" && req.method === "POST") {
      const e = String(body.email || "").trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return json({ error: "That's not an email address." }, 400);
      const set0 = await suppressed(); set0.add(e); await store().setJSON("suppress", [...set0]); return json({ count: set0.size });
    }
    if (path[0] === "reviews" && req.method === "POST") {
      const all = (await getStore("reviews").get("all", { type: "json" })) || [];
      const r = all.find(x => x.id === path[1]); if (!r) return json({ error: "Not found" }, 404);
      if (body.delete) all.splice(all.indexOf(r), 1); else r.approved = Boolean(body.approved);
      await getStore("reviews").setJSON("all", all); return json({ reviews: all });
    }
    if (path[0] === "tryon" && req.method === "POST") {
      if (!process.env.FAL_KEY) return json({ error: "AI photos and video need fal.ai connected. See Setup." }, 400);
      const prod = liveLine().find(x => x.id === body.product);
      if (!prod) return json({ error: "Pick a product." }, 400);
      if (await videoSpend() + TRYON_COST > videoCap()) return json({ error: `This month's AI budget ($${videoCap()}) is used up. Raise it in Setup.` }, 402);
      const scene = String(body.scene || "a young adult outdoors in soft golden-hour light").slice(0, 600);
      const back = body.view !== "front";
      const pick = prod.images.find(i => (back ? /back/i : /front/i).test(i.label || i.src)) || prod.images[0];
      const bottoms = prod.kind === "Sweats";
      const piece = bottoms ? `plain ${prod.color.toLowerCase()} sweatpants` : `a plain ${prod.color.toLowerCase()} ${prod.kind === "Tee" ? "t-shirt" : "hoodie"} with no print or logo`;
      // Step 1: the person (free Cloudflare image maker).
      const person = await makeImage(`Photorealistic vertical 4:5 photo of ${scene}, wearing ${piece}, ${back ? "seen from behind, back fully visible, facing away from the camera" : "facing the camera, chest fully visible"}, whole upper body in frame, arms relaxed, natural light, sharp focus, realistic skin and fabric, no text, no logos.`, url.origin);
      // Step 2: FASHN try-on puts the real garment on that person.
      const r = await fetch(`https://queue.fal.run/${TRYON_MODEL()}`, { method: "POST", headers: { authorization: `Key ${process.env.FAL_KEY}`, "content-type": "application/json" },
        body: JSON.stringify({ model_image: person, garment_image: `${url.origin}/${pick.src}`, category: bottoms ? "bottoms" : "tops", mode: "quality", garment_photo_type: "auto", num_samples: 1, output_format: "jpeg" }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.request_id) return json({ error: `AI photo: ${d.detail || d.message || r.status}` }, 502);
      const ok = u => { try { const x = new URL(u); return x.protocol === "https:" && x.hostname === "queue.fal.run"; } catch { return false; } };
      if (!ok(d.status_url) || !ok(d.response_url)) return json({ error: "AI photo: unexpected response from fal." }, 502);
      await videoSpend(TRYON_COST);
      const jobs = (await store().get("videoJobs", { type: "json" })) || [];
      jobs.unshift({ id: d.request_id, kind: "image", status_url: d.status_url, response_url: d.response_url, prompt: `${prod.name}: ${scene}`.slice(0, 200), created: Date.now() });
      await store().setJSON("videoJobs", jobs.slice(0, 30));
      return json({ id: d.request_id });
    }
    if (path[0] === "video") {
      if (!process.env.FAL_KEY) return json({ error: "AI video isn't connected yet. See Setup." }, 400);
      const h = { authorization: `Key ${process.env.FAL_KEY}`, "content-type": "application/json" };
      if (req.method === "POST" && !path[1]) {
        const cap = videoCap(), spent = await videoSpend();
        if (spent + VIDEO_COST > cap) return json({ error: `This month's AI video budget ($${cap}) is used up. Raise it in Setup.` }, 402);
        if (!body.image_url || !body.prompt) return json({ error: "Make or pick an image first, and describe the motion." }, 400);
        const r = await fetch(`https://queue.fal.run/${VIDEO_MODEL()}`, { method: "POST", headers: h, body: JSON.stringify({ prompt: String(body.prompt).slice(0, 2000), image_url: body.image_url, duration: "5" }) });
        const d = await r.json().catch(() => ({}));
        if (!r.ok || !d.request_id) return json({ error: `AI video: ${d.detail || d.message || r.status}` }, 502);
        await videoSpend(VIDEO_COST);
        const ok = u => { try { const x = new URL(u); return x.protocol === "https:" && x.hostname === "queue.fal.run"; } catch { return false; } };
        if (!ok(d.status_url) || !ok(d.response_url)) return json({ error: "AI video: unexpected response from fal." }, 502);
        const jobs = (await store().get("videoJobs", { type: "json" })) || [];
        jobs.unshift({ id: d.request_id, status_url: d.status_url, response_url: d.response_url, prompt: String(body.prompt).slice(0, 200), created: Date.now() });
        await store().setJSON("videoJobs", jobs.slice(0, 20));
        return json({ id: d.request_id });
      }
      if (req.method === "GET") return json({ jobs: ((await store().get("videoJobs", { type: "json" })) || []).map(j => ({ id: j.id, kind: j.kind || "video", prompt: j.prompt, created: j.created, url: j.url || null })) });
      if (req.method === "POST" && path[1] === "check") {
        const jobs = (await store().get("videoJobs", { type: "json" })) || [], job = jobs.find(j => j.id === body.id);
        if (!job) return json({ error: "That video job isn't on file." }, 404);
        if (job.url) return json({ status: "COMPLETED", url: job.url });
        const st = await (await fetch(job.status_url, { headers: h })).json().catch(() => ({}));
        if (st.status !== "COMPLETED") return json({ status: st.status || "IN_QUEUE" });
        const out = await (await fetch(job.response_url, { headers: h })).json();
        const src = job.kind === "image" ? out.images?.[0]?.url : out.video?.url; if (!src) return json({ error: "AI job finished without a file." }, 502);
        const bytes = Buffer.from(await (await fetch(src)).arrayBuffer());
        job.url = await saveImage(bytes, url.origin, job.kind === "image" ? "jpg" : "mp4"); await store().setJSON("videoJobs", jobs);
        return json({ status: "COMPLETED", url: job.url });
      }
    }
    if (path[0] === "vault") {
      if (req.method === "POST") {
        const patch = {};
        for (const k of PASTE_KEYS) if (k in body) patch[k] = typeof body[k] === "string" ? body[k].trim() : null;
        await setVault(patch);
      }
      return json({ set: Object.fromEntries(PASTE_KEYS.map(k => [k, Boolean(process.env[k])])), accounts: await getAccounts(),
        redirects: { meta: `${url.origin}/api/connect/meta/callback`, tiktok: `${url.origin}/api/connect/tiktok/callback` } });
    }
    if (path[0] === "connect" && req.method === "POST") {
      const cb = `${url.origin}/api/connect/${path[1]}/callback`;
      if (path[1] === "meta") {
        if (!process.env.META_APP_ID || !process.env.META_APP_SECRET) return json({ error: "Save your Meta App ID and App Secret first (step 1)." }, 400);
        const scope = "instagram_basic,instagram_content_publish,pages_show_list,pages_manage_posts,pages_read_engagement,business_management,ads_read";
        return json({ url: `https://www.facebook.com/${process.env.IG_GRAPH_VERSION || "v21.0"}/dialog/oauth?${new URLSearchParams({ client_id: process.env.META_APP_ID, redirect_uri: cb, state: makeState("meta"), response_type: "code", ...(process.env.META_CONFIG_ID ? { config_id: process.env.META_CONFIG_ID } : { scope }) })}` });
      }
      if (path[1] === "tiktok") {
        if (!process.env.TIKTOK_CLIENT_KEY || !process.env.TIKTOK_CLIENT_SECRET) return json({ error: "Save your TikTok Client key and secret first (step 1)." }, 400);
        return json({ url: `https://www.tiktok.com/v2/auth/authorize/?${new URLSearchParams({ client_key: process.env.TIKTOK_CLIENT_KEY, scope: "user.info.basic,video.upload", response_type: "code", redirect_uri: cb, state: makeState("tiktok") })}` });
      }
      return json({ error: "Unknown service." }, 404);
    }
    if (path[0] === "disconnect" && req.method === "POST") {
      const keys = { meta: ["META_USER_TOKEN", "IG_RENTCOAT_USER_ID", "IG_RENTCOAT_TOKEN", "IG_MISSION_USER_ID", "IG_MISSION_TOKEN", "META_PAGE_ID", "META_PAGE_TOKEN", "META_AD_ACCOUNT_ID", "META_ADS_TOKEN"], tiktok: ["TIKTOK_REFRESH_TOKEN"] }[path[1]];
      if (!keys) return json({ error: "Unknown service." }, 404);
      await setVault(Object.fromEntries(keys.map(k => [k, null]))); await setAccounts({ [path[1]]: null });
      return json({ ok: true });
    }
    if (path[0] === "overview") {
      const placed = (await store().get("placed", { type: "json" })) || {};
      const all = (await sessions(30)).map(s => orderView(s, placed));
      const today = day.format(Date.now()), weekAgo = Date.now() - 7 * 864e5;
      const sum = list => ({ orders: list.length, sales: list.reduce((n, o) => n + o.total, 0), keep: list.reduce((n, o) => n + o.keep, 0) });
      const q = await queue(req);
      const stats = await getStore("stats").get(today, { type: "json" });
      return json({
        today: sum(all.filter(o => day.format(o.created) === today)), week: sum(all.filter(o => o.created >= weekAgo)), month: sum(all),
        toPlace: all.filter(o => o.tapstitch.length && !o.placed).length,
        queue: { review: q.filter(p => p.status === "review").length, approved: q.filter(p => p.status === "approved").length, posted: q.filter(p => p.status === "posted").length },
        visitsToday: stats?.views || 0, opens: "2026-11-27T10:00:00-05:00",
        connected: { instagram: Object.fromEntries(Object.keys(ACCOUNTS).map(a => [a, Boolean(process.env[`IG_${a.toUpperCase()}_TOKEN`])])), chat: Boolean(process.env.ANTHROPIC_API_KEY), images: Boolean(process.env.CF_ACCOUNT_ID && process.env.CF_AI_TOKEN),
          facebook: Boolean(process.env.META_PAGE_ID && process.env.META_PAGE_TOKEN), tiktok: Boolean(process.env.TIKTOK_REFRESH_TOKEN && process.env.TIKTOK_CLIENT_KEY), ads: Boolean(process.env.META_AD_ACCOUNT_ID) },
        ads: await adsInsights().catch(() => null),
      });
    }
    if (path[0] === "orders" && !path[1]) {
      const placed = (await store().get("placed", { type: "json" })) || {};
      const days = Math.min(90, Math.max(1, Number(url.searchParams.get("days")) || 30));
      return json({ orders: (await sessions(days)).map(s => orderView(s, placed)).sort((a, b) => b.created - a.created) });
    }
    if (path[0] === "orders" && path[2] === "placed" && req.method === "POST") {
      const placed = (await store().get("placed", { type: "json" })) || {};
      if (body.placed) placed[path[1]] = new Date().toISOString(); else delete placed[path[1]];
      await store().setJSON("placed", placed);
      return json({ ok: true, placed: placed[path[1]] || null });
    }
    if (path[0] === "products") return json({ products: liveLine().map(p => ({ ...p, maker: PRODUCTS[p.id]?.maker })) });
    if (path[0] === "queue") {
      const q = await queue(req);
      if (!path[1] && req.method === "GET") return json({ queue: q });
      if (!path[1] && req.method === "POST") {
        if (!ACCOUNTS[body.account]) return json({ error: "Pick an account." }, 400);
        const post = { id: crypto.randomUUID(), account: body.account, title: String(body.title || "New post").slice(0, 120), caption: String(body.caption || "").slice(0, 2200),
          media: (body.media || []).map(String).slice(0, 10), when: body.when || null, status: "review", created: Date.now() };
        q.unshift(post); await store().setJSON("queue", q); return json({ post });
      }
      const post = q.find(p => p.id === path[1]);
      if (!post) return json({ error: "Post not found." }, 404);
      if (path[2] === "publish") {
        if (post.status !== "approved" && post.status !== "publishing") return json({ error: "Approve it first." }, 409);
        if (!post.container) { post.container = await igPublishStart(post); post.status = "publishing"; }
        else {
          let id;
          try { id = await igPublishCheck(post); }
          catch (e) { delete post.container; post.status = "approved"; await store().setJSON("queue", q); throw e; } // tap Post again to retry from scratch
          if (id) { post.status = "posted"; post.postedAt = Date.now(); post.igId = id; }
        }
        await store().setJSON("queue", q); return json({ post });
      }
      if (path[2] === "facebook" || path[2] === "tiktok") {
        if (post.status !== "approved" && post.status !== "posted") return json({ error: "Approve it first." }, 409);
        if (path[2] === "facebook") post.fb = await fbPublish(post); else post.tt = await tiktokPublish(post);
        await store().setJSON("queue", q); return json({ post });
      }
      if (body.delete) { await store().setJSON("queue", q.filter(p => p.id !== post.id)); return json({ ok: true }); }
      if (["review", "approved", "posted"].includes(body.status)) { post.status = body.status; if (body.status === "posted") post.postedAt = Date.now(); }
      if (typeof body.caption === "string") post.caption = body.caption.slice(0, 2200);
      if ("when" in body) post.when = body.when || null;
      if (typeof body.views === "number") post.views = body.views;
      if (Array.isArray(body.media)) { post.media = body.media.map(String).slice(0, 10); delete post.needsImage; }
      if (body.branded) post.branded = true;
      await store().setJSON("queue", q); return json({ post });
    }
    if (path[0] === "image" && req.method === "POST") {
      if (!process.env.CF_ACCOUNT_ID || !process.env.CF_AI_TOKEN) return json({ error: "Image maker isn't connected yet. See Setup." }, 400);
      const prompt = String(body.prompt || "").trim().slice(0, 2000);
      if (!prompt) return json({ error: "Describe the image first." }, 400);
      const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT_ID}/ai/run/@cf/black-forest-labs/flux-1-schnell`, {
        method: "POST", headers: { authorization: `Bearer ${process.env.CF_AI_TOKEN}`, "content-type": "application/json" },
        body: JSON.stringify({ prompt, steps: 8 }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.result?.image) return json({ error: `Image maker: ${d.errors?.[0]?.message || r.status}` }, 502);
      return json({ url: await saveImage(Buffer.from(d.result.image, "base64"), url.origin) });
    }
    if (path[0] === "upload" && req.method === "POST") {
      const m = /^data:(image\/jpeg|video\/mp4|video\/webm)(?:;[^,]*)?;base64,(.+)$/.exec(String(body.image || ""));
      if (!m) return json({ error: "Send a JPEG, MP4 or WebM." }, 400);
      const bytes = Buffer.from(m[2], "base64");
      if (bytes.length > 4.4e6) return json({ error: "File too big (over 4 MB). Make it shorter." }, 413);
      return json({ url: await saveImage(bytes, url.origin, { "image/jpeg": "jpg", "video/mp4": "mp4", "video/webm": "webm" }[m[1]]) });
    }
    if (path[0] === "draft" && req.method === "POST") {
      if (!process.env.ANTHROPIC_API_KEY) return json({ error: "Claude isn't connected yet: add ANTHROPIC_API_KEY (see Setup)." }, 400);
      const acct = body.account === "mission" ? "mission" : "rentcoat";
      const prod = acct === "rentcoat" && body.product ? liveLine().find(p => p.id === body.product) : null;
      const brief = acct === "mission"
        ? "Account @whatisanldsmission: Latter-day Saint missionary and gospel content, Instagram only. Non-commercial: never mention Rent Coat, products, prices or links. Never invent or paraphrase scripture or quotes from Church leaders; leave quotes out unless Eli gave the exact words. Images: no depictions of Jesus Christ, prophets, apostles or real people; use landscapes, light, objects, symbolic scenes."
        : `Account @rentcoat.co: faith streetwear for young Latter-day Saints (Book of Mormon references). Store opens Black Friday, Nov 27, 2026, 10 AM Eastern; shipping $5.99 or free over $60; link in bio is rentcoat.co.${prod ? ` This post is about: ${prod.name}, $${(prod.price.default / 100).toFixed(0)}, ${prod.color}, ${prod.ref || ""}. ${prod.blurb || ""}` : ""} Never invent product details, reviews, discounts or claims.`;
      const client = new Anthropic();
      const r = await client.beta.messages.create({
        model: "claude-opus-5-5", max_tokens: 1500, betas: ["server-side-fallback-2026-07-01"], fallbacks: "default",
        output_config: { effort: "low" },
        system: `You are the social media lead for Eli's Instagram accounts. Write like a sharp human editor: natural, warm, confident, no AI cliches, no emojis unless they truly fit (max 2). ${brief}
${acct === "rentcoat" ? `CATALOG (ids and facts; never invent others):\n${liveLine().map(p => `- ${p.id}: ${p.name}, ${p.color}, $${(p.price.default / 100).toFixed(0)}${p.ref ? `, ${p.ref}` : ""}. ${p.blurb || ""}`).join("\n")}
If the idea is about a Rent Coat product, set "product_id" to its id and leave "imagePrompt" empty: HQ uses the real product photo (an AI picture can't show the design). Only scene or mood posts with no Rent Coat clothing get an imagePrompt.\n` : ""}Return ONLY a JSON object: {"product_id": string or null, "imagePrompt": string (a detailed prompt for a photoreal or editorial image, vertical 4:5, no text or logos in the image, premium lighting, cohesive dark-green/cream/gold palette when it fits), "headline": string (max 6 words, for a product post graphic), "caption": string (hook in the first line, 2-4 short lines, a clear call to action, then a blank line and 5-8 relevant hashtags, mixing niche and broad)}.`,
        messages: [{ role: "user", content: `Post idea: ${String(body.idea || "a strong post for today").slice(0, 1500)}` }],
      });
      const text = r.content.filter(b => b.type === "text").map(b => b.text).join("");
      const m = text.match(/\{[\s\S]*\}/);
      try { return json(JSON.parse(m[0])); } catch { return json({ error: "Claude's answer didn't come back in the right format. Try again." }, 502); }
    }
    if (path[0] === "mo" && req.method === "POST") {
      if (!process.env.ANTHROPIC_API_KEY) return json({ error: "Mo needs ANTHROPIC_API_KEY in Netlify (see Setup)." }, 400);
      let messages = Array.isArray(body.messages) ? body.messages : [];
      if (messages.length > 40) { const i = messages.findIndex((m, k) => k >= messages.length - 40 && m.role === "user" && typeof m.content === "string"); messages = messages.slice(i < 0 ? messages.length - 1 : i); }
      if (!messages.length || messages[0].role !== "user") return json({ error: "Say something first." }, 400);
      const client = new Anthropic();
      const r = await client.beta.messages.create({
        model: "claude-sonnet-5-5", max_tokens: 3000, betas: ["server-side-fallback-2026-07-01"], fallbacks: "default",
        output_config: { effort: "low" },
        system: [{ type: "text", text: `${SYSTEM}\n\n${MO}\n\nCATALOG (live products; use these ids and facts only):\n${liveLine().map(p => `- ${p.id}: ${p.name}, ${p.kind}, ${p.color}, $${(p.price.default / 100).toFixed(0)}${p.ref ? `, ${p.ref}` : ""}. ${p.blurb || ""}`).join("\n")}`, cache_control: { type: "ephemeral" } }],
        tools: MO_TOOLS, messages,
      });
      if (r.stop_reason === "refusal") return json({ messages: [...messages, { role: "assistant", content: "I can't help with that one." }], done: true });
      messages = [...messages, { role: "assistant", content: r.content }];
      const uses = r.content.filter(b => b.type === "tool_use");
      if (!uses.length) return json({ messages, done: true });
      const results = [];
      let drafts = 0;
      for (const u of uses) {
        let out;
        try {
          if (u.name === "business_snapshot") out = await snapshot(req);
          else if (u.name === "list_posts") out = (await queue(req)).slice(0, 15).map(p => ({ account: p.account, title: p.title, status: p.status }));
          else if (u.name === "draft_post") {
            if (++drafts > 3) throw new Error("Max 3 drafts per request.");
            const a = u.input || {}, account = a.account === "mission" ? "mission" : "rentcoat";
            const prod = a.product_id ? liveLine().find(x => x.id === a.product_id) : null;
            if (a.product_id && !prod) throw new Error(`No live product with id ${a.product_id}. Use an id from the catalog.`);
            if (prod && account === "mission") throw new Error("@whatisanldsmission never shows Rent Coat products.");
            if (!prod && !a.image_prompt) throw new Error("Give a product_id (product post) or an image_prompt (scene post).");
            const named = !prod && account === "rentcoat" && liveLine().find(x => `${a.title} ${a.caption} ${a.image_prompt}`.toLowerCase().includes(x.name.toLowerCase().replace(/^the /, "")));
            if (named) throw new Error(`This post is about ${named.name}: pass product_id "${named.id}" so the real photo is used, and drop image_prompt.`);
            const p2 = { id: crypto.randomUUID(), account, title: String(a.title || "Mo's draft").slice(0, 120), caption: String(a.caption || "").slice(0, 2200),
              prompt: prod ? "" : String(a.image_prompt).slice(0, 2000), product: prod?.id, media: [], status: "review", by: "mo", created: Date.now() };
            if (prod) p2.media = [`${url.origin}/${prod.images[0].src}`];
            else { try { p2.media = [await makeImage(p2.prompt, url.origin)]; } catch { p2.needsImage = true; } }
            const q = await queue(req); q.unshift(p2); await store().setJSON("queue", q);
            out = { saved: true, title: p2.title, account: account === "mission" ? "@whatisanldsmission" : "@rentcoat.co", image: prod ? `real photo of ${prod.name}` : p2.media.length ? "AI scene made" : "no image yet (Eli can tap Make image)" };
          } else out = { error: "Unknown tool" };
        } catch (e) { out = { saved: false, error: e.message }; }
        results.push({ type: "tool_result", tool_use_id: u.id, content: JSON.stringify(out) });
      }
      return json({ messages: [...messages, { role: "user", content: results }], done: false });
    }
    if (path[0] === "chat" && req.method === "POST") {
      if (!process.env.ANTHROPIC_API_KEY) return json({ reply: "Chat isn't connected yet. Add ANTHROPIC_API_KEY in Netlify (Setup tab shows how), then ask again." });
      const messages = (body.messages || []).filter(m => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
        .slice(-20).map(m => ({ role: m.role, content: m.content.slice(0, 8000) }));
      if (!messages.length || messages[0].role !== "user") return json({ error: "Say something first." }, 400);
      const placed = (await store().get("placed", { type: "json" })) || {};
      const recent = (await sessions(7).catch(() => [])).map(s => orderView(s, placed));
      const live = `Right now: ${recent.length} paid orders in the last 7 days, $${(recent.reduce((n, o) => n + o.total, 0) / 100).toFixed(2)} in sales; ${recent.filter(o => o.tapstitch.length && !o.placed).length} Tapstitch orders still to place. Live products: ${liveLine().map(p => `${p.name} ($${(p.price.default / 100).toFixed(0)})`).join(", ")}.`;
      const client = new Anthropic();
      const r = await client.beta.messages.create({
        model: "claude-opus-5-5", max_tokens: 4000, betas: ["server-side-fallback-2026-07-01"], fallbacks: "default",
        output_config: { effort: "medium" },
        system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }, { type: "text", text: live }],
        messages,
      });
      if (r.stop_reason === "refusal") return json({ reply: "I can't help with that one." });
      return json({ reply: r.content.filter(b => b.type === "text").map(b => b.text).join("\n").trim() });
    }
    return json({ error: "Not found" }, 404);
  } catch (e) {
    console.error("hq", path.join("/"), e.message);
    return json({ error: e.message || "Something went wrong." }, 500);
  }
};

export const config = { path: ["/api/hq/*"] };
