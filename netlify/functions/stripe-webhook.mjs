// POST /api/stripe-webhook  (Stripe calls this after each payment)
// Turns a paid Checkout session into a Printful DRAFT order. Drafts cost nothing until you confirm them
// in Printful, so you can review every order after the preorder closes and confirm them all at once.
import crypto from "node:crypto";
import { PRODUCTS, decodeItems, stripe, printful, json } from "../lib/store.mjs";

const TOLERANCE_SECONDS = 300;

export function verifySignature(body, header, secret, now = Math.floor(Date.now() / 1000)) {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(header.split(",").map(p => p.split("=")).filter(p => p.length === 2).map(([k, v]) => [k, v]));
  const signatures = header.split(",").filter(p => p.startsWith("v1=")).map(p => p.slice(3));
  const t = Number(parts.t);
  if (!t || Math.abs(now - t) > TOLERANCE_SECONDS || signatures.length === 0) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${t}.${body}`).digest("hex");
  return signatures.some(sig => /^[0-9a-f]+$/.test(sig) && sig.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex")));
}

// Printful external_id allows at most 32 characters; Stripe session ids are longer.
export const externalId = sessionId => "rc" + crypto.createHash("sha256").update(sessionId).digest("hex").slice(0, 30);

export function buildPrintfulOrder(session) {
  const ship = session.shipping_details;
  if (!ship?.address) throw new Error("Session has no shipping address");
  const a = ship.address;
  const items = decodeItems(session.metadata?.items).map(i => {
    const variant = PRODUCTS[i.id]?.variants?.[i.size];
    if (!variant) throw new Error(`No Printful variant set for ${i.id} size ${i.size}`);
    // String IDs are Printful external variant IDs; numbers are sync variant IDs.
    return typeof variant === "string"
      ? { external_variant_id: variant, quantity: i.qty }
      : { sync_variant_id: variant, quantity: i.qty };
  });
  if (items.length === 0) throw new Error("Session has no items in metadata");
  return {
    external_id: externalId(session.id),
    shipping: "STANDARD",
    recipient: {
      name: ship.name,
      address1: a.line1,
      address2: a.line2 || undefined,
      city: a.city,
      state_code: a.state,
      country_code: a.country,
      zip: a.postal_code,
      email: session.customer_details?.email,
      phone: session.customer_details?.phone || undefined,
    },
    items,
  };
}

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);
  const body = await req.text();
  if (!verifySignature(body, req.headers.get("stripe-signature"), process.env.STRIPE_WEBHOOK_SECRET)) {
    return json({ error: "Bad signature" }, 400);
  }

  const event = JSON.parse(body); // safe: the signature check above proved Stripe sent this exact body
  if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded") {
    return json({ received: true });
  }

  // Re-read the session at a pinned API version so the address fields are always where we expect.
  let session;
  try {
    session = await stripe(`checkout/sessions/${encodeURIComponent(event.data.object.id)}`);
  } catch (e) {
    console.error(`Could not read Stripe session ${event.data?.object?.id}: ${e.message}`);
    return json({ error: "Stripe lookup failed" }, 500); // 500 makes Stripe retry
  }
  if (session.payment_status !== "paid") return json({ received: true, skipped: "not paid yet" });

  let order;
  try {
    order = buildPrintfulOrder(session);
  } catch (e) {
    // The payment is safe in Stripe. Log it so the order can be placed by hand.
    console.error(`ORDER NEEDS MANUAL ENTRY ${session.id}: ${e.message}`);
    return json({ received: true, manual: e.message });
  }

  const res = await printful("orders", { method: "POST", body: order });
  if (res.ok) {
    console.log(`Printful draft order ${res.data?.result?.id} for ${session.id}`);
    return json({ received: true, printful: res.data?.result?.id });
  }
  const msg = JSON.stringify(res.data?.error || res.data);
  if (res.status === 400 && /external/i.test(msg)) {
    return json({ received: true, duplicate: true }); // Stripe retried; the draft already exists.
  }
  console.error(`Printful rejected ${session.id}: ${res.status} ${msg}`);
  return json({ error: "Printful order failed" }, 500); // 500 makes Stripe retry for up to 3 days
};

export const config = { path: "/api/stripe-webhook" };
