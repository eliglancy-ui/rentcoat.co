// POST /api/checkout  { items: [{ id, size, qty }] }  ->  { url }  (a Stripe Checkout page)
import { PRODUCTS, SHIPPING, SHIP_TO, cleanCart, dropPhase, encodeItems, unitPrice, stripe, json } from "../lib/store.mjs";

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);

  const phase = dropPhase();
  if (phase === "before") return json({ error: "Preorders aren't open yet. Check the countdown." }, 409);
  if (phase === "closed") return json({ error: "Drop 001 has closed. Follow @rentcoat.co for the next one." }, 409);

  let items;
  try {
    items = cleanCart((await req.json())?.items);
  } catch (e) {
    return json({ error: e instanceof SyntaxError ? "Bad request." : e.message }, 400);
  }

  const site = process.env.URL || new URL(req.url).origin;
  const params = {
    mode: "payment",
    success_url: `${site}/thanks.html?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${site}/#drop`,
    // Stripe's shortest allowed lifetime, so a page opened just before the drop closes can't be paid hours later.
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    custom_text: {
      submit: { message: "Preorder: your shirt is printed after the 7-day drop closes and arrives about 2 to 3 weeks after that." },
    },
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    shipping_address_collection: { allowed_countries: SHIP_TO },
    shipping_options: [{
      shipping_rate_data: {
        type: "fixed_amount",
        display_name: SHIPPING.label,
        fixed_amount: { amount: SHIPPING.amount, currency: "usd" },
      },
    }],
    line_items: items.map(i => ({
      quantity: i.qty,
      price_data: {
        currency: "usd",
        unit_amount: unitPrice(i.size),
        product_data: {
          name: `${PRODUCTS[i.id].name} (${PRODUCTS[i.id].color}), size ${i.size}`,
          images: [`${site}/${PRODUCTS[i.id].image}`],
        },
      },
    })),
    metadata: { items: encodeItems(items), drop: "001" },
    payment_intent_data: { description: "Rent Coat Co. Drop 001 preorder", metadata: { items: encodeItems(items) } },
  };

  try {
    const session = await stripe("checkout/sessions", { method: "POST", params });
    return json({ url: session.url });
  } catch (e) {
    console.error("checkout failed", e.message);
    return json({ error: "Checkout is having trouble right now. Try again in a minute." }, 502);
  }
};

export const config = { path: "/api/checkout" };
