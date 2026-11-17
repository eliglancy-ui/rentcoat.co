// GET /api/media/:id.jpg  ->  an image made in HQ (AI or the post maker). Public on purpose: Instagram has to fetch
// the image by URL to post it. Ids are random UUIDs, so nothing is listable.
import { getStore } from "@netlify/blobs";

export default async (req) => {
  const id = new URL(req.url).pathname.split("/").pop();
  const ext = (/^[0-9a-f-]{36}\.(jpg|mp4|webm)$/.exec(id) || [])[1];
  if (!ext) return new Response("Not found", { status: 404 });
  const img = await getStore("hq-media").get(id, { type: "arrayBuffer" });
  if (!img) return new Response("Not found", { status: 404 });
  return new Response(img, { headers: { "content-type": { jpg: "image/jpeg", mp4: "video/mp4", webm: "video/webm" }[ext], "cache-control": "public, max-age=31536000, immutable", "x-robots-tag": "noindex" } });
};

export const config = { path: "/api/media/*" };
