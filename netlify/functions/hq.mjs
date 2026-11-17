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
import { hydrate, setVault, getAccounts, setAccounts, makeState, PASTE_KEYS } from "../lib/vault.mjs";

const sameKey = (a, b) => crypto.timingSafeEqual(
  crypto.createHash("sha256").update(String(a)).digest(),
  crypto.createHash("sha256").update(String(b)).digest());
const day = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" });
const ACCOUNTS = { rentcoat: "@rentcoat.co", mission: "@whatisanldsmission" };
const GRAPH = `https://graph.facebook.com/${process.env.IG_GRAPH_VERSION || "v21.0"}`;
const store = () => getStore("hq");

// What a sale costs, so HQ shows what Eli keeps. Card fee 2.9% + 30c, Stripe Tax 0.5%, made-to-order cost per piece.
const COST = { tee: 1397, hoodie: 2888, sweats: 2198, set: 5086, cap: 1500 }; // cents: Tapstitch tee (RU0014), hoodie and sweats (Nov 14 invoices)
const SHIP_COST = 900; // rough cost to ship one order to the customer
const pieceCost = id => {
  const p = PRODUCTS[id]; if (!p) return 0;
  return { Tee: COST.tee, Hoodie: COST.hoodie, Sweats: COST.sweats, Set: COST.set, Cap: COST.cap }[p.kind] ?? COST.tee;
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
Captions: a hook in the first line, 2-4 short lines, a clear call to action, then a blank line and 5-8 hashtags. Image prompts: detailed, vertical-friendly, no text or logos in the image.
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
      image_prompt: { type: "string", description: "Detailed image prompt, no text in the image" },
    }, required: ["account", "title", "caption", "image_prompt"] } },
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
Facts: the store opens Black Friday, Nov 27, 2026 at 10 AM Eastern. Tees $40 ($43 2XL), hoodies $68, Press Forward Sweats $55, the Steadfast Sweatsuit $100. US shipping $5.99, free over $60. The cap prints through Printful automatically; tees, hoodies, sweats and the set are made by Tapstitch and placed by hand from HQ's Orders tab (ships in 10 to 17 days). Hoodies carry words only, no pictures. Instagram accounts: @rentcoat.co (the brand) and @whatisanldsmission (church content only: no Rent Coat links or products, Instagram only).
How to answer: lead with the answer, short and direct, plain language. Show the math for money questions. Quote scripture and Church leaders only word for word with the reference. You can't post, send email, spend money or change the site from chat: say what to tap in HQ instead, and write captions, replies and plans ready to paste. If you don't know, say so.`;

export default async (req) => {
  const url = new URL(req.url);
  const key = req.headers.get("x-hq-key");
  if (!process.env.ADMIN_KEY || !key || !sameKey(key, process.env.ADMIN_KEY)) return json({ error: "Not found" }, 404);
  const path = url.pathname.replace(/^\/api\/hq\/?/, "").split("/").filter(Boolean);
  const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
  await hydrate().catch(e => console.error("vault", e.message));

  try {
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
        return json({ url: `https://www.facebook.com/${process.env.IG_GRAPH_VERSION || "v21.0"}/dialog/oauth?${new URLSearchParams({ client_id: process.env.META_APP_ID, redirect_uri: cb, state: makeState("meta"), scope, response_type: "code" })}` });
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
        else { const id = await igPublishCheck(post); if (id) { post.status = "posted"; post.postedAt = Date.now(); post.igId = id; } }
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
Return ONLY a JSON object: {"imagePrompt": string (a detailed prompt for a photoreal or editorial image, vertical 4:5, no text or logos in the image, premium lighting, cohesive dark-green/cream/gold palette when it fits), "headline": string (max 6 words, for a product post graphic), "caption": string (hook in the first line, 2-4 short lines, a clear call to action, then a blank line and 5-8 relevant hashtags, mixing niche and broad)}.`,
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
        system: [{ type: "text", text: `${SYSTEM}\n\n${MO}`, cache_control: { type: "ephemeral" } }],
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
            const p2 = { id: crypto.randomUUID(), account, title: String(a.title || "Mo's draft").slice(0, 120), caption: String(a.caption || "").slice(0, 2200),
              prompt: String(a.image_prompt || "").slice(0, 2000), media: [], status: "review", by: "mo", created: Date.now() };
            try { p2.media = [await makeImage(p2.prompt, url.origin)]; } catch { p2.needsImage = true; }
            const q = await queue(req); q.unshift(p2); await store().setJSON("queue", q);
            out = { drafted: p2.title, account, image: p2.media.length ? "made" : "not made (image maker not connected or failed); Eli can tap Make image" };
          } else out = { error: "Unknown tool" };
        } catch (e) { out = { error: e.message }; }
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
