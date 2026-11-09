// Serve a static export (out/) on 127.0.0.1 for capture, band-check and check-site — no dev server, no live reload.
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { resolveInside } from "./paths.mjs";

const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".txt": "text/plain; charset=utf-8", ".xml": "application/xml", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".avif": "image/avif", ".gif": "image/gif", ".ico": "image/x-icon", ".woff2": "font/woff2", ".woff": "font/woff", ".mp4": "video/mp4", ".webm": "video/webm" };

/** Map a URL path to a file in dir the way static hosts do: /about → about.html or about/index.html. */
export function resolveStatic(dir, urlPath) {
  let clean; try { clean = decodeURIComponent(String(urlPath || "/").split(/[?#]/)[0]).replace(/\/+$/, "") || "/"; } catch { return null; }
  const rel = clean.replace(/^\/+/, "");
  const candidates = clean === "/" ? ["index.html"] : [rel, `${rel}.html`, `${rel}/index.html`];
  for (const c of candidates) {
    let f; try { f = resolveInside(dir, c); } catch { return null; }
    if (fs.existsSync(f) && fs.statSync(f).isFile()) return f;
  }
  return null;
}

export async function serveStatic(dirRel, root = process.cwd()) {
  const dir = resolveInside(root, dirRel);
  if (!fs.existsSync(path.join(dir, "index.html"))) throw new Error(`${dirRel}/index.html not found — run npm run build first`);
  const server = http.createServer((req, res) => {
    const file = resolveStatic(dir, req.url);
    if (!file) {
      const nf = resolveStatic(dir, "/404");
      res.writeHead(404, { "content-type": TYPES[".html"] });
      if (nf) fs.createReadStream(nf).pipe(res); else res.end("not found");
      return;
    }
    res.writeHead(200, { "content-type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return { url: `http://127.0.0.1:${server.address().port}/`, close: () => new Promise((r) => server.close(r)) };
}
