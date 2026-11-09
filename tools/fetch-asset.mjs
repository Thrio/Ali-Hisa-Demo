#!/usr/bin/env node
// Download ONE peer comp asset (photo, background, video) for layout fidelity.
// Replaces the kit's old fetch-peer-asset.mjs, which accepted any URL and any
// output path, followed redirects into private networks, had no size limit,
// and saved whatever came back (including executables).
//
//   node tools/fetch-asset.mjs <url> --peer <peer-slug> [--name hero-photo] [--max-mb 15] [--to-public]
//   node tools/fetch-asset.mjs --refetch <peer-slug>    (fresh clone: re-download every logged stand-in)
//
// Rules: output only under research/peers/<peer>/assets/ (git-ignored),
// images and video only (checked by content), SVG only when it has no script
// or external references, logos refused, every file logged in asset-sources.md.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { safeGet } from "./lib/net.mjs";
import { sniff, svgSafety, ALLOWED_TYPES } from "./lib/magic.mjs";
import { assertSlug, slugify, resolveInside, writeInside } from "./lib/paths.mjs";
import { sha256 } from "./lib/hash.mjs";
import { cleanLine } from "./lib/sanitize.mjs";

const LOGO_RE = /logo|wordmark|brandmark|brand-mark|favicon|apple-touch-icon|site-icon|mstile/i;

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) { out._.push(a); continue; }
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--") || ["--to-public", "--confirm-not-logo"].includes(a)) out[a.slice(2)] = true;
    else { out[a.slice(2)] = next; i++; }
  }
  return out;
}

export async function fetchAsset({ url, peer, name, maxMb = 15, confirmNotLogo = false, root = process.cwd() }) {
  if (!url) throw new Error("usage: node tools/fetch-asset.mjs <url> --peer <peer-slug> [--name <slug>]");
  assertSlug(peer, "--peer");
  const peerDir = resolveInside(root, "research", "peers", peer);
  if (!fs.existsSync(peerDir)) throw new Error(`no capture for "${peer}" yet — run tools/capture.mjs first`);
  if (LOGO_RE.test(url) && !confirmNotLogo) {
    throw new Error("the URL looks like a logo or icon. Peer logos and marks are never taken. If this is really a photo, re-run with --confirm-not-logo.");
  }
  const res = await safeGet(url, { maxBytes: Math.round(maxMb * 1024 * 1024), accept: "image/avif,image/webp,image/png,image/jpeg,image/gif,image/svg+xml,video/mp4,video/webm" });
  if (res.status !== 200) throw new Error(`HTTP ${res.status} for ${url}`);
  const kind = sniff(res.body);
  if (kind.danger) throw new Error(`refused: the content is a ${kind.type}, not an image or video`);
  if (!ALLOWED_TYPES.has(kind.type)) throw new Error(`refused: content type "${kind.type}" is not an allowed comp type`);
  if (kind.type === "svg") {
    const safety = svgSafety(res.body);
    if (!safety.safe) throw new Error(`refused SVG: ${safety.problems.join(", ")}. Screenshot that element as PNG instead.`);
  }
  const base = slugify(name || path.basename(new URL(res.finalUrl).pathname).replace(/\.[a-z0-9]+$/i, "") || "asset", 50);
  const hash = sha256(res.body);
  const file = `${base}-${hash.slice(0, 8)}.${kind.ext}`;
  const relFile = path.join("research", "peers", peer, "assets", file);
  writeInside(root, relFile, res.body);
  const meta = {
    file, sourceUrl: cleanLine(url, 500), finalUrl: cleanLine(res.finalUrl, 500), redirects: res.hops.length - 1,
    sha256: hash, bytes: res.body.length, type: kind.type, fetchedAt: new Date().toISOString(),
    status: "COMP ONLY — replace with client or licensed media before ship; never commit this file",
  };
  writeInside(root, `${relFile}.json`, JSON.stringify(meta, null, 2) + "\n");
  const log = resolveInside(root, "research", "peers", peer, "asset-sources.md");
  if (!fs.existsSync(log)) {
    writeInside(root, path.relative(root, log), "# Peer comp sources\n\nFiles live in `assets/` (git-ignored). This log is committed so a fresh clone can re-fetch.\nEvery row is replaced before ship (Pre-ship gate).\n\n| File | Source URL | sha256 | Bytes | Fetched |\n|---|---|---|---|---|\n");
  }
  fs.appendFileSync(log, `| ${file} | ${meta.sourceUrl} | ${hash.slice(0, 16)}… | ${meta.bytes} | ${meta.fetchedAt.slice(0, 10)} |\n`);
  return { path: relFile, ...meta };
}

