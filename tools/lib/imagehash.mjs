// 8×8 difference hash (dHash) computed in Chromium canvas — catches resized or re-encoded copies of reference images.
import fs from "node:fs";
import path from "node:path";
import { launchBrowser, hardenedContext } from "./browser.mjs";

const MIME = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".avif": "image/avif", ".gif": "image/gif" };

export function hamming(a, b) {
  let d = 0;
  for (let i = 0; i < a.length; i++) { let x = parseInt(a[i], 16) ^ parseInt(b[i], 16); while (x) { d += x & 1; x >>= 1; } }
  return d;
}

/** dHash from a 9×8 grayscale array (row-major): bit = left pixel brighter than right. */
export function dhashFromGray(gray) {
  let bits = "";
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) bits += gray[y * 9 + x] > gray[y * 9 + x + 1] ? "1" : "0";
  return bits.match(/.{4}/g).map((b) => parseInt(b, 2).toString(16)).join("");
}

export async function imageHashes(files, { unsafeNoSandbox = false } = {}) {
  const { browser } = await launchBrowser({ channel: process.env.CAPTURE_CHANNEL || "chromium", headless: true, unsafeNoSandbox });
  const out = {};
  try {
    const { context } = await hardenedContext(browser, { width: 400, height: 300 });
    const page = await context.newPage();
    for (const f of files) {
      const mime = MIME[path.extname(f).toLowerCase()];
      if (!mime) { out[f] = null; continue; }
      const src = `data:${mime};base64,${fs.readFileSync(f).toString("base64")}`;
      const gray = await page.evaluate(async (s) => {
        try {
          const img = new Image(); img.src = s; await img.decode();
          const c = document.createElement("canvas"); c.width = 9; c.height = 8;
          const g = c.getContext("2d"); g.imageSmoothingQuality = "high"; g.drawImage(img, 0, 0, 9, 8);
          const d = g.getImageData(0, 0, 9, 8).data; const o = [];
          for (let i = 0; i < d.length; i += 4) o.push(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
          return o;
        } catch (e) { return null; }
      }, src);
      out[f] = gray ? dhashFromGray(gray) : null;
    }
  } finally { await browser.close().catch(() => {}); }
  return out;
}
