// Posting to Instagram, Facebook and TikTok, shared by HQ (tap to post) and the scheduler (posts Eli approved and
// scheduled). Every post in the queue can go to several places ("targets"):
//   ig     Instagram feed: one image, a carousel (2-10 images) or a reel (video)
//   story  Instagram story (first image or video)
//   fb     Facebook Page (one photo, several photos, or a video)
//   tt     TikTok drafts (photos or video; Eli adds a sound and posts in the app)
// step(post) moves every target one step forward and records what happened in post.done / post.errors, so it can be
// called again until post.status is "posted". Instagram videos need a minute to process, so they take two steps.
export const GRAPH = `https://graph.facebook.com/${process.env.IG_GRAPH_VERSION || "v21.0"}`;
export const ACCOUNTS = { rentcoat: "@rentcoat.co", mission: "@whatisanldsmission" };
export const TARGETS = { ig: "Instagram", story: "Instagram story", fb: "Facebook", tt: "TikTok drafts" };

const isVideo = m => /\.(mp4|webm|mov)($|\?)/i.test(m);
const isImage = m => /\.(jpe?g|png)($|\?)/i.test(m);
export const mediaOf = (post, kind) => (post.media || []).find(m => kind === "video" ? isVideo(m) : isImage(m));
const images = post => (post.media || []).filter(isImage).slice(0, 10);

function ig(account) {
  const user = process.env[`IG_${String(account).toUpperCase()}_USER_ID`], token = process.env[`IG_${String(account).toUpperCase()}_TOKEN`];
  if (!user || !token) throw new Error(`Instagram isn't connected for ${ACCOUNTS[account] || account} yet. See Setup.`);
  return { user, token };
}
async function graph(path, params, method = "POST") {
  const r = method === "GET"
    ? await fetch(`${GRAPH}/${path}${path.includes("?") ? "&" : "?"}${new URLSearchParams(params)}`)
    : await fetch(`${GRAPH}/${path}`, { method, body: new URLSearchParams(params) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || d.error) throw new Error(d.error?.message || `HTTP ${r.status}`);
  return d;
}

// Instagram: create the container(s). Returns the container id to publish.
async function igStart(post, story) {
  const { user, token } = ig(post.account);
  const video = mediaOf(post, "video"), imgs = images(post), caption = post.caption || "";
  if (!video && !imgs.length) throw new Error("This post has no image or video.");
  if (story) return (await graph(`${user}/media`, { media_type: "STORIES", ...(video ? { video_url: video } : { image_url: imgs[0] }), access_token: token })).id;
  if (video) return (await graph(`${user}/media`, { media_type: "REELS", video_url: video, caption, share_to_feed: "true", access_token: token })).id;
  if (imgs.length === 1) return (await graph(`${user}/media`, { image_url: imgs[0], caption, access_token: token })).id;
  const children = [];
  for (const u of imgs) children.push((await graph(`${user}/media`, { image_url: u, is_carousel_item: "true", access_token: token })).id);
  return (await graph(`${user}/media`, { media_type: "CAROUSEL", children: children.join(","), caption, access_token: token })).id;
}
// Publishes the container once Instagram has processed it. Returns the media id, or null if it isn't ready yet.
async function igFinish(post, container) {
  const { user, token } = ig(post.account);
  const s = await graph(container, { fields: "status_code", access_token: token }, "GET");
  if (s.status_code === "ERROR" || s.status_code === "EXPIRED") throw new Error(`Instagram couldn't process it (${s.status_code}).`);
  if (s.status_code && s.status_code !== "FINISHED") return null;
  return (await graph(`${user}/media_publish`, { creation_id: container, access_token: token })).id;
}

// Facebook Page: one photo, several photos (one post), or a video.
async function fbPublish(post) {
  const id = process.env.META_PAGE_ID, token = process.env.META_PAGE_TOKEN;
  if (!id || !token) throw new Error("Facebook isn't connected yet. See Setup.");
  if (post.account !== "rentcoat") throw new Error("@whatisanldsmission stays Instagram only.");
  const video = mediaOf(post, "video"), imgs = images(post), caption = post.caption || "";
  if (video) { const d = await graph(`${id}/videos`, { file_url: video, description: caption, access_token: token }); return d.post_id || d.id; }
  if (!imgs.length) throw new Error("This post has no image or video.");
  if (imgs.length === 1) { const d = await graph(`${id}/photos`, { url: imgs[0], caption, access_token: token }); return d.post_id || d.id; }
  const attached = [];
  for (const u of imgs) attached.push({ media_fbid: (await graph(`${id}/photos`, { url: u, published: "false", access_token: token })).id });
  return (await graph(`${id}/feed`, { message: caption, attached_media: JSON.stringify(attached), access_token: token })).id;
}

// TikTok: sends the post to Eli's TikTok inbox as a draft. Access tokens last a day, so each call trades the
// long-lived refresh token for a fresh one (and saves the new refresh token through onRefresh).
async function tiktokPublish(post, onRefresh) {
  const key = process.env.TIKTOK_CLIENT_KEY, secret = process.env.TIKTOK_CLIENT_SECRET, refresh = process.env.TIKTOK_REFRESH_TOKEN;
  if (!key || !secret || !refresh) throw new Error("TikTok isn't connected yet. See Setup.");
  if (post.account !== "rentcoat") throw new Error("@whatisanldsmission stays Instagram only.");
  const t = await (await fetch("https://open.tiktokapis.com/v2/oauth/token/", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_key: key, client_secret: secret, grant_type: "refresh_token", refresh_token: refresh }) })).json();
  if (!t.access_token) throw new Error(`TikTok login: ${t.error_description || t.error || "failed"}`);
  if (t.refresh_token && t.refresh_token !== refresh && onRefresh) await onRefresh(t.refresh_token);
  const video = mediaOf(post, "video"), imgs = images(post);
  if (!video && !imgs.length) throw new Error("This post has no image or video.");
  const [path, body] = video
    ? ["post/publish/inbox/video/init/", { source_info: { source: "PULL_FROM_URL", video_url: video } }]
    : ["post/publish/content/init/", { post_info: { title: (post.title || "").slice(0, 90), description: post.caption || "" }, source_info: { source: "PULL_FROM_URL", photo_cover_index: 0, photo_images: imgs }, post_mode: "MEDIA_UPLOAD", media_type: "PHOTO" }];
  const r = await fetch(`https://open.tiktokapis.com/v2/${path}`, { method: "POST", headers: { authorization: `Bearer ${t.access_token}`, "content-type": "application/json; charset=UTF-8" }, body: JSON.stringify(body) });
  const d = await r.json();
  if (d.error?.code !== "ok") throw new Error(`TikTok: ${d.error?.message || d.error?.code || r.status}`);
  return d.data?.publish_id;
}

