// GET /api/health  ->  is checkout wired up? Reports only ok / missing / error per service, never a key or secret.
import { stripe, printful, json } from "../lib/store.mjs";

const check = async (fn) => {
  try { return { ok: true, ...(await fn()) }; }
  catch (e) { return { ok: false, error: /not set/.test(e.message) ? "missing" : e.message.replace(/(sk|rk|whsec)_\w+/g, "[hidden]").slice(0, 120) }; }
};

export default async () => {
  const [stripeCheck, printfulCheck] = await Promise.all([
    check(async () => ({ livemode: (await stripe("balance")).livemode })),
    check(async () => { await printful("store"); return {}; }),
  ]);
  const res = json({
    stripe: stripeCheck,
    stripeWebhookSecret: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    stripeTax: process.env.STRIPE_TAX === "on",
    printful: printfulCheck,
    context: process.env.CONTEXT || "unknown",
  });
  res.headers.set("Cache-Control", "no-store");
  return res;
};

export const config = { path: "/api/health" };
