#!/usr/bin/env node
// Cut out a CLIENT product photo with a plain background (cream on a dark hero, white studio shot).
//   node tools/cutout.mjs <brief/… | public/images/…> --name <slug> --on <hex of the section, e.g. 1b1b1b (no #, it starts a shell comment)> --no-people [--tolerance 18]
// Never reference media, never photos of people. Refuses when the background is not uniform.
// Writes public/images/cutouts/<slug>.png and research/build/cutout-<slug>-preview.png (open the preview).
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { launchBrowser, hardenedContext } from "./lib/browser.mjs";
import { encodePng, crop } from "./lib/png.mjs";
import { assertSlug, resolveInside, writeInside } from "./lib/paths.mjs";
import { cutout, composite, trimBox, parseHex } from "./lib/cutout.mjs";

const MIME = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" };

export function checkSource(rel) {
  const r = rel.replace(/\\/g, "/").replace(/^\.\//, "");
  if (/^research\//.test(r) || /^public\/_peer\//.test(r)) throw new Error("refused: reference media is never cut out — only client-owned or licensed product photos");
  if (!/^(brief|public\/images)\//.test(r)) throw new Error("the photo must be under brief/ or public/images/");
  if (!MIME[path.extname(r).toLowerCase()]) throw new Error("PNG, JPEG or WebP only");
  return r;
}

async function decode(file, unsafeNoSandbox) {
  const { browser } = await launchBrowser({ channel: process.env.CAPTURE_CHANNEL || "chromium", headless: true, unsafeNoSandbox });
  try {
    const { context } = await hardenedContext(browser, { width: 800, height: 600 });
    const page = await context.newPage();
    const dataUrl = `data:${MIME[path.extname(file).toLowerCase()]};base64,${fs.readFileSync(file).toString("base64")}`;
    const r = await page.evaluate(async (src) => {
      const img = new Image(); img.src = src; await img.decode();
      if (img.naturalWidth * img.naturalHeight > 16e6) return { error: "image larger than 16 megapixels — export a smaller copy" };
      const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight;
      const g = c.getContext("2d"); g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height).data;
      let s = ""; for (let i = 0; i < d.length; i += 0x8000) s += String.fromCharCode.apply(null, d.subarray(i, i + 0x8000));
      return { w: c.width, h: c.height, b64: btoa(s) };
    }, dataUrl);
    if (r.error) throw new Error(r.error);
    return { w: r.w, h: r.h, rgba: Buffer.from(r.b64, "base64") };
  } finally { await browser.close().catch(() => {}); }
}

function logDecision(root, rel) {
  const f = path.join(root, "plan.md");
  if (!fs.existsSync(f)) return;
  const lines = fs.readFileSync(f, "utf8").split("\n");
  const start = lines.findIndex((l) => /^## Decisions/.test(l));
  if (start < 0) return;
  let last = start; for (let i = start + 1; i < lines.length && !/^#{1,6} /.test(lines[i]); i++) if (/^\|/.test(lines[i])) last = i;
  lines.splice(last + 1, 0, `| ${new Date().toISOString().slice(0, 10)} | cutout \`${rel}\` — product only, no people | photo background clashed with its section | agent |`);
  fs.writeFileSync(f, lines.join("\n"));
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (invokedDirectly) {
  const argv = process.argv.slice(2); const a = { _: [] };
  for (let i = 0; i < argv.length; i++) { if (!argv[i].startsWith("--")) { a._.push(argv[i]); continue; } const n = argv[i + 1]; if (["--no-people", "--unsafe-no-sandbox"].includes(argv[i]) || n === undefined || n.startsWith("--")) a[argv[i].slice(2)] = true; else { a[argv[i].slice(2)] = n; i++; } }
  (async () => {
    try {
      const root = process.cwd();
      const rel = checkSource(String(a._[0] || ""));
      if (!a["no-people"]) throw new Error("add --no-people after checking the photo shows only the product (the tool cannot see people)");
      const slug = assertSlug(String(a.name || ""), "--name");
      const on = parseHex(String(a.on || ""));
      const src = resolveInside(root, rel);
      const img = await decode(src, Boolean(a["unsafe-no-sandbox"]));
      const r = cutout(img.rgba, img.w, img.h, { tolerance: Number(a.tolerance || 18) });
      if (!r.ok) { console.log(`cutout refused: ${r.reason}\nNext: use a rounded plate in a token colour, or [[PENDING: transparent PNG of ${rel}]].`); process.exitCode = 2; return; }
      const box = trimBox(r.rgba, img.w, img.h);
      const cut = crop({ width: img.w, height: img.h, data: r.rgba }, box.x, box.y, box.w, box.h);
      const out = writeInside(root, path.join("public", "images", "cutouts", `${slug}.png`), encodePng(cut));
      const prev = writeInside(root, path.join("research", "build", `cutout-${slug}-preview.png`), encodePng({ width: cut.width, height: cut.height, data: composite(cut.data, cut.width, cut.height, on) }));
      logDecision(root, rel);
      console.log([`cutout ${rel} → ${path.relative(root, out)} (${cut.width}×${cut.height}, ${(r.removed * 100).toFixed(0)}% background removed)`, `preview on ${a.on}: ${path.relative(root, prev)} — open it; halos or bitten edges → plate instead`, "logged in plan.md Decisions", "Next: use the cutout in the band, then band-check."].join("\n"));
    } catch (e) { console.error(`cutout: ${String(e.message || e).split("\n")[0]}`); process.exitCode = 1; }
  })();
}
