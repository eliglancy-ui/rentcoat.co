// Builds the storefront from netlify/lib/store.mjs and netlify/lib/fit.mjs:
//   public/shop/index.html            the collection
//   public/shop/<group>/index.html    one page per design (colors of a design share a page)
//   public/size-guide/index.html      every size chart
// Run after changing products, prices or fit data:  node scripts/build-shop.mjs
// The bag is shared with the home page (localStorage "rc-bag"); checkout stays on the home page (/?bag=1 opens it).
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { LINE, SALE, DROP } from "../netlify/lib/store.mjs";
import { FIT, SIZES, inches } from "../netlify/lib/fit.mjs";

const SITE = "https://rentcoat.co";
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const $ = c => `$${(c / 100).toFixed(c % 100 ? 2 : 0)}`;
const live = Object.entries(LINE).filter(([, p]) => p.live).map(([id, p]) => ({ id, ...p }));
const groups = new Map();
for (const p of live) (groups.get(p.group) || groups.set(p.group, []).get(p.group)).push(p);
const saleOn = Date.now() < Date.parse(SALE.ends);
const onSale = p => saleOn && SALE.kinds.includes(p.kind);
const priceOf = (p, size = "M") => (p.price[size] ?? p.price.default);
const saleOf = (p, size = "M") => SALE.price[size] ?? SALE.price.default;
const studio = id => existsSync(`public/images/studio/${id}-studio.jpg`);
const photos = p => {
  const list = [];
  if (studio(p.id)) list.push({ src: `images/studio/${p.id}-studio.jpg`, alt: `${p.name}, ${p.color}, back` });
  for (const i of p.images) list.push({ src: i.src, alt: `${p.name}, ${p.color}${i.label ? `, ${i.label.toLowerCase()}` : ""}` });
  if (existsSync(`public/images/studio/${p.id}-detail.jpg`)) list.push({ src: `images/studio/${p.id}-detail.jpg`, alt: `${p.name}: close-up of the print` });
  if (existsSync(`public/images/studio/${p.id}-fit.jpg`)) list.push({ src: `images/studio/${p.id}-fit.jpg`, alt: `${p.name} styled with the Press Forward Sweats and the dad cap` });
  return list;
};
const HOOK = {
  "cureloms-tee": "Nobody knows what a curelom is. Wear one anyway.", "title-of-liberty-tee": "The verse the brand is named for.",
  "liahona-compass-tee": "By small means.", "rejoice-tee": "The 2027 youth theme, made to wear.", "great-joy-tee": "The Christmas shirt.",
  "he-rent-his-coat-hoodie": "Our story, across your back.", "go-and-do-tee": "For the hard things.", "service-club-tee": "Membership: everyone.",
  "lehis-tent-tee": "The shortest verse in the book.", "steadfast-hoodie": "Steady when it counts.", "forgiven-hoodie": "Wear the good news.",
  "press-forward-sweats": "Keep moving.", "steadfast-set": "One verse, two pieces.", "flag-cap": "The flag, stitched.", "sticker-flag": "Put the verse on everything.",
};
const KIND_TAB = { Tee: "tees", Hoodie: "hoodies", Sweats: "sets", Set: "sets", Cap: "extras", Sticker: "extras" };
const flagSvg = `<svg viewBox="0 0 92 100" aria-hidden="true"><circle cx="11" cy="5" r="5" fill="currentColor"/><rect x="8" y="8" width="6" height="92" rx="2" fill="currentColor"/><path d="M14 14 H88 L80 22 L91 30 L78 37 L89 45 L76 51 L86 58 H14 Z" fill="#A83A2C"/></svg>`;

