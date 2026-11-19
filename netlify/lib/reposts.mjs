// The repost plan: one good video gets posted more than once, because most followers never see a given post.
// Adapted from the "post everything 5x" idea: trial reel → feed reel → feed again ~90 days later → again ~180 days.
// No mirrored copy: Rent Coat designs are words, and a flipped video shows them backwards.
// planReposts() only makes DRAFTS (status "review", not scheduled). Nothing posts until Eli approves each one.

const DAY = 864e5;

// Captions tied to a date or a price that will be wrong months later.
const TIME_SENSITIVE = /\$30\b|black friday|cyber monday|nov(ember)?\.?\s*27|dec(ember)?\.?\s*1\b|\bsale\b|opens\b|launch|countdown|today only|this week(end)?|\b\d+\s+days?\s+(left|until|to go)|until dec|ends (soon|tonight|monday)/i;
export const isTimeSensitive = caption => TIME_SENSITIVE.test(String(caption || ""));

// The follow-up drafts for a posted post. `at` = when the original went out (ms).
export function planReposts(post, now = Date.now()) {
  const at = post.postedAt || now;
  const steps = [];
  if (post.trial) steps.push({ label: "feed version", after: 3 * DAY });
  steps.push({ label: "90 days", after: 90 * DAY }, { label: "180 days", after: 180 * DAY });
  const stale = isTimeSensitive(post.caption);
  return steps.map((s, i) => ({
    id: crypto.randomUUID(),
    account: post.account,
    title: `${String(post.title || "Post").replace(/ · repost.*$/, "")} · repost (${s.label})`.slice(0, 120),
    caption: post.caption || "",
    media: [...(post.media || [])],
    cover: post.cover,
    product: post.product,
    targets: { ig: true },           // reposts go to the Instagram feed; add other places when approving if wanted
    when: Math.max(at + s.after, now + DAY),
    status: "review",
    autopost: false,
    repostOf: post.id,
    repostN: i + 1,
    note: stale
      ? "Rewrite the caption before approving: it mentions a date, price or launch that won't be true anymore."
      : "Same video again. Consider a new first line so it doesn't read as a rerun.",
    created: now,
  }));
}
