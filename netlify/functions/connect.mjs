// OAuth callbacks for HQ's Connect buttons. Public on purpose (Meta and TikTok redirect the browser here), so every
// request must carry a state signed by HQ in the last 15 minutes.
//   GET /api/connect/meta/callback     Instagram (both accounts), the Facebook Page and the ad account in one login
//   GET /api/connect/tiktok/callback   TikTok (sends posts to Eli's TikTok drafts)
import { hydrate, setVault, setAccounts, checkState } from "../lib/vault.mjs";

const V = process.env.IG_GRAPH_VERSION || "v21.0";
const back = (origin, q) => Response.redirect(`${origin}/hq/?${new URLSearchParams(q)}#setup`, 302);
const IG_NAMES = { rentcoat: ["rentcoat.co", "rentcoatco", "rentcoat"], mission: ["whatisanldsmission"] };

export default async (req) => {
  const url = new URL(req.url), provider = url.pathname.split("/")[3];
  const code = url.searchParams.get("code"), state = url.searchParams.get("state");
  if (!["meta", "tiktok"].includes(provider)) return new Response("Not found", { status: 404 });
  if (!checkState(state, provider)) return back(url.origin, { error: "That connect link expired. Tap Connect again." });
  if (!code) return back(url.origin, { error: url.searchParams.get("error_description") || "Connection was cancelled." });
  await hydrate();
  const redirect = `${url.origin}/api/connect/${provider}/callback`;
  try {
    if (provider === "meta") {
      const id = process.env.META_APP_ID, secret = process.env.META_APP_SECRET;
      const g = async (path, q) => { const r = await fetch(`https://graph.facebook.com/${V}/${path}?${new URLSearchParams(q)}`); const d = await r.json(); if (!r.ok) throw new Error(d.error?.message || r.status); return d; };
      const short = await g("oauth/access_token", { client_id: id, client_secret: secret, redirect_uri: redirect, code });
      const long = await g("oauth/access_token", { grant_type: "fb_exchange_token", client_id: id, client_secret: secret, fb_exchange_token: short.access_token });
      const pages = (await g("me/accounts", { fields: "id,name,access_token,instagram_business_account{id,username}", access_token: long.access_token })).data || [];
      const ads = (await g("me/adaccounts", { fields: "account_id,name", access_token: long.access_token }).catch(() => ({ data: [] }))).data || [];
      const env = { META_USER_TOKEN: long.access_token }, found = { pages: pages.map(p => p.name), instagram: [], adAccount: null, at: Date.now() };
      for (const p of pages) {
        const ig = p.instagram_business_account, name = (ig?.username || "").toLowerCase();
        if (ig && IG_NAMES.rentcoat.includes(name)) { Object.assign(env, { IG_RENTCOAT_USER_ID: ig.id, IG_RENTCOAT_TOKEN: p.access_token, META_PAGE_ID: p.id, META_PAGE_TOKEN: p.access_token }); found.instagram.push("@" + ig.username); found.page = p.name; }
        else if (ig && IG_NAMES.mission.includes(name)) { Object.assign(env, { IG_MISSION_USER_ID: ig.id, IG_MISSION_TOKEN: p.access_token }); found.instagram.push("@" + ig.username); }
      }
      if (ads[0]) { env.META_AD_ACCOUNT_ID = ads[0].account_id; env.META_ADS_TOKEN = long.access_token; found.adAccount = ads[0].name; }
      await setVault(env); await setAccounts({ meta: found });
      return back(url.origin, { connected: "meta" });
    }
    const r = await fetch("https://open.tiktokapis.com/v2/oauth/token/", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_key: process.env.TIKTOK_CLIENT_KEY, client_secret: process.env.TIKTOK_CLIENT_SECRET, code, grant_type: "authorization_code", redirect_uri: redirect }) });
    const t = await r.json();
    if (!t.refresh_token) throw new Error(t.error_description || t.error || "TikTok didn't return a token");
    await setVault({ TIKTOK_REFRESH_TOKEN: t.refresh_token }); await setAccounts({ tiktok: { at: Date.now() } });
    return back(url.origin, { connected: "tiktok" });
  } catch (e) {
    console.error("connect", provider, e.message);
    return back(url.origin, { error: `${provider === "meta" ? "Meta" : "TikTok"}: ${e.message}` });
  }
};

export const config = { path: "/api/connect/*" };
