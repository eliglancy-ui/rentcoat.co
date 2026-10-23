// GET /api/printful-variants?key=YOUR_ADMIN_KEY
// Lists every product variant in your Printful store with its sync variant ID and external ID,
// so you can check the IDs in PRODUCTS in netlify/lib/store.mjs.
import crypto from "node:crypto";
import { printful } from "../lib/store.mjs";

// Compares hashes so the check takes the same time whether the guess is close or not.
const sameKey = (a, b) => crypto.timingSafeEqual(
  crypto.createHash("sha256").update(String(a)).digest(),
  crypto.createHash("sha256").update(String(b)).digest());

export default async (req) => {
  const key = new URL(req.url).searchParams.get("key");
  if (!process.env.ADMIN_KEY || !key || !sameKey(key, process.env.ADMIN_KEY)) return new Response("Not found", { status: 404 });

  const list = await printful("store/products?limit=100");
  if (!list.ok) return new Response(`Printful error ${list.status}: ${JSON.stringify(list.data)}`, { status: 502 });

  const lines = ["sync_variant_id\texternal_id\tvariant name"];
  for (const p of list.data.result || []) {
    const detail = await printful(`store/products/${p.id}`);
    for (const v of detail.data?.result?.sync_variants || []) lines.push(`${v.id}\t${v.external_id}\t${v.name}`);
  }
  return new Response(lines.join("\n") + "\n", { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};

export const config = { path: "/api/printful-variants" };
