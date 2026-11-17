// POST /api/review  { s, t, rating, text, name }  a customer's review from the link in their review-request email.
// The link carries the Stripe session id and a token signed with ADMIN_KEY, so only real buyers can review, once each.
// Reviews wait in HQ (Grow tab) until Eli approves them.
import { getStore } from "@netlify/blobs";
import { tokenFor } from "../lib/vault.mjs";
import { json } from "../lib/store.mjs";

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Not found" }, 404);
  const b = await req.json().catch(() => ({}));
  const s = String(b.s || ""), t = String(b.t || "");
  if (!/^cs_[A-Za-z0-9_]+$/.test(s) || t !== tokenFor(s)) return json({ error: "This review link isn't valid." }, 403);
  const rating = Math.round(Number(b.rating));
  if (!(rating >= 1 && rating <= 5)) return json({ error: "Pick 1 to 5 stars." }, 400);
  const text = String(b.text || "").trim().slice(0, 1500), name = String(b.name || "").trim().slice(0, 60);
  const store = getStore("reviews");
  const all = (await store.get("all", { type: "json" })) || [];
  if (all.some(r => r.session === s)) return json({ error: "You already left a review. Thank you!" }, 409);
  all.unshift({ id: crypto.randomUUID(), session: s, rating, text, name: name || "Rent Coat customer", created: Date.now(), approved: false });
  await store.setJSON("all", all);
  return json({ ok: true });
};

export const config = { path: "/api/review" };
