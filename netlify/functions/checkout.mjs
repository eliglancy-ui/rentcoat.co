// POST /api/checkout  { items: [{ id, size, qty }], embedded? }  ->  { url } (Stripe-hosted page)
//   or, with embedded: true,  { clientSecret }  (Stripe Checkout shown inside rentcoat.co)
import { DROP, PRODUCTS, SHIP_TO, cleanCart, storePhase, shippingCents, shippingLabel, encodeItems, unitPrice, sizeLabel, stripe, json } from "../lib/store.mjs";

const closeDay = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short", month: "short", day: "numeric" });

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);

  const now = Date.now();
  const phase = storePhase(now);
  if (phase === "before") return json({ error: "The store opens Friday, Nov 27 at 10 AM Eastern. Your bag is saved until then." }, 409);
  if (phase === "sunday") return json({ error: "We're closed on Sundays. Your bag is saved, so check out on Monday." }, 409);
  const launch = phase === "launch";

  let items, embedded = false;
  try {
    // A real bag is well under 2 KB; refuse anything far bigger before parsing it.
    const text = await req.text();
    if (text.length > 10000) return json({ error: "Bad request." }, 413);
    const body = JSON.parse(text);
    items = cleanCart(body?.items);
    embedded = body?.embedded === true;
  } catch (e) {
    return json({ error: e instanceof SyntaxError ? "Bad request." : e.message }, 400);
  }

  const subtotal = items.reduce((n, i) => n + unitPrice(i.id, i.size, now) * i.qty, 0);
  const ship = shippingCents(subtotal);

  // On a deploy preview (Stripe test mode), send buyers back to the preview, not the live site.
  const preview = process.env.CONTEXT && process.env.CONTEXT !== "production";
  const site = (!preview && process.env.URL) || new URL(req.url).origin;
  // Set STRIPE_TAX=on in Netlify once the business is registered for NC sales tax and that registration is added in Stripe Tax.
  const tax = process.env.STRIPE_TAX === "on";
  const params = {
    mode: "payment",
    ...(embedded
      ? { ui_mode: "embedded", return_url: `${site}/thanks.html?session_id={CHECKOUT_SESSION_ID}` }
      : { success_url: `${site}/thanks.html?session_id={CHECKOUT_SESSION_ID}`, cancel_url: `${site}/#shop` }),
    // Stripe's shortest allowed lifetime, so a page opened just before the drop closes can't be paid hours later.
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    custom_text: {
      submit: { message: launch
        ? `Launch week preorder: your shirt is printed after launch week ends on ${closeDay.format(Date.parse(DROP.closes))} and arrives about 2 to 3 weeks after that. Made to order, so no fit returns. By paying, you agree to our terms of sale at rentcoat.co/terms.`
        : "Made to order: your shirt is printed after you order and usually arrives in 1 to 2 weeks. No fit returns. By paying, you agree to our terms of sale at rentcoat.co/terms." },
    },
    // "How did you find us?" so ad spend can be measured without a tracking pixel. Answers show on each payment in Stripe.
    custom_fields: [{
      key: "found_us",
      label: { type: "custom", custom: "How did you find us?" },
      type: "dropdown",
      dropdown: { options: [
        { label: "Instagram ad", value: "instagramad" },
        { label: "Instagram post", value: "instagrampost" },
        { label: "TikTok", value: "tiktok" },
        { label: "Google or another search", value: "search" },
        { label: "A friend", value: "friend" },
        { label: "Other", value: "other" },
      ] },
    }],
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    shipping_address_collection: { allowed_countries: SHIP_TO },
    shipping_options: [{
      shipping_rate_data: {
        type: "fixed_amount",
        display_name: shippingLabel(phase, ship === 0),
        fixed_amount: { amount: ship, currency: "usd" },
        ...(tax && { tax_behavior: "exclusive", tax_code: "txcd_92010001" }),
      },
    }],
    line_items: items.map(i => ({
      quantity: i.qty,
      price_data: {
        currency: "usd",
        unit_amount: unitPrice(i.id, i.size, now),
        ...(tax && { tax_behavior: "exclusive" }),
        product_data: {
          name: `${PRODUCTS[i.id].name} (${PRODUCTS[i.id].color}), ${sizeLabel(i.size)}`,
          images: [`${site}/${PRODUCTS[i.id].image}`],
          ...(tax && { tax_code: "txcd_30011000" }),
        },
      },
    })),
    ...(tax && { automatic_tax: { enabled: true } }),
    // "001" orders become Printful drafts, confirmed together after launch week; "shop" orders print right away.
    metadata: { items: encodeItems(items), drop: launch ? "001" : "shop" },
    payment_intent_data: { description: launch ? "Rent Coat Co. Drop 001 launch week preorder" : "Rent Coat Co. order", metadata: { items: encodeItems(items) } },
  };

  try {
    const session = await stripe("checkout/sessions", { method: "POST", params });
    return json(embedded ? { clientSecret: session.client_secret } : { url: session.url });
  } catch (e) {
    console.error("checkout failed", e.message);
    return json({ error: "Checkout is having trouble right now. Try again in a minute." }, 502);
  }
};

export const config = { path: "/api/checkout" };
