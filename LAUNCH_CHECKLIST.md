# Drop 001 launch checklist

Launch week opens **Sat Nov 14, 2026, 10:00 AM ET** and closes **Sat Nov 21, 10:00 AM ET**. Every launch order must ship by **Tue Dec 8** (promised in `terms.html` and `policies.html`).

## Status, Nov 1 (checked by Claude)
- **Done:** Netlify form detection is on, and the `reminders` form exists (1 submission so far, Oct 23).
- **Done:** `/api/config` shows the right dates (opens Nov 14 10:00 AM ET, closes Nov 21 10:00 AM ET), prices ($35/$38 launch, $40/$43 after) and $5.99 shipping.
- **Done:** at phone width the countdown shows real numbers, there's no sideways scroll, and the "Opens Nov 14" buttons show the reminder message. `/api/checkout` answers "Launch week hasn't started yet", as it should. The full bag-to-Stripe test can only run once the shop opens.
- **Done:** the launch email is a Gmail draft in eliglancy@gmail.com (subject "Drop 001 is open: $35 tees until Saturday"), with no recipients yet. Add the reminder list as BCC on Nov 14. Move it to the Rent Coat inbox if you send from there.
- **Found:** NC sales tax. Rent Coat is based in NC, so NCDOR says it must register to collect sales tax on NC sales. Registration is free and online at ncdor.gov, and the account number usually comes right away. The $100,000 threshold applies to sellers outside NC, so other states don't apply yet. Not tax advice; confirm with NCDOR.
- **Needs you:** Stripe live key, Stripe webhook, receipts, Printful card, `ADMIN_KEY`, the Sunday decision, people wearing the shirts, and reels. These live in your accounts or need your call.

## By Fri Nov 6: things that can break orders
- [ ] **Stripe live key.** Netlify > Site configuration > Environment variables: `STRIPE_SECRET_KEY` starts with `sk_live_`.
- [ ] **Stripe webhook.** Stripe (live mode) > Developers > Webhooks points at `https://rentcoat.co/api/stripe-webhook`, and `STRIPE_WEBHOOK_SECRET` in Netlify is that endpoint's live signing secret.
- [ ] **Printful.** `PRINTFUL_TOKEN` is set, and a card or balance is on file in Printful (drafts are charged when you confirm them).
- [ ] **Stripe receipts.** Stripe > Settings > Customer emails > successful payments is on.
- [ ] **NC sales tax.** Ask NC Department of Revenue whether you need a seller's permit. If you register, add it in Stripe Tax and set `STRIPE_TAX=on`, then redeploy.
- [x] **Reminder form.** Netlify > Forms > form detection is enabled. Submit a test signup on the home page and see it arrive.
- [ ] **Admin key.** `ADMIN_KEY` is set; `/api/stats?key=...` loads.

## By Tue Nov 10: sales and content
- [ ] Decide on the launch-weekend Sunday (Nov 15). Keep the pause, or set `CLOSED_SUNDAYS=off` for launch week and redeploy.
- [x] Merge the size-chart PR (merged Nov 1). Still check the 2XL length against Shaka Wear's spec.
- [ ] 5-10 people wearing the shirts in photos or reels, ready to post Nov 14.
- [ ] About 10 reels made and captioned for Nov 1-14 (countdown, Guess the Verse, the story behind each shirt).
- [x] Launch email to the reminder list written and ready (Gmail draft) (BCC, drop news only, as `policies.html` promises).
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

## Later (after launch week)
- [ ] Checkout look: replace the plain dark green panel with a strong photo of one of the shirts. Stripe's hosted checkout only takes colors, an icon and a logo, so this needs Stripe Embedded Checkout on a rentcoat.co page with the photo beside it. Build it on a branch after Nov 21 and test with a real order. (Stripe branding set Nov 1: brand #16201B, accent #C9A45C, flag icon, font Inter.)

## By Tue Dec 8
- [ ] Every launch order has a tracking number. If any won't make it, email that buyer a new date with the full-refund option, as the terms promise.