/** Copy a saved stand-in into public/_peer/ for the build (replaces cp in overnight runs). Only files fetch-asset saved and logged. */
export function toPublic(root, relFile) {
  const r = String(relFile).replace(/\\/g, "/");
  const m = r.match(/^research\/peers\/([a-z0-9-]+)\/assets\/([^/]+)$/);
  if (!m) throw new Error("only files saved by fetch-asset (research/peers/<peer>/assets/<file>) can go to public/_peer/");
  const log = resolveInside(root, "research", "peers", m[1], "asset-sources.md");
  if (!fs.existsSync(log) || !fs.readFileSync(log, "utf8").includes(`| ${m[2]} |`)) throw new Error(`${m[2]} is not logged in asset-sources.md`);
  writeInside(root, path.join("public", "_peer", m[2]), fs.readFileSync(resolveInside(root, r)));
  return `public/_peer/${m[2]}`;
}

/** Re-download every logged stand-in (fresh clone or another machine) and verify it against the log. */
export async function refetchAll({ peer, root = process.cwd(), get = safeGet, maxMb = 15 }) {
  assertSlug(peer, "--refetch");
  const log = resolveInside(root, "research", "peers", peer, "asset-sources.md");
  if (!fs.existsSync(log)) throw new Error(`no asset-sources.md for "${peer}"`);
  const rows = fs.readFileSync(log, "utf8").split("\n").map((l) => l.split("|").map((c) => c.trim())).filter((c) => c.length > 5 && /\.[a-z0-9]+$/i.test(c[1] || "") && /^https?:/.test(c[2] || ""));
  const out = { fetched: 0, present: 0, changed: [], failed: [] };
  for (const [, file, url, shaCell] of rows) {
    const rel = path.join("research", "peers", peer, "assets", file);
    if (fs.existsSync(resolveInside(root, rel))) { out.present++; continue; }
    try {
      const res = await get(url, { maxBytes: Math.round(maxMb * 1024 * 1024), accept: "image/*,video/mp4,video/webm" });
      if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
      const kind = sniff(res.body);
      if (kind.danger || !ALLOWED_TYPES.has(kind.type)) throw new Error(`content is ${kind.type}`);
      const hash = sha256(res.body);
      if (!hash.startsWith(shaCell.replace(/…$/, ""))) out.changed.push(file);
      writeInside(root, rel, res.body);
      writeInside(root, `${rel}.json`, JSON.stringify({ file, sourceUrl: url, sha256: hash, bytes: res.body.length, type: kind.type, refetchedAt: new Date().toISOString(), status: "COMP ONLY — replace before ship" }, null, 2) + "\n");
      out.fetched++;
    } catch (e) { out.failed.push(`${file}: ${String(e.message || e).split("\n")[0]}`); }
  }
  return out;
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (invokedDirectly) {
  const args = parseArgs(process.argv.slice(2));
  const run = typeof args.refetch === "string"
    ? refetchAll({ peer: args.refetch }).then((r) => console.log(`refetch ${args.refetch}: ${r.fetched} downloaded · ${r.present} already here${r.changed.length ? ` · CHANGED at the source: ${r.changed.join(", ")}` : ""}${r.failed.length ? ` · failed: ${r.failed.slice(0, 3).join("; ")}` : ""}`))
    : fetchAsset({ url: args._[0], peer: args.peer, name: typeof args.name === "string" ? args.name : undefined, maxMb: Number(args["max-mb"] || 15), confirmNotLogo: Boolean(args["confirm-not-logo"]) })
      .then((r) => { const pub = args["to-public"] ? toPublic(process.cwd(), r.path) : null; console.log(`saved ${r.path} (${r.type}, ${r.bytes} bytes)${pub ? ` → ${pub}` : ""} — comp only, logged in asset-sources.md`); });
  run
    .catch((e) => { console.error(`fetch-asset: ${String(e.message || e).split("\n")[0]}`); process.exitCode = 1; });
}
