// Keeps the product structured data (schema.org Offer availability) true to the clock.
// Before the store opens nothing can be ordered, so the static pages say OutOfStock with availabilityStarts
// (the opening time). From the opening time on, this rewrites those offers to InStock on the fly, so search
// engines and AI search tools see what a customer sees, with no redeploy at 10 AM on opening day.
// The opening time matches netlify/lib/store.mjs (DROP.opens); DROP_OPENS overrides both.
import type { Config, Context } from "@netlify/edge-functions";

const OPENS = Netlify.env.get("DROP_OPENS") || "2026-11-27T10:00:00-05:00";
// The Black Friday tee sale (store.mjs SALE). The static pages carry the $30 sale price; once it ends this switches
// the tee offers and the product-page price to the regular $45, matching what checkout charges.
const SALE_ENDS = Netlify.env.get("SALE_ENDS") || "2026-12-01T00:00:00-05:00";

export default async (_req: Request, context: Context) => {
  const res = await context.next();
  const opens = Date.parse(OPENS);
  if (!Number.isFinite(opens) || Date.now() < opens) return res; // a malformed date never opens early
  if (!(res.headers.get("content-type") || "").includes("text/html")) return res;
  const html = await res.text();
  let out = html
    .replaceAll('"availability": "https://schema.org/OutOfStock"', '"availability": "https://schema.org/InStock"')
    .replace(/"availabilityStarts": "[^"]*",\s*/g, "");
  const ends = Date.parse(SALE_ENDS);
  if (Number.isFinite(ends) && Date.now() >= ends) out = out
    .replace(/"price": "30\.00",\s*"priceValidUntil": "[^"]*",/g, '"price": "45.00",')
    .replaceAll('<span class="price">$30 <s>$45</s></span>', '<span class="price">$45</span>');
  const headers = new Headers(res.headers);
  headers.delete("content-length");
  return new Response(out, { status: res.status, headers });
};

export const config: Config = {
  onError: "bypass", // if this ever fails, serve the page untouched rather than an error
  path: ["/", "/index.html", "/title-of-liberty-shirt", "/title-of-liberty-shirt/", "/curelom-shirt", "/curelom-shirt/"],
};
