// GET /products.xml: the product feed for Meta Commerce Manager (Facebook Shop, Instagram product tags, catalog ads)
// and Google Merchant Center (free Shopping listings). One item per size; sizes of a piece share item_group_id.
// Prices and stock follow store.mjs: the Black Friday tee price is a sale_price with its dates, and before the store
// opens everything is a preorder with the opening date.
import { LINE, SALE, DROP } from "../lib/store.mjs";

const SITE = "https://rentcoat.co";
const CATEGORY = {
  Tee: "Apparel & Accessories > Clothing > Shirts & Tops", Hoodie: "Apparel & Accessories > Clothing > Activewear > Sweatshirts",
  Sweats: "Apparel & Accessories > Clothing > Pants", Set: "Apparel & Accessories > Clothing > Outfit Sets",
  Cap: "Apparel & Accessories > Clothing Accessories > Hats", Sticker: "Arts & Entertainment > Hobbies & Creative Arts > Arts & Crafts > Art & Crafting Materials > Embellishments & Trims > Decorative Stickers",
};
const x = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]);
const usd = c => `${(c / 100).toFixed(2)} USD`;
const iso = t => new Date(t).toISOString().replace(/\.\d{3}Z$/, "Z");

export function feedXml(now = Date.now()) {
  const opens = Date.parse(DROP.opens), before = now < opens;
  const saleEnds = Date.parse(SALE.ends), saleWindow = `${iso(Date.parse(SALE.starts))}/${iso(saleEnds)}`;
  const items = [];
  for (const [id, p] of Object.entries(LINE)) {
    if (!p.live) continue;
    const apparel = !["Cap", "Sticker"].includes(p.kind);
    for (const size of p.sizes) {
      const regular = (p.price[size] ?? p.price.default);
      const sale = SALE.kinds.includes(p.kind) && now < saleEnds ? (SALE.price[size] ?? SALE.price.default) : null;
      const imgs = p.images.map(i => `${SITE}/${i.src}`);
      items.push(`<item>
<g:id>${x(p.variants[size])}</g:id>
<g:item_group_id>${x(id)}</g:item_group_id>
<g:title>${x(`${p.name}${p.kind === "Sticker" ? `: ${p.color}` : ` (${p.color})`}`)}</g:title>
<g:description>${x(`${p.blurb || p.name}${apparel ? " Boxy, oversized fit. Printed to order in the US." : ""}${p.ref ? ` ${p.ref}.` : ""}`)}</g:description>
<g:link>${SITE}/#${x(p.group || id)}</g:link>
<g:image_link>${x(imgs[0])}</g:image_link>
${imgs.slice(1, 10).map(u => `<g:additional_image_link>${x(u)}</g:additional_image_link>`).join("\n")}
<g:brand>Rent Coat Co.</g:brand>
<g:condition>new</g:condition>
<g:availability>${before ? "preorder" : "in_stock"}</g:availability>
${before ? `<g:availability_date>${iso(opens)}</g:availability_date>` : ""}
<g:price>${usd(regular)}</g:price>
${sale ? `<g:sale_price>${usd(sale)}</g:sale_price>\n<g:sale_price_effective_date>${saleWindow}</g:sale_price_effective_date>` : ""}
<g:google_product_category>${x(CATEGORY[p.kind] || CATEGORY.Tee)}</g:google_product_category>
<g:identifier_exists>no</g:identifier_exists>
${apparel ? `<g:size>${x(size)}</g:size>\n<g:gender>unisex</g:gender>\n<g:age_group>adult</g:age_group>` : ""}
<g:color>${x(p.color)}</g:color>
<g:shipping><g:country>US</g:country><g:service>Standard</g:service><g:price>5.99 USD</g:price></g:shipping>
</item>`.replace(/\n\n+/g, "\n"));
    }
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
<title>Rent Coat Co.</title>
<link>${SITE}</link>
<description>Faith streetwear for young Latter-day Saints. Every design starts with a Book of Mormon verse.</description>
${items.join("\n")}
</channel>
</rss>`;
}

export default async () => new Response(feedXml(), { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=900" } });
export const config = { path: ["/products.xml"] };
