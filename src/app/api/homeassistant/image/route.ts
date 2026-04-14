// Streams images from HA (e.g. media_player artwork) through the Next.js server
// so the public-facing site doesn't need direct access to the HA URL.
// The `path` query param is validated against a safe prefix to avoid SSRF.

const BASE  = process.env.HA_URL   ?? "";
const TOKEN = process.env.HA_TOKEN ?? "";

const ALLOWED_PREFIXES = ["/api/media_player_proxy/", "/api/image/"];

export async function GET(req: Request) {
  const url = new URL(req.url);
  const path = url.searchParams.get("path");
  if (!path || !ALLOWED_PREFIXES.some(p => path.startsWith(p))) {
    return new Response("Bad path", { status: 400 });
  }
  if (!BASE || !TOKEN) return new Response("HA not configured", { status: 500 });

  const upstream = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
    cache: "no-store",
  });
  if (!upstream.ok || !upstream.body) {
    return new Response("Upstream error", { status: upstream.status || 502 });
  }

  // HA serves album art as application/octet-stream. Force an image MIME so
  // browsers render it in <img>. We sniff the first few bytes to pick a type.
  const buf = new Uint8Array(await upstream.arrayBuffer());
  let contentType = upstream.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) {
    if (buf[0] === 0x89 && buf[1] === 0x50) contentType = "image/png";
    else if (buf[0] === 0xff && buf[1] === 0xd8) contentType = "image/jpeg";
    else if (buf[0] === 0x47 && buf[1] === 0x49) contentType = "image/gif";
    else if (buf[0] === 0x52 && buf[1] === 0x49) contentType = "image/webp";
    else contentType = "image/jpeg";
  }

  return new Response(buf, {
    status: 200,
    headers: {
      "Content-Type":  contentType,
      "Cache-Control": "public, max-age=300",
    },
  });
}