function head({ title, desc, path, image, jsonld }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}${path}">
<meta property="og:type" content="website"><meta property="og:site_name" content="Rent Coat Co.">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${SITE}${path}"><meta property="og:image" content="${SITE}/${esc(image)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#F3EFE7">
<link rel="icon" href="/images/favicon.svg" type="image/svg+xml">
<link rel="preload" href="/fonts/archivo-variable-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/shop/shop.css">
<script defer src="/vendor/motion-14.14.0.js"></script>
<script defer src="/vendor/anime-4.5.0.min.js"></script>
<script defer src="/js/fx.js"></script>
${jsonld ? `<script type="application/ld+json">\n${JSON.stringify(jsonld, null, 1)}\n</script>` : ""}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<div class="ann">${saleOn ? `<b>Black Friday</b> · every tee $30 through Cyber Monday · free US shipping on $60+` : `Free US shipping on $60+ · printed to order in the US`}</div>
<header class="hdr"><div class="in">
  <button class="menu-btn" aria-label="Menu" aria-expanded="false" onclick="const n=document.querySelector('.hdr nav');n.classList.toggle('open');this.setAttribute('aria-expanded',n.classList.contains('open'))"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 7h18M3 12h18M3 17h18"/></svg></button>
  <nav aria-label="Shop"><a href="/shop/">Shop all</a><a href="/shop/?f=tees">Tees</a><a href="/shop/?f=hoodies">Hoodies</a><a href="/shop/?f=sets">Sets</a><a href="/about.html">Our story</a></nav>
  <a class="logo" href="/" aria-label="Rent Coat Co. home">${flagSvg}RENT COAT CO.</a>
  <div class="right"><a class="hide-sm" href="/size-guide/">Size guide</a><a href="/?bag=1" aria-label="Bag">Bag<span class="bagc" id="bagc" hidden>0</span></a></div>
</div></header>
<main id="main">`;
}
const foot = `</main>
<footer class="ftr"><div class="cols">
  <div><p class="big">Carry<br>the verse.</p><p>Faith streetwear for young Latter-day Saints. Every design starts with a Book of Mormon reference.</p></div>
  <div><h4>Shop</h4><a href="/shop/">Shop all</a><a href="/shop/?f=tees">Tees</a><a href="/shop/?f=hoodies">Hoodies</a><a href="/shop/?f=sets">Sets</a><a href="/gift-card/">Gift card</a></div>
  <div><h4>Help</h4><a href="/size-guide/">Size guide</a><a href="/policies.html">Shipping &amp; returns</a><a href="/#faq">FAQ</a><a href="mailto:rentcoat.co@gmail.com">Contact</a></div>
  <div><h4>Follow</h4><a href="https://www.instagram.com/rentcoat.co" rel="noopener">Instagram</a><a href="https://www.tiktok.com/@rentcoat.co" rel="noopener">TikTok</a><a href="/about.html">Our story</a></div>
</div>
<p class="legal">© ${new Date().getFullYear()} Rent Coat Co. · <a style="display:inline" href="/terms.html">Terms</a> · <a style="display:inline" href="/privacy.html">Privacy</a><br>Rent Coat Co. is an independent clothing brand. It is not affiliated with, sponsored by, or endorsed by The Church of Jesus Christ of Latter-day Saints.</p>
</footer>
<script>try{const n=JSON.parse(localStorage.getItem("rc-bag")||"[]").reduce((a,l)=>a+(l.qty||0),0);const b=document.getElementById("bagc");if(n){b.textContent=n;b.hidden=false}}catch(e){}</script>
</body>
</html>
`;

function priceHtml(p, size = "M") {
  return onSale(p) ? `<span class="price on" data-p="${p.id}"><span class="now">${$(saleOf(p, size))}</span><s>${$(priceOf(p, size))}</s></span>` : `<span class="price" data-p="${p.id}"><span class="now">${$(priceOf(p, size))}</span></span>`;
}
function card(g, pieces) {
  const p = pieces[0], ph = photos(p);
  return `<a class="card" href="/shop/${g}/" data-tab="${KIND_TAB[p.kind] || "extras"}">
  <div class="ph">${onSale(p) ? `<span class="badge sale">Black Friday</span>` : p.kind === "Set" ? `<span class="badge">Best value</span>` : ""}<img class="a" src="/${ph[0].src}" alt="${esc(ph[0].alt)}" loading="lazy" width="800" height="1000">${ph[1] ? `<img class="b" src="/${ph[1].src}" alt="" loading="lazy" width="800" height="1000">` : ""}</div>
  <h3>${esc(p.kind === "Sticker" ? "Die-Cut Stickers" : p.name)}</h3>
  <div class="meta"><span>${pieces.length > 1 ? `${pieces.length} designs` : esc(p.color)}</span>${priceHtml(p)}</div>
</a>`;
}

function chartTable(kind) {
  const f = FIT[kind];
  if (!f?.chart) return "";
  const t = unit => `<table class="chart" data-unit="${unit}"${unit === "cm" ? " hidden" : ""}><thead><tr><th>${unit === "in" ? "Inches" : "Centimeters"}</th>${SIZES.map(s => `<th>${s}</th>`).join("")}</tr></thead><tbody>${f.chart.rows.map(([r]) => `<tr><td>${r}</td>${f.chart.cm[r].map(v => `<td>${unit === "in" ? inches(v).toFixed(1) : v}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  return `<div class="unit" role="group" aria-label="Units"><button type="button" data-u="in" aria-pressed="true">in</button><button type="button" data-u="cm" aria-pressed="false">cm</button></div>${t("in")}${t("cm")}<p class="small">Measured flat. ${esc(f.source)}</p>`;
}
const howTo = kind => FIT[kind]?.chart ? `<div class="howto">${FIT[kind].chart.rows.map(([r, how]) => `<div><b>${r}</b><span class="small">${how}</span></div>`).join("")}</div>` : "";

function productPage(g, pieces) {
  const p = pieces[0], f = FIT[p.kind] || FIT.Tee, ph = photos(p), apparel = !["Cap", "Sticker"].includes(p.kind);
  const others = [...groups.entries()].filter(([k]) => k !== g);
  const recIds = (p.kind === "Hoodie" || p.kind === "Tee") ? ["press-forward-sweats", "flag-cap", "steadfast-set", "sticker-flag"] : ["steadfast-hoodie", "title-of-liberty-tee", "he-rent-his-coat-hoodie", "liahona-compass-tee"];
  const recs = recIds.filter(k => k !== g && groups.has(k)).slice(0, 4);
  const title = p.kind === "Sticker" ? "Die-Cut Stickers" : p.name;
  const desc = `${title}${p.kind === "Sticker" ? "" : ` in ${p.color}`}. ${p.blurb} ${apparel ? `${f.fit} fit.` : ""} ${p.ref ? `${p.ref}.` : ""}`.replace(/\s+/g, " ").trim();
  const offers = pieces.flatMap(q => q.sizes.map(size => ({ "@type": "Offer", sku: q.variants[size], name: `${q.name} (${q.color}, ${size})`, price: ((onSale(q) ? saleOf(q, size) : priceOf(q, size)) / 100).toFixed(2), ...(onSale(q) ? { priceValidUntil: "2026-11-30" } : {}),
    priceCurrency: "USD", availability: "https://schema.org/OutOfStock", availabilityStarts: DROP.opens, itemCondition: "https://schema.org/NewCondition", url: `${SITE}/shop/${g}/` })));
  const jsonld = { "@context": "https://schema.org", "@type": "Product", name: title, description: p.blurb, brand: { "@type": "Brand", name: "Rent Coat Co." }, image: ph.slice(0, 4).map(x => `${SITE}/${x.src}`), sku: p.id, offers };
  const data = pieces.map(q => ({ id: q.id, name: q.name, color: q.color, kind: q.kind, sizes: q.sizes, price: q.price, photos: photos(q) }));
  return head({ title: `${title} | Rent Coat Co.`, desc, path: `/shop/${g}/`, image: ph[0].src, jsonld }) + `
<div class="pdp">
  <div>
    <div class="gallery" id="gal">${ph.map((x, i) => `<figure><img src="/${x.src}" alt="${esc(x.alt)}" ${i ? 'loading="lazy"' : 'fetchpriority="high"'} width="800" height="1000"></figure>`).join("")}</div>
    <div class="dots" id="dots">${ph.map((_, i) => `<i${i ? "" : ' class="on"'}></i>`).join("")}</div>
  </div>
  <div class="info">
    <p class="crumbs mono"><a href="/shop/">Shop</a> / <a href="/shop/?f=${KIND_TAB[p.kind] || "extras"}">${esc(p.kind === "Set" || p.kind === "Sweats" ? "Sets" : p.kind === "Cap" || p.kind === "Sticker" ? "Extras" : p.kind + "s")}</a></p>
    <span class="mono">${esc(p.ref || "")}</span>
    <h1>${esc(title)}</h1>
    <p class="hook">${esc(HOOK[g] || "")}</p>
    <p id="price">${priceHtml(p, p.sizes[0] === "OS" ? "OS" : "M")}</p>
    ${onSale(p) ? `<p class="salenote">Black Friday price through Cyber Monday, Nov 30. Tees are $45 after that.</p>` : `<p class="salenote" style="color:var(--mute)">${p.kind === "Set" ? "Hoodie and sweats bought separately: $103." : "Free US shipping on orders of $60 or more."}</p>`}
    ${pieces.length > 1 ? `<div class="opt"><div class="lab"><span>Design</span><span class="small" id="cname">${esc(p.color)}</span></div><div class="sw">${pieces.map((q, i) => `<a href="#${q.id}" data-id="${q.id}" title="${esc(q.color)}" style="background:${esc(q.swatch)}"${i ? "" : ' aria-current="true"'}></a>`).join("")}</div></div>`
      : `<div class="opt"><div class="lab"><span>Color</span><span class="small">${esc(p.color)}</span></div><div class="sw"><a style="background:${esc(p.swatch)}" aria-current="true" title="${esc(p.color)}"></a></div></div>`}
    ${p.sizes[0] === "OS" ? "" : `<div class="opt"><div class="lab"><span>Size</span>${f.chart ? `<button type="button" class="linkbtn" id="open-chart">Size chart</button>` : `<a class="linkbtn" href="/size-guide/">Size guide</a>`}</div>
      <div class="sizes" role="group" aria-label="Size">${p.sizes.map(s => `<button type="button" data-size="${s}" aria-pressed="false">${s}</button>`).join("")}</div>
      <p class="fitline"><b>${esc(f.fit)} fit.</b> ${esc(f.advice)}</p></div>`}
    <button class="add" id="add" ${p.sizes[0] === "OS" ? "" : "disabled"}>${p.sizes[0] === "OS" ? "Add to bag" : "Pick a size"}</button>
    <p class="small" id="opens" hidden style="margin:10px 0 0">The store opens Black Friday, Nov 27 at 10 AM Eastern. Add it to your bag now; checkout opens then.</p>
    <div class="added" id="added" role="status"><span>Added to your bag.</span><a href="/?bag=1">Checkout →</a></div>
    <div class="trust">
      <div><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/></svg>Ships in 10 to 17 days, printed to order in the US</div>
      <div><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 12l5 5L20 6"/></svg>Free US shipping on $60+</div>
    </div>
    <div class="acc">
      <details open><summary>The story</summary><div class="body"><p style="margin-top:0">${esc(p.blurb)}</p>${p.refUrl && p.verse ? `<p style="margin-bottom:0"><a href="${esc(p.refUrl)}" target="_blank" rel="noopener">Read ${esc(p.ref)} ↗</a></p>` : ""}</div></details>
      <details><summary>Fit &amp; fabric</summary><div class="body"><p style="margin-top:0">${esc(f.line)}</p><ul>${f.details.map(d => `<li>${esc(d)}</li>`).join("")}</ul></div></details>
      ${f.chart ? `<details><summary>Size chart</summary><div class="body">${chartTable(p.kind)}</div></details>` : ""}
      <details><summary>Shipping &amp; returns</summary><div class="body"><p style="margin-top:0">Every piece is printed after you order, then ships in 10 to 17 days. Shipping is $5.99 in the US, free on orders of $60 or more.</p><p style="margin-bottom:0">Because it's made for you, we can't take back fit returns. If anything arrives damaged or wrong, email <a href="mailto:rentcoat.co@gmail.com">rentcoat.co@gmail.com</a> within 30 days and we'll make it right. <a href="/policies.html">Full policy</a></p></div></details>
      <details><summary>Care</summary><div class="body">${esc(f.care)}</div></details>
    </div>
  </div>
</div>
${p.ref ? `<section class="band"><span class="mono">${esc(p.ref)}</span><q>${esc(HOOK[g] || p.name)}</q>${p.refUrl && p.verse ? `<p style="margin:22px 0 0"><a href="${esc(p.refUrl)}" target="_blank" rel="noopener">Read the verse ↗</a></p>` : ""}</section>` : ""}
${recs.length ? `<section class="recs"><h2>Complete the fit</h2><div class="grid">${recs.map(k => card(k, groups.get(k))).join("")}</div></section>` : ""}
${f.chart ? `<dialog class="sheet" id="chart" aria-labelledby="chart-h"><div class="in"><button class="x" aria-label="Close" onclick="this.closest('dialog').close()">×</button>
  <span class="mono">${esc(title)}</span><h2 id="chart-h">Size chart</h2><p class="small" style="margin:6px 0 16px"><b>${esc(f.fit)} fit.</b> ${esc(f.advice)}</p>${chartTable(p.kind)}${howTo(p.kind)}
  <p class="small" style="margin-top:18px">Tip: lay a shirt or hoodie you love flat and compare. <a href="/size-guide/">Full size guide</a></p></div></dialog>` : ""}
<script>
(() => {
  const P = ${JSON.stringify(data)}, SALE = ${JSON.stringify({ ends: SALE.ends, kinds: SALE.kinds, price: SALE.price })};
  let cur = P[0], size = cur.sizes[0] === "OS" ? "OS" : null;
  const $ = s => document.querySelector(s), money = c => "$" + (c / 100).toFixed(c % 100 ? 2 : 0);
  const pick = (t, s) => t[s] ?? t.default, on = () => Date.now() < Date.parse(SALE.ends) && SALE.kinds.includes(cur.kind);
  const paint = () => { const s = size && size !== "OS" ? size : (cur.sizes[0] === "OS" ? "OS" : "M"), reg = pick(cur.price, s);
    $("#price").innerHTML = on() ? '<span class="price on"><span class="now">' + money(pick(SALE.price, s)) + '</span><s>' + money(reg) + '</s></span>' : '<span class="price"><span class="now">' + money(reg) + '</span></span>'; };
  document.querySelectorAll("[data-size]").forEach(b => b.onclick = () => { size = b.dataset.size; document.querySelectorAll("[data-size]").forEach(x => x.setAttribute("aria-pressed", x === b)); const a = $("#add"); a.disabled = false; a.textContent = "Add to bag · " + size; paint(); });
  document.querySelectorAll(".sw [data-id]").forEach(a => a.onclick = e => { e.preventDefault(); cur = P.find(q => q.id === a.dataset.id); document.querySelectorAll(".sw a").forEach(x => x.toggleAttribute("aria-current", x === a));
    const n = $("#cname"); if (n) n.textContent = cur.color; $("#gal").innerHTML = cur.photos.map(x => '<figure><img src="/' + x.src + '" alt="' + x.alt.replace(/"/g, "&quot;") + '"></figure>').join(""); paint(); });
  $("#add").onclick = () => { if (!size) return; let bag = []; try { bag = JSON.parse(localStorage.getItem("rc-bag") || "[]"); } catch (e) {}
    if (!Array.isArray(bag)) bag = []; const n = bag.reduce((a, l) => a + (l.qty || 0), 0); if (n >= 10) { alert("Max 10 items per order."); return; }
    const l = bag.find(x => x.id === cur.id && x.size === size); if (l) l.qty++; else bag.push({ id: cur.id, size, qty: 1 });
    try { localStorage.setItem("rc-bag", JSON.stringify(bag)); } catch (e) {} $("#added").classList.add("on"); const c = $("#bagc"); if (c) { c.textContent = n + 1; c.hidden = false; } };
  const d = $("#chart"); if ($("#open-chart") && d) $("#open-chart").onclick = () => d.showModal();
  if (d) d.addEventListener("click", e => { if (e.target === d) d.close(); });
  document.querySelectorAll(".unit button").forEach(b => b.onclick = () => { document.querySelectorAll(".unit button").forEach(x => x.setAttribute("aria-pressed", x.dataset.u === b.dataset.u)); document.querySelectorAll("table.chart").forEach(t => t.hidden = t.dataset.unit !== b.dataset.u); });
  const g = $("#gal"), dots = [...document.querySelectorAll("#dots i")];
  g.addEventListener("scroll", () => { const i = Math.round(g.scrollLeft / g.clientWidth); dots.forEach((x, k) => x.classList.toggle("on", k === i)); }, { passive: true });
  if (location.hash) { const a = document.querySelector('.sw [data-id="' + location.hash.slice(1) + '"]'); if (a) a.click(); }
  if (Date.now() < Date.parse(${JSON.stringify(DROP.opens)})) $("#opens").hidden = false;
  paint();
})();
</script>` + foot;
}

function shopPage() {
  const list = [...groups.entries()];
  return head({ title: "Shop all | Rent Coat Co.", desc: "Shop Rent Coat Co.: boxy heavyweight tees, oversized hoodies, the Steadfast Sweatsuit, the dad cap and stickers. Every design starts with a Book of Mormon verse.", path: "/shop/", image: "images/studio/steadfast-hoodie-studio.jpg" }) + `
<div class="col-head"><div><span class="mono">The collection</span><h1>Carry<br>the verse.</h1><p>Heavyweight tees and oversized hoodies, each built on a Book of Mormon reference. Printed to order in the US.</p></div><a class="mono" href="/size-guide/">Size guide →</a></div>
<div class="filters" role="group" aria-label="Filter"><button data-f="all" aria-pressed="true">All</button><button data-f="tees" aria-pressed="false">Tees</button><button data-f="hoodies" aria-pressed="false">Hoodies</button><button data-f="sets" aria-pressed="false">Sweats &amp; sets</button><button data-f="extras" aria-pressed="false">Cap &amp; stickers</button></div>
<div class="grid" id="grid">${list.map(([g, ps]) => card(g, ps)).join("\n")}</div>
<script>
(() => { const set = f => { document.querySelectorAll("[data-f]").forEach(b => b.setAttribute("aria-pressed", b.dataset.f === f)); document.querySelectorAll("#grid .card").forEach(c => c.hidden = f !== "all" && c.dataset.tab !== f); };
  document.querySelectorAll("[data-f]").forEach(b => b.onclick = () => { set(b.dataset.f); history.replaceState(null, "", b.dataset.f === "all" ? "/shop/" : "/shop/?f=" + b.dataset.f); });
  const f = new URLSearchParams(location.search).get("f"); if (f) set(f); })();
</script>` + foot;
}

function guidePage() {
  const sec = (kind, name, blank) => `<section><span class="mono">${blank}</span><h2>${name}</h2><p><b>${esc(FIT[kind].fit)} fit.</b> ${esc(FIT[kind].advice)}</p>${chartTable(kind).replace(/class="unit"/, 'class="unit"')}${howTo(kind)}</section>`;
  return head({ title: "Size guide | Rent Coat Co.", desc: "Rent Coat Co. size charts for the boxy heavyweight tees and oversized hoodies, in inches and centimeters, and how to measure.", path: "/size-guide/", image: "images/studio/steadfast-hoodie-studio.jpg" }) + `
<div class="col-head"><div><span class="mono">Find your fit</span><h1>Size<br>guide.</h1><p>Every chart is measured flat. The easiest way to choose: lay a shirt or hoodie you already love on a table, measure it the same way, and compare.</p></div></div>
<div class="guide">
${sec("Tee", "Tees", "Heavyweight 300 gsm cotton · boxy")}
${sec("Hoodie", "Hoodies", "350 gsm fleece · oversized")}
<section><span class="mono">Sweats &amp; the Steadfast Sweatsuit</span><h2>Sweats</h2><p>${esc(FIT.Sweats.line)} ${esc(FIT.Sweats.advice)} Waist and length measurements go up here once our samples are measured. Questions before then? Email <a href="mailto:rentcoat.co@gmail.com">rentcoat.co@gmail.com</a>.</p></section>
<section><span class="mono">Dad cap &amp; stickers</span><h2>Extras</h2><p>The dad cap is one size with an adjustable strap. Stickers are 4 x 4 inches.</p></section>
</div>
<script>document.querySelectorAll(".guide section").forEach(s => s.querySelectorAll(".unit button").forEach(b => b.onclick = () => { s.querySelectorAll(".unit button").forEach(x => x.setAttribute("aria-pressed", x === b)); s.querySelectorAll("table.chart").forEach(t => t.hidden = t.dataset.unit !== b.dataset.u); }));</script>` + foot;
}

mkdirSync("public/shop", { recursive: true });
writeFileSync("public/shop/index.html", shopPage());
for (const [g, ps] of groups) { mkdirSync(`public/shop/${g}`, { recursive: true }); writeFileSync(`public/shop/${g}/index.html`, productPage(g, ps)); }
mkdirSync("public/size-guide", { recursive: true }); writeFileSync("public/size-guide/index.html", guidePage());
console.log(`built /shop/, ${groups.size} product pages, /size-guide/`);
