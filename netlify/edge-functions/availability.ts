// Keeps the product structured data (schema.org Offer availability) true to the clock.
// Before the store opens nothing can be ordered, so the static pages say OutOfStock with availabilityStarts
// (the opening time). From the opening time on, this rewrites those offers to InStock on the fly, so search
// engines and AI search tools see what a customer sees, with no redeploy at 10 AM on opening day.
// The opening time matches netlify/lib/store.mjs (DROP.opens); DROP_OPENS overrides both.
import type { Config, Context } from "@netlify/edge-functions";

const OPENS = Netlify.env.get("DROP_OPENS") || "2026-11-27T10:00:00-05:00";

export default async (_req: Request, context: Context) => {
  const res = await context.next();
  if (Date.now() < Date.parse(OPENS)) return res;
  if (!(res.headers.get("content-type") || "").includes("text/html")) return res;
  const html = await res.text();
  const out = html
    .replaceAll('"availability": "https://schema.org/OutOfStock"', '"availability": "https://schema.org/InStock"')
    .replace(/"availabilityStarts": "[^"]*",\s*/g, "");
  const headers = new Headers(res.headers);
  headers.delete("content-length");
  return new Response(out, { status: res.status, headers });
};

export const config: Config = {
  path: ["/", "/index.html", "/title-of-liberty-shirt", "/title-of-liberty-shirt/", "/curelom-shirt", "/curelom-shirt/"],
};
