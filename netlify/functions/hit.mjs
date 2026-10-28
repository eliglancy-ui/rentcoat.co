// POST /api/hit  { p: "/path", r: "referrer.host" }  ->  204
// Counts one page view. Stores only daily totals: views per page, per referring site, and phones vs computers.
// No cookies, no IP addresses, nothing that identifies a person. Read the totals at /api/stats.
import { getStore } from "@netlify/blobs";

const BOTS = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse|monitor/i;
const day = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" });
const clean = (s, max) => String(s || "").replace(/[^\w./-]/g, "").slice(0, max);

export default async (req) => {
  if (req.method !== "POST") return new Response(null, { status: 405 });
  const ua = req.headers.get("user-agent") || "";
  if (BOTS.test(ua)) return new Response(null, { status: 204 });
  let body = {};
  try { body = JSON.parse(await req.text()); } catch {}
  const path = clean(body.p, 80);
  if (!path.startsWith("/")) return new Response(null, { status: 204 });
  const ref = clean(body.r, 60).replace(/^www\./, "") || "direct";
  const site = new URL(req.url).hostname;

  const store = getStore("stats");
  const key = day.format(Date.now());
  const d = (await store.get(key, { type: "json" })) || { views: 0, phone: 0, pages: {}, refs: {} };
  d.views++;
  if (/Mobi|Android|iPhone/i.test(ua)) d.phone++;
  d.pages[path] = (d.pages[path] || 0) + 1;
  if (ref !== site) d.refs[ref] = (d.refs[ref] || 0) + 1;
  await store.setJSON(key, d);
  return new Response(null, { status: 204 });
};

export const config = { path: "/api/hit" };
