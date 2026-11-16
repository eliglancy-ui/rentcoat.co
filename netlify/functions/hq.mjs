// Rent Coat HQ: the private back office at rentcoat.co/hq. Every route needs the x-hq-key header to equal ADMIN_KEY.
//   GET  /api/hq/overview              sales today / 7 days / 30 days, what's left to place, the post queue, visits
//   GET  /api/hq/orders?days=30        paid orders, newest first, with the Tapstitch pieces to place by hand
//   POST /api/hq/orders/:id/placed     { placed: true|false }   tick a Tapstitch order off
//   GET  /api/hq/queue                 posts waiting for approval, approved, posted
//   POST /api/hq/queue                 { account, title, caption, media, when }   add a post
//   POST /api/hq/queue/:id             { status | caption | when | delete }        approve, edit, mark posted, remove
//   POST /api/hq/queue/:id/publish     post an approved reel to Instagram (needs IG_*_USER_ID and IG_*_TOKEN)
//   GET  /api/hq/products              what's live on the site
//   POST /api/hq/chat                  { messages }  ask Rent Coat's assistant (needs ANTHROPIC_API_KEY)
// Nothing is posted, sent or changed outside this site without an explicit tap in HQ.
import crypto from "node:crypto";
import { getStore } from "@netlify/blobs";
import Anthropic from "@anthropic-ai/sdk";
import { PRODUCTS, liveLine, decodeItems, stripe, json } from "../lib/store.mjs";

const sameKey = (a, b) => crypto.timingSafeEqual(
  crypto.createHash("sha256").update(String(a)).digest(),
  crypto.createHash("sha256").update(String(b)).digest());
const day = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" });
const ACCOUNTS = { rentcoat: "@rentcoat.co", mission: "@whatisanldsmission" };
const GRAPH = `https://graph.facebook.com/${process.env.IG_GRAPH_VERSION || "v21.0"}`;
const store = () => getStore("hq");

// What a sale costs, so HQ shows what Eli keeps. Card fee 2.9% + 30c, Stripe Tax 0.5%, made-to-order cost per piece.
const COST = { tee: 2292, hoodie: 2888, sweats: 2198, set: 5086, cap: 1500 }; // cents: Printful tee (Bella 3010), Tapstitch hoodie and sweats (Nov 14 invoices)
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

async function queue(req) {
  let q = await store().get("queue", { type: "json" });
  if (!q) {
    // First visit: start from the posts Claude already made (public/hq/seed.json).
    try { q = await (await fetch(new URL("/hq/seed.json", req.url))).json(); } catch { q = []; }
    await store().setJSON("queue", q);
  }
  return q;
}

async function igPublishStart(post) {
  const user = process.env[`IG_${post.account.toUpperCase()}_USER_ID`], token = process.env[`IG_${post.account.toUpperCase()}_TOKEN`];
  if (!user || !token) throw new Error(`Instagram isn't connected for ${ACCOUNTS[post.account]} yet. See Setup.`);
  const video = (post.media || []).find(m => /\.mp4($|\?)/i.test(m));
  if (!video) throw new Error("This post has no video file to publish.");
  const body = new URLSearchParams({ media_type: "REELS", video_url: video, caption: post.caption || "", share_to_feed: "true", access_token: token });
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
Facts: the store opens Black Friday, Nov 27, 2026 at 10 AM Eastern. Tees $40 ($43 2XL), hoodies $68, Press Forward Sweats $55, the Steadfast Sweatsuit $100. US shipping $5.99, free over $60. Tees and the cap print through Printful automatically; hoodies, sweats and the set are made by Tapstitch and placed by hand from HQ's Orders tab (ships in 10 to 17 days). Hoodies carry words only, no pictures. Instagram accounts: @rentcoat.co (the brand) and @whatisanldsmission (church content only: no Rent Coat links or products, Instagram only).
How to answer: lead with the answer, short and direct, plain language. Show the math for money questions. Quote scripture and Church leaders only word for word with the reference. You can't post, send email, spend money or change the site from chat: say what to tap in HQ instead, and write captions, replies and plans ready to paste. If you don't know, say so.`;

export default async (req) => {
  const url = new URL(req.url);
  const key = req.headers.get("x-hq-key");
  if (!process.env.ADMIN_KEY || !key || !sameKey(key, process.env.ADMIN_KEY)) return json({ error: "Not found" }, 404);
  const path = url.pathname.replace(/^\/api\/hq\/?/, "").split("/").filter(Boolean);
  const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};

  try {
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
        connected: { instagram: Object.fromEntries(Object.keys(ACCOUNTS).map(a => [a, Boolean(process.env[`IG_${a.toUpperCase()}_TOKEN`])])), chat: Boolean(process.env.ANTHROPIC_API_KEY) },
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
      if (body.delete) { await store().setJSON("queue", q.filter(p => p.id !== post.id)); return json({ ok: true }); }
      if (["review", "approved", "posted"].includes(body.status)) { post.status = body.status; if (body.status === "posted") post.postedAt = Date.now(); }
      if (typeof body.caption === "string") post.caption = body.caption.slice(0, 2200);
      if ("when" in body) post.when = body.when || null;
      if (typeof body.views === "number") post.views = body.views;
      await store().setJSON("queue", q); return json({ post });
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
