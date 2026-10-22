// GET /api/config  ->  the drop window, prices and shipping from netlify/lib/store.mjs.
// The website reads this on load, so the countdown and the checkout always use the same dates and prices.
import { CLOSED_SUNDAYS, DROP, PRICE, SHIPPING, json } from "../lib/store.mjs";

export default async () => {
  const res = json({ drop: DROP, price: PRICE, shipping: SHIPPING.amount, closedSundays: CLOSED_SUNDAYS, now: Date.now() });
  res.headers.set("Cache-Control", "no-store");
  return res;
};

export const config = { path: "/api/config" };
