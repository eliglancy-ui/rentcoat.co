# Rent Coat Co. — project notes for Claude

Faith streetwear for young Latter-day Saints (rentcoat.co), run by Eli, a high school senior in Holly Springs, NC.
Store opens **Black Friday, Nov 27, 2026, 10 AM ET**. Read this first; don't re-explore the repo to rediscover it.

## Rules (always)
- Code goes on a branch with a draft PR. **Merge only when Eli says "merge"** (squash, via `gh api .../pulls/N/merge`; mark ready first with `POST .../pulls/N/ccr/ready_for_review`). GraphQL is blocked here: use `gh api` REST.
- Never post, send, spend money, place orders or contact anyone without Eli's explicit OK. Never handle passwords, 2FA codes or API keys (keys are pasted by Eli into HQ → Setup).
- Honest numbers only; never invent reviews, claims, discounts or "was" prices. Quote scripture only word for word with the reference.
- No model IDs in commits/PRs. Customer copy: natural human voice. Chat with Eli: short and direct.
- @whatisanldsmission: Instagram only, church content, never mentions Rent Coat. Hoodies carry words only (He Rent His Coat hoodie is the exception), no drawstrings. Tees/hoodies are "boxy and oversized".
- School nights: lights out 9:30 PM; open late replies with a bedtime reminder.
- rentcoat.co, tapstitch.com and most sites are blocked from the session's network: use the TinyFish tools to read the web.

## Stack
Static site in `public/` + Netlify Functions (`netlify/functions/*.mjs`) + one edge function. No build step: generated pages are committed.
- **Products, prices, sale, shipping:** `netlify/lib/store.mjs` (single source of truth). Tees $45 regular, **$30 Black Friday sale** (`SALE`, opening → Dec 1 00:00 ET); hoodies $48; sweats $55; Steadfast Sweatsuit $78; dad cap $32; stickers $6. Shipping $5.99, free ≥ $60. Checkout closed Sundays.
- **Makers:** Tapstitch (tees RU0014, hoodies R00286, sweats; no API — Eli places orders by hand from HQ → Orders). Printful only for the dad cap and stickers (automatic). Costs in `hq.mjs` `COST`.
- **Fit & size charts:** `netlify/lib/fit.mjs` (hoodie and tee charts from Tapstitch spec pages; sweats chart pending the exact blank code).
- **Storefront:** `node scripts/build-shop.mjs` regenerates `public/shop/` (collection + one page per design) and `public/size-guide/`. Run it after any product/price/fit change. Studio photos: `python3 scripts/studio-photos.py` → `public/images/studio/`.
- **Home page:** `public/index.html` (big: ~2,000 lines; holds the bag + Stripe embedded checkout; bag is `localStorage "rc-bag"`, `/?bag=1` opens it). Read only the part you need.
- **Checkout/orders:** `checkout.mjs`, `stripe-webhook.mjs` (Stripe API 2024-06-20). `config.mjs` serves `/api/config` to the site.
- **Edge function** `netlify/edge-functions/availability.ts`: flips schema.org offers to InStock at opening and tee prices to $45 after the sale.
- **Feeds/SEO:** `/products.xml` (`feed.mjs`, Meta + Google Merchant), `public/llms.txt`, `sitemap.xml`, `robots.txt`. Keep price text consistent across pages when prices change (grep for the old price).

## HQ (private back office, rentcoat.co/hq, header `x-hq-key` = ADMIN_KEY)
- UI: `public/hq/index.html` (tabs: Today, Orders, Posts, Inbox, Mo, Products, Setup; installable PWA).
- API: `netlify/functions/hq.mjs`. Posting engine: `netlify/lib/social.mjs` (Instagram feed/carousel/reel/story, Facebook Page, TikTok drafts; per-post `targets`). Scheduler: `hq-scheduler.mjs` (every 10 min posts approved + scheduled posts). OAuth: `connect.mjs`. Keys/tokens: `netlify/lib/vault.mjs` (Netlify Blobs).
- Mo (the assistant) = Claude in `hq.mjs` with tools to draft posts (max 7, real product photos via `product_id`).
- Add posts for Eli to review by committing to `public/hq/seed.json` (images under `public/media/`).
- AI media: Cloudflare Workers AI (images), fal.ai (video, try-on) with a monthly cap.

## Testing
No test suite. Check syntax with `node --check`, test logic with small node scripts using mocked `fetch`, and render pages with Playwright (preinstalled; `createRequire(import.meta.url)("playwright")` from the scratchpad) against a tiny static server, mocking `/api/config` and `/api/hq/*`.

## Open items (Nov 18)
Sweats blank code (for its size chart); real sample photos and measurements when samples arrive; Meta app + config (add `instagram_manage_comments`, `instagram_manage_insights`); TikTok app review; Resend DNS; shopping feed into Commerce Manager / Merchant Center; homepage restyle to match `/shop/`.
