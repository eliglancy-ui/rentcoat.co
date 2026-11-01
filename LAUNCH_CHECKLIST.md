# Drop 001 launch checklist

Launch week opens **Sat Nov 14, 2026, 10:00 AM ET** and closes **Sat Nov 21, 10:00 AM ET**. Every launch order must ship by **Tue Dec 8** (promised in `terms.html` and `policies.html`).

## By Fri Nov 6: things that can break orders
- [ ] **Stripe live key.** Netlify > Site configuration > Environment variables: `STRIPE_SECRET_KEY` starts with `sk_live_`.
- [ ] **Stripe webhook.** Stripe (live mode) > Developers > Webhooks points at `https://rentcoat.co/api/stripe-webhook`, and `STRIPE_WEBHOOK_SECRET` in Netlify is that endpoint's live signing secret.
- [ ] **Printful.** `PRINTFUL_TOKEN` is set, and a card or balance is on file in Printful (drafts are charged when you confirm them).
- [ ] **Stripe receipts.** Stripe > Settings > Customer emails > successful payments is on.
- [ ] **NC sales tax.** Ask NC Department of Revenue whether you need a seller's permit. If you register, add it in Stripe Tax and set `STRIPE_TAX=on`, then redeploy.
- [ ] **Reminder form.** Netlify > Forms > form detection is enabled. Submit a test signup on the home page and see it arrive.
- [ ] **Admin key.** `ADMIN_KEY` is set; `/api/stats?key=...` loads.

## By Tue Nov 10: sales and content
- [ ] Decide on the launch-weekend Sunday (Nov 15). Keep the pause, or set `CLOSED_SUNDAYS=off` for launch week and redeploy.
- [ ] Merge the size-chart PR after checking the 2XL length against Shaka Wear's spec.
- [ ] 5-10 people wearing the shirts in photos or reels, ready to post Nov 14.
- [ ] About 10 reels made and captioned for Nov 1-14 (countdown, Guess the Verse, the story behind each shirt).
- [ ] Launch email to the reminder list written and ready (BCC, drop news only, as `policies.html` promises).
- [ ] Optional: make one hoodie or cap live (`live: true` in `netlify/lib/store.mjs`) for a bigger order size.

## Fri Nov 13: day before
- [ ] `https://rentcoat.co/api/config` shows the right dates and prices.
- [ ] Countdown on the home page shows real numbers, not dashes.
- [ ] Bag works on a phone: add each shirt in two sizes, open checkout up to the Stripe page (expect "not open yet" before launch).

## Sat Nov 14: launch
- [ ] 10:00 AM ET: place one real order yourself. Confirm the Stripe payment, the receipt email, and a Printful **draft** order.
- [ ] Send the reminder email and post the launch reel on Instagram and TikTok.
- [ ] Check Netlify function logs for `ORDER NEEDS MANUAL ENTRY` each evening of launch week.
- [ ] Request a re-crawl of the home page in Google Search Console.

## Sat Nov 21: launch week closes
- [ ] After 10:00 AM ET, review every Printful draft against Stripe payments and confirm them all that day.
- [ ] Update the site for regular prices: dates and price copy on the home, product and keyword pages, `llms.txt`, and the structured data (`priceValidUntil`, `availabilityStarts`, `availabilityEnds`). The README's "Before each drop" list covers each spot.
- [ ] Bump `<lastmod>` in `sitemap.xml` and ping IndexNow.

## By Tue Dec 8
- [ ] Every launch order has a tracking number. If any won't make it, email that buyer a new date with the full-refund option, as the terms promise.
