// Hardened HTTP GET for robots.txt, sitemaps and single comp assets.
// - every hop is checked (scheme, port, internal names, private IPs)
// - DNS is checked again at connect time (blocks DNS rebinding)
// - redirects are followed by hand, max 3, each re-checked
// - size cap while streaming; total deadline; no decompression (no zip bombs)
import http from "node:http";
import https from "node:https";
import net from "node:net";
import { checkUrl, guardedLookup, isPrivateIp } from "./guard.mjs";

export const DEFAULT_UA_TOKEN = "web-brain-capture/3.0";

export function userAgentToken() {
  const contact = process.env.CAPTURE_CONTACT ? `; +${String(process.env.CAPTURE_CONTACT).slice(0, 80)}` : "";
  return `${DEFAULT_UA_TOKEN} (reference layout research${contact})`;
}

function once(urlObj, { maxBytes, timeoutMs, accept, userAgent, loopback }) {
  return new Promise((resolve, reject) => {
    const lib = urlObj.protocol === "https:" ? https : http;
    const host = urlObj.hostname.replace(/^\[|\]$/g, "");
    if (!loopback && net.isIP(host) && isPrivateIp(host)) {
      reject(new Error(`blocked private address ${host}`));
      return;
    }
    const deadline = setTimeout(() => req.destroy(new Error(`timeout after ${timeoutMs} ms`)), timeoutMs);
    const req = lib.request(urlObj, {
      method: "GET",
      headers: { "user-agent": userAgent, accept, "accept-encoding": "identity" },
      lookup: loopback ? undefined : guardedLookup,
      timeout: timeoutMs,
    }, (res) => {
      const declared = Number(res.headers["content-length"] || 0);
      if (declared && declared > maxBytes) {
        clearTimeout(deadline);
        res.destroy();
        reject(new Error(`too large: ${declared} bytes (limit ${maxBytes})`));
        return;
      }
      const chunks = [];
      let size = 0;
      res.on("data", (chunk) => {
        size += chunk.length;
        if (size > maxBytes) { res.destroy(new Error(`too large: over ${maxBytes} bytes`)); return; }
        chunks.push(chunk);
      });
      res.on("end", () => {
        clearTimeout(deadline);
        resolve({ status: res.statusCode || 0, headers: res.headers, body: Buffer.concat(chunks) });
      });
      res.on("error", (error) => { clearTimeout(deadline); reject(error); });
    });
    req.on("timeout", () => req.destroy(new Error(`idle timeout after ${timeoutMs} ms`)));
    req.on("error", (error) => { clearTimeout(deadline); reject(error); });
    req.end();
  });
}

export async function safeGet(rawUrl, {
  maxBytes = 15 * 1024 * 1024,
  timeoutMs = 20000,
  maxRedirects = 3,
  accept = "*/*",
  userAgent = userAgentToken(),
  allowLoopback = false,
} = {}) {
  let current = String(rawUrl);
  const hops = [];
  for (let i = 0; i <= maxRedirects; i++) {
    const verdict = checkUrl(current, { allowLoopback });
    if (!verdict.ok) {
      const error = new Error(`blocked URL ${current}: ${verdict.reason}`);
      error.code = "EBLOCKEDURL";
      throw error;
    }
    const res = await once(verdict.url, { maxBytes, timeoutMs, accept, userAgent, loopback: Boolean(verdict.loopback) });
    hops.push({ url: current, status: res.status });
    if ([301, 302, 303, 307, 308].includes(res.status) && res.headers.location) {
      current = new URL(String(res.headers.location), current).toString();
      continue;
    }
    return { ...res, finalUrl: current, hops };
  }
  throw new Error(`too many redirects (more than ${maxRedirects})`);
}
