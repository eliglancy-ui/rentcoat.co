// GET /api/stats?key=YOUR_ADMIN_KEY&days=30  ->  a simple page of daily visits, top pages and where visitors came from.
import crypto from "node:crypto";
import { getStore } from "@netlify/blobs";

const sameKey = (a, b) => crypto.timingSafeEqual(
  crypto.createHash("sha256").update(String(a)).digest(),
  crypto.createHash("sha256").update(String(b)).digest());
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const day = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" });

export default async (req) => {
  const url = new URL(req.url);
  const key = url.searchParams.get("key");
  if (!process.env.ADMIN_KEY || !key || !sameKey(key, process.env.ADMIN_KEY)) return new Response("Not found", { status: 404 });
  const days = Math.min(365, Math.max(1, Number(url.searchParams.get("days")) || 30));

  const store = getStore("stats");
  const rows = [], pages = {}, refs = {};
  let views = 0, phone = 0;
  for (let i = 0; i < days; i++) {
    const k = day.format(Date.now() - i * 864e5);
    const d = await store.get(k, { type: "json" });
    rows.push([k, d?.views || 0]);
    if (!d) continue;
    views += d.views; phone += d.phone;
    for (const [p, n] of Object.entries(d.pages)) pages[p] = (pages[p] || 0) + n;
    for (const [r, n] of Object.entries(d.refs)) refs[r] = (refs[r] || 0) + n;
  }
  const top = o => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([k, n]) => `<tr><td>${esc(k)}</td><td>${n}</td></tr>`).join("") || "<tr><td>None yet</td><td></td></tr>";
  const max = Math.max(1, ...rows.map(r => r[1]));
  const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>Visits | Rent Coat Co.</title>
<style>body{font:15px/1.5 system-ui,sans-serif;max-width:720px;margin:24px auto;padding:0 16px;color:#16201B;background:#F5F2EA}h1{margin:0 0 4px}table{width:100%;border-collapse:collapse;margin:8px 0 24px}td{padding:4px 0;border-bottom:1px solid #ddd}td:last-child{text-align:right;font-variant-numeric:tabular-nums}.bar{background:#A83A2C;height:10px;border-radius:2px}</style>
<h1>Visits</h1><p>Last ${days} days: <b>${views}</b> page views, ${views ? Math.round((phone / views) * 100) : 0}% on phones. Counts are per page view, not per person, and leave out bots.</p>
<h2>By day</h2><table>${rows.map(([k, n]) => `<tr><td style="width:110px">${k}</td><td><div class="bar" style="width:${(n / max) * 100}%"></div></td><td style="width:50px">${n}</td></tr>`).join("")}</table>
<h2>Top pages</h2><table>${top(pages)}</table>
<h2>Where visitors came from</h2><table>${top(refs)}</table>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
};

export const config = { path: "/api/stats" };
