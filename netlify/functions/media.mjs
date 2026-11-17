// GET /api/media/:id.jpg  ->  an image made in HQ (AI or the post maker). Public on purpose: Instagram has to fetch
// the image by URL to post it. Ids are random UUIDs, so nothing is listable.
import { getStore } from "@netlify/blobs";

export default async (req) => {
  const id = new URL(req.url).pathname.split("/").pop();
  const ext = (/^[0-9a-f-]{36}\.(jpg|mp4|webm)$/.exec(id) || [])[1];
  if (!ext) return new Response("Not found", { status: 404 });
  const img = await getStore("hq-media").get(id, { type: "arrayBuffer" });
  if (!img) return new Response("Not found", { status: 404 });
  const headers = { "content-type": { jpg: "image/jpeg", mp4: "video/mp4", webm: "video/webm" }[ext], "cache-control": "public, max-age=31536000, immutable", "x-robots-tag": "noindex", "accept-ranges": "bytes" };
  // iPhones only play video when the server answers byte-range requests.
  const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get("range") || ""), size = img.byteLength;
  if (m && (m[1] || m[2])) {
    let start = m[1] ? Number(m[1]) : size - Number(m[2]), end = m[1] && m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
    if (start < 0) start = 0;
    if (start >= size || start > end) return new Response(null, { status: 416, headers: { "content-range": `bytes */${size}` } });
    return new Response(img.slice(start, end + 1), { status: 206, headers: { ...headers, "content-range": `bytes ${start}-${end}/${size}`, "content-length": String(end - start + 1) } });
  }
  return new Response(img, { headers: { ...headers, "content-length": String(size) } });
};

export const config = { path: "/api/media/*" };