// Which targets a post goes to. Old posts (before targets existed) go to Instagram only.
export function targetsOf(post) {
  const t = post.targets || { ig: true };
  const out = Object.keys(TARGETS).filter(k => t[k]);
  return post.account === "mission" ? out.filter(k => k === "ig" || k === "story") : out;
}

// One step for every target not done yet. Never throws: errors land in post.errors[target] (shown in HQ).
// A target that failed is not retried until Eli taps Post again (retry: true clears the errors).
export async function step(post, { retry = false, onRefresh } = {}) {
  post.done ||= {}; post.errors ||= {}; post.containers ||= {};
  if (post.igId && !post.done.ig) post.done.ig = post.igId; // posts made before targets existed
  if (retry) post.errors = {};
  for (const k of targetsOf(post)) {
    if (post.done[k] || post.errors[k]) continue;
    try {
      if (k === "ig" || k === "story") {
        if (!post.containers[k]) post.containers[k] = await igStart(post, k === "story");
        const id = await igFinish(post, post.containers[k]);
        if (id) { post.done[k] = id; delete post.containers[k]; }
      } else if (k === "fb") post.done.fb = await fbPublish(post);
      else if (k === "tt") post.done.tt = await tiktokPublish(post, onRefresh);
    } catch (e) { post.errors[k] = String(e.message || e).slice(0, 300); delete post.containers[k]; }
  }
  const ts = targetsOf(post), left = ts.filter(k => !post.done[k]);
  if (!left.length && ts.length) { post.status = "posted"; post.postedAt ||= Date.now(); if (post.done.ig) post.igId = post.done.ig; }
  else if (left.every(k => post.errors[k])) post.status = "approved"; // nothing in flight: back to approved with the errors shown
  else post.status = "publishing";
  if (post.done.fb) post.fb = post.done.fb;
  if (post.done.tt) post.tt = post.done.tt;
  return post;
}

// ---- Reading Instagram: recent posts with their numbers, and comments waiting for a reply.
export async function igStats(account, mediaId) {
  const { token } = ig(account);
  const base = await graph(mediaId, { fields: "like_count,comments_count,permalink,media_type,timestamp", access_token: token }, "GET");
  const out = { likes: base.like_count ?? null, comments: base.comments_count ?? null, permalink: base.permalink, at: Date.now() };
  for (const metric of ["reach", "views", "saved", "shares"]) { // asked one at a time: an unsupported metric fails the whole call
    try { const d = await graph(`${mediaId}/insights`, { metric, access_token: token }, "GET"); out[metric] = d.data?.[0]?.values?.[0]?.value ?? d.data?.[0]?.total_value?.value ?? null; } catch {}
  }
  return out;
}
export async function igAccount(account) {
  const { user, token } = ig(account);
  return graph(user, { fields: "username,followers_count,media_count", access_token: token }, "GET");
}
export async function igInbox(account) {
  const { user, token } = ig(account);
  const me = (await graph(user, { fields: "username", access_token: token }, "GET")).username;
  const media = (await graph(`${user}/media`, { fields: "id,caption,permalink,timestamp,comments_count,media_url,thumbnail_url,media_type", limit: "12", access_token: token }, "GET")).data || [];
  const out = [];
  for (const m of media.filter(x => x.comments_count > 0)) {
    const cs = (await graph(`${m.id}/comments`, { fields: "id,text,username,timestamp,replies{username}", limit: "50", access_token: token }, "GET")).data || [];
    for (const c of cs) {
      if (c.username === me) continue;
      const answered = (c.replies?.data || []).some(r => r.username === me);
      out.push({ id: c.id, text: c.text, user: c.username, at: c.timestamp, answered, post: { id: m.id, caption: (m.caption || "").slice(0, 120), link: m.permalink, thumb: m.thumbnail_url || m.media_url } });
    }
  }
  return { me, comments: out.sort((a, b) => (a.answered - b.answered) || String(b.at).localeCompare(String(a.at))) };
}
export async function igReply(account, commentId, message) {
  const { token } = ig(account);
  return (await graph(`${commentId}/replies`, { message: String(message).slice(0, 2200), access_token: token })).id;
}
