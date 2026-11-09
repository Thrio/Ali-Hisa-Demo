#!/usr/bin/env node
// Overlay gate, offline. Compares a reference band PNG with our build's band PNG.
// Writes a review sheet the agent MUST open (L10) — reference | build | structure — plus the difference, structure and side images and hints:
//   overlay-<unit>-<w>.png            difference blend (near-black = aligned, magenta = size mismatch)
//   overlay-<unit>-<w>-structure.png  edges only: grey shared, red reference-only, cyan build-only
//   overlay-<unit>-<w>-side.png       reference | build | difference
//
//   node tools/overlay.mjs --peer-slug ref --page home --band 3 --width 1440
//   node tools/overlay.mjs --peer-slug ref --page home --first-screen --width 1440   (what a visitor sees before scrolling)
//   node tools/overlay.mjs --peer path/a.png --build path/b.png --out research/build/overlay-x-1440.png
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { decodePng, encodePng } from "./lib/png.mjs";
import { analyze, sideBySide } from "./lib/diff.mjs";
import { assertSlug, resolveInside, writeInside } from "./lib/paths.mjs";
import { resolvePage } from "./lib/pagemap.mjs";

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith("--")) continue;
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) out[argv[i].slice(2)] = true;
    else { out[argv[i].slice(2)] = next; i++; }
  }
  return out;
}

export function hints(result) {
  const h = [];
  if (!result.size.sameWidth) h.push(`widths differ (${result.size.peer[0]} vs ${result.size.build[0]}): shoot both at the same viewport width first`);
  if (Math.abs(result.size.heightDelta) > 8) h.push(`band height differs by ${result.size.heightDelta}px — check padding model and fixed boxes (L5, L6)`);
  if (result.drift.improvementPct >= 15 && Math.abs(result.drift.dy) >= 4) h.push(`whole band aligns better shifted ${result.drift.dy > 0 ? "up" : "down"} ${Math.abs(result.drift.dy)}px — placement, not inner layout (L1, L8: header clearance counted twice?)`);
  if (result.drift.improvementPct >= 15 && Math.abs(result.drift.dx) >= 4) h.push(`aligns better shifted ${Math.abs(result.drift.dx)}px horizontally — gutter vs max-width (L4)`);
  if (result.edges.onlyInReference > result.edges.shared * 0.5) h.push("many edges exist only in the reference: missing elements, borders or layered media (L3, L9, L12)");
  if (result.edges.onlyInBuild > result.edges.shared * 0.5) h.push("many edges exist only in our build: invented elements or different grammar (L12)");
  for (const r of result.lookHere) h.push(`look at y ${r.y0}–${r.y1}px (${r.peakPct}% of the row differs)`);
  return h;
}

/** Box-average downscale so a review sheet stays small (fewer tokens to look at). */
export function scaleDown(img, maxWidth = 1800) {
  if (img.width <= maxWidth) return img;
  const f = img.width / maxWidth, w = maxWidth, h = Math.max(1, Math.round(img.height / f));
  const data = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const sx0 = Math.floor(x * f), sx1 = Math.min(img.width, Math.ceil((x + 1) * f)), sy0 = Math.floor(y * f), sy1 = Math.min(img.height, Math.ceil((y + 1) * f));
    const acc = [0, 0, 0, 0]; let n = 0;
    for (let yy = sy0; yy < sy1; yy++) for (let xx = sx0; xx < sx1; xx++) { const i = (yy * img.width + xx) * 4; acc[0] += img.data[i]; acc[1] += img.data[i + 1]; acc[2] += img.data[i + 2]; acc[3] += img.data[i + 3]; n++; }
    const o = (y * w + x) * 4; for (let k = 0; k < 4; k++) data[o + k] = Math.round(acc[k] / n);
  }
  return { width: w, height: h, data };
}

export function runOverlay({ peer, build, out, root = process.cwd() }) {
  const a = decodePng(fs.readFileSync(peer));
  const b = decodePng(fs.readFileSync(build));
  const result = analyze(a, b);
  const base = out.replace(/\.png$/i, "");
  const relBase = path.relative(root, path.resolve(root, base));
  writeInside(root, `${relBase}.png`, encodePng(result.images.difference));
  writeInside(root, `${relBase}-structure.png`, encodePng(result.images.structure));
  writeInside(root, `${relBase}-side.png`, encodePng(sideBySide([a, b, result.images.difference])));
  // One sheet to open per width: reference | build | structure (grey shared, red reference-only, cyan build-only).
  writeInside(root, `${relBase}-sheet.png`, encodePng(scaleDown(sideBySide([a, b, result.images.structure]))));
  const { images, ...metrics } = result;
  const report = { peer: path.relative(root, peer), build: path.relative(root, build), ...metrics, hints: hints(result), note: "Diagnostics, not a score. Open the sheet (reference | build | structure); the overlay passes only when structure, spacing and media side match apart from our colours, copy, logo and motion implementation." };
  writeInside(root, `${relBase}.json`, JSON.stringify(report, null, 2) + "\n");
  return { files: [`${relBase}-sheet.png`, `${relBase}.png`, `${relBase}-structure.png`, `${relBase}-side.png`, `${relBase}.json`], report };
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (invokedDirectly) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const root = process.cwd();
    let { peer, build, out } = args;
    if (args["peer-slug"]) {
      assertSlug(args["peer-slug"], "--peer-slug");
      const pageName = String(args.page || "home"); const band = String(args.band || "1"); const width = String(args.width || "1440");
      assertSlug(pageName, "--page"); assertSlug(band, "--band");
      const site = String(args.site || "site"); assertSlug(site, "--site");
      const firstScreen = Boolean(args["first-screen"]);
      const file = firstScreen ? `first-screen-${width}.png` : `band-${band}-${width}.png`;
      const pg = resolvePage(root, pageName); // research/page-map.json: reference page ↔ build route
      peer = peer || resolveInside(root, "research", "peers", args["peer-slug"], "pages", pg.peer, file);
      build = build || resolveInside(root, "research", "build", site, "pages", pg.build, file);
      out = out || path.join("research", "build", firstScreen ? `overlay-${pageName}-first-screen-${width}.png` : `overlay-${pageName}-band-${band}-${width}.png`);
    }
    if (!peer || !build || !out) throw new Error("usage: --peer-slug <slug> --page home --band 3 --width 1440   or   --peer a.png --build b.png --out x.png");
    for (const f of [peer, build]) if (!fs.existsSync(f)) throw new Error(`missing ${path.relative(root, f)} — capture it first`);
    const { files, report } = runOverlay({ peer: path.resolve(root, peer), build: path.resolve(root, build), out, root });
    console.log(`pixel mismatch ${report.pixelMismatchPct}% · structure mismatch ${report.structureMismatchPct}% · drift dy=${report.drift.dy}px dx=${report.drift.dx}px`);
    for (const h of report.hints) console.log(`- ${h}`);
    console.log(`open: ${files[0]}`);
  } catch (e) {
    console.error(`overlay: ${String(e.message || e).split("\n")[0]}`);
    process.exitCode = 1;
  }
}
