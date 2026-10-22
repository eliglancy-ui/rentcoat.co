# rentcoat.co

The Rent Coat Co. website and ordering system. No Shopify: customers fill a bag on the site, pay on a Stripe Checkout page, and each paid order becomes a **draft order in Printful** automatically. Drafts cost nothing until you confirm them, so after the 7-day preorder closes you review the drafts and confirm them all at once.

```
public/                     the website (what visitors see)
  index.html                home page: countdown, shirts, bag, FAQ
  thanks.html               page shown after someone pays
  policies.html             shipping, returns, privacy and contact
netlify/functions/
  config.mjs                /api/config: gives the page the drop dates, prices and shipping from store.mjs
  checkout.mjs              /api/checkout: turns the bag into a Stripe Checkout page
  stripe-webhook.mjs        /api/stripe-webhook: Stripe calls it after payment, it creates the Printful draft
  printful-variants.mjs     /api/printful-variants?key=...: lists your Printful variant IDs
netlify/lib/store.mjs       prices, shipping, drop dates, Printful variant IDs  <- the one file you edit
netlify.toml                tells Netlify where things are
```

## Settings you'll change

| What | Where |
| --- | --- |
| Drop dates (7-day window) | `DROP` in `netlify/lib/store.mjs`, or `DROP_OPENS` / `DROP_CLOSES` in Netlify environment variables (redeploy after changing them). The page reads them from `/api/config`, so the countdown and checkout always match. |
| Prices | `PRICE` in `store.mjs` (cents) |
| Shipping charge | `SHIPPING` in `store.mjs` |

The `DROP`, `PRICE` and `SHIPPING_CENTS` values at the bottom of `index.html` are only fallbacks for a preview without the server. Update them too if you want the preview to match, but the live site never uses them.
| Printful variant IDs | `variants` for each product in `store.mjs` |

## Environment variables (Netlify > Site configuration > Environment variables)

| Name | Value |
| --- | --- |
| `STRIPE_SECRET_KEY` | Stripe > Developers > API keys > Secret key (`sk_test_...` while testing, `sk_live_...` for real) |
| `STRIPE_WEBHOOK_SECRET` | Stripe > Developers > Webhooks > your endpoint > Signing secret (`whsec_...`) |
| `PRINTFUL_TOKEN` | Printful developer portal > private token |
| `PRINTFUL_STORE_ID` | Only if your Printful token covers more than one store (Printful's error will ask for a store ID) |
| `ADMIN_KEY` | Any long password you make up. Protects the variant-list page. |
| `STRIPE_TAX` | Leave unset until a parent registers the business for North Carolina sales tax and adds that registration in Stripe > Tax. Then set it to `on` and redeploy: Stripe adds sales tax at checkout (clothing and shipping). |

Never put these keys in the code or send them to anyone.

## How an order flows

1. Shopper adds shirts to the bag and taps Checkout.
2. `/api/checkout` checks the preorder window and the bag, then opens Stripe Checkout with US shipping at $5.99. The checkout page expires after 30 minutes.
3. Shopper pays with card, Apple Pay or Google Pay. Stripe emails the receipt.
4. Stripe calls `/api/stripe-webhook`. It checks Stripe's signature and creates a Printful draft order with the shipping address.
5. If anything is missing (like a variant ID), the payment is still safe in Stripe and Netlify's function log says `ORDER NEEDS MANUAL ENTRY` with the Stripe session ID.

## Drop reminder list

The "Get the reminder" box near the bottom of the home page is a Netlify Form called `reminders`. Turn it on once: Netlify > your site > Forms > Enable form detection, then redeploy. Signups show up under Forms > reminders, where you can download them as a CSV. Under Forms > Form notifications you can get an email for each signup.

When a drop opens, email the list (put the addresses in BCC so nobody sees anyone else's). The policies page promises we only email about drops, so keep it to that.
