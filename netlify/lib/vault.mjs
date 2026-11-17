// HQ's own settings vault: keys Eli pastes into HQ (Setup) and tokens from the Connect buttons, kept in Netlify Blobs.
// hydrate() copies them onto process.env so the rest of the code reads one place. Netlify environment variables work
// too; a value saved in HQ wins.
import crypto from "node:crypto";
import { getStore } from "@netlify/blobs";

export const PASTE_KEYS = ["ANTHROPIC_API_KEY", "CF_ACCOUNT_ID", "CF_AI_TOKEN", "META_APP_ID", "META_APP_SECRET", "TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET"];
const vault = () => getStore("hq-vault");

export async function hydrate() {
  const v = (await vault().get("env", { type: "json" })) || {};
  for (const [k, val] of Object.entries(v)) if (val) process.env[k] = val;
  return v;
}
export async function setVault(patch) {
  const v = (await vault().get("env", { type: "json" })) || {};
  for (const [k, val] of Object.entries(patch)) {
    if (val === null || val === "") { delete v[k]; delete process.env[k]; } else { v[k] = String(val); process.env[k] = String(val); }
  }
  await vault().setJSON("env", v);
  return v;
}
export const getAccounts = async () => (await vault().get("accounts", { type: "json" })) || {};
export const setAccounts = async (patch) => { const a = { ...(await getAccounts()), ...patch }; await vault().setJSON("accounts", a); return a; };

// OAuth state: provider.time.nonce.signature, signed with ADMIN_KEY, good for 15 minutes.
const sign = d => crypto.createHmac("sha256", process.env.ADMIN_KEY || "").update(d).digest("base64url");
export function makeState(provider) { const d = `${provider}.${Date.now()}.${crypto.randomUUID()}`; return `${d}.${sign(d)}`; }
export function checkState(state, provider) {
  const parts = String(state || "").split(".");
  if (parts.length !== 4 || parts[0] !== provider || !process.env.ADMIN_KEY) return false;
  const exp = sign(parts.slice(0, 3).join("."));
  return parts[3].length === exp.length && crypto.timingSafeEqual(Buffer.from(parts[3]), Buffer.from(exp)) && Date.now() - Number(parts[1]) < 15 * 60e3;
}
