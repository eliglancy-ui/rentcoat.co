// Posts what Eli approved and scheduled. Every 10 minutes: each post in the HQ queue that is approved, has a time
// that has come, and was set to post on its own ("Approve & schedule") goes to its targets. A video takes a second
// run to finish on Instagram. A target that fails is left with its error for Eli to see; it isn't retried on its own.
// Posts more than a day late are skipped (marked missed) so nothing old goes out by surprise.
import { getStore } from "@netlify/blobs";
import { hydrate, setVault } from "../lib/vault.mjs";
import { step } from "../lib/social.mjs";

export async function runSchedule(now = Date.now(), store = null) {
  await hydrate().catch(e => console.error("vault", e.message));
  store ||= getStore("hq");
  const q = (await store.get("queue", { type: "json" })) || [];
  const due = q.filter(p => p.autopost && p.when && p.when <= now && (p.status === "approved" || p.status === "publishing"));
  const log = [];
  for (const p of due) {
    if (now - p.when > 24 * 36e5 && p.status === "approved") { p.autopost = false; p.missed = true; log.push(`${p.id} missed`); continue; }
    await step(p, { onRefresh: rt => setVault({ TIKTOK_REFRESH_TOKEN: rt }) });
    log.push(`${p.id} ${p.status}${Object.keys(p.errors || {}).length ? ` errors: ${Object.keys(p.errors).join(",")}` : ""}`);
  }
  if (due.length) await store.setJSON("queue", q);
  return log;
}

export default async () => {
  const log = await runSchedule();
  if (log.length) console.log("scheduler", log.join(" | "));
};

export const config = { schedule: "*/10 * * * *" };
