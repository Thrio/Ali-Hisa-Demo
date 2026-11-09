#!/usr/bin/env node
// Launch guard: did any reference text or reference file end up in our site?
//   node tools/copy-check.mjs [--peer-slug ref] [--ours research/build/site/text | out] [--n 8] [--public public]
// Fails on any shared run of 8+ words, or any public/ file whose hash matches a captured peer asset.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { walkFiles, resolveInside, assertSlug } from "./lib/paths.mjs";
import { sha256File } from "./lib/hash.mjs";

export function words(text) {
  return String(text || "").normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim().split(" ").filter(Boolean);
}

function stripBanner(text) {
  return String(text).split("\n").filter((l) => !/^UNTRUSTED THIRD-PARTY CONTENT|^URL: /.test(l)).join("\n");
}

function htmlToText(html) {
  return String(html).replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ");
}

/** Shared runs of n+ words between reference texts and our texts. */
export function sharedRuns(peerTexts, ourTexts, n = 8) {
  const grams = new Set();
  for (const t of peerTexts) { const w = words(t); for (let i = 0; i + n <= w.length; i++) grams.add(w.slice(i, i + n).join(" ")); }
  const runs = [];
  for (const { name, text } of ourTexts) {
    const w = words(text); let i = 0;
    while (i + n <= w.length) {
      if (!grams.has(w.slice(i, i + n).join(" "))) { i++; continue; }
      let j = i + n;
      while (j < w.length && grams.has(w.slice(j - n + 1, j + 1).join(" "))) j++;
      runs.push({ file: name, words: j - i, snippet: w.slice(i, Math.min(j, i + 16)).join(" ") + (j - i > 16 ? " …" : "") });
      i = j;
    }
  }
  return runs;
}

export function peerDirs(root, slug) {
  const base = resolveInside(root, "research", "peers");
  if (!fs.existsSync(base)) return [];
  const names = slug ? [assertSlug(slug, "--peer-slug")] : fs.readdirSync(base, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  return names.map((n) => path.join(base, n)).filter((d) => fs.existsSync(d));
}

/** Files in public/ (and extra dirs such as src/, out/) that are byte-identical to captured peer assets. public/_peer is skipped (its existence is a BLOCKER anyway). */
export function peerFilesInPublic(root, dirs, publicDir = "public", extraDirs = []) {
  const scan = [publicDir, ...extraDirs].map((d) => path.resolve(root, d)).filter((d) => fs.existsSync(d));
  if (!scan.length) return [];
  const known = new Map();
  for (const d of dirs) {
    for (const f of walkFiles(path.join(d, "assets"))) {
      if (f.endsWith(".json")) { try { const m = JSON.parse(fs.readFileSync(f, "utf8")); if (m.sha256) known.set(m.sha256, `${path.basename(d)}/${m.file}`); } catch { /* ignore */ } }
      else known.set(sha256File(f), `${path.basename(d)}/${path.basename(f)}`);
    }
  }
  if (!known.size) return [];
  return scan.flatMap((d) => walkFiles(d)).filter((f) => !/[\\/]_peer[\\/]/.test(f) && fs.statSync(f).size < 50_000_000).map((f) => ({ file: path.relative(root, f), hash: sha256File(f) })).filter((x) => known.has(x.hash)).map((x) => ({ file: x.file, matches: known.get(x.hash) }));
}

export function loadOurTexts(root, ours) {
  const dir = path.resolve(root, ours);
  if (!fs.existsSync(dir)) return [];
  return walkFiles(dir).filter((f) => /\.(txt|html?)$/i.test(f)).map((f) => {
    const raw = fs.readFileSync(f, "utf8");
    return { name: path.relative(root, f), text: /\.html?$/i.test(f) ? htmlToText(raw) : stripBanner(raw) };
  });
}

/** String literals of our content modules and the Sanity seed, read directly (no capture needed). */
export function contentTexts(root) {
  const files = [...walkFiles(path.join(root, "src", "content")), path.join(root, "studio", "scripts", "seed.ts")].filter((f) => /\.(ts|tsx|js|json)$/.test(f) && fs.existsSync(f));
  return files.map((f) => ({ name: path.relative(root, f), text: [...fs.readFileSync(f, "utf8").matchAll(/(["'`])((?:\\.|(?!\1)[^\\])*)\1/g)].map((m) => m[2]).join(" . ") }));
}

/** Our capture older than the newest source file → its text may not be what ships. */
export function staleCapture(root, ours = "research/build/site/text") {
  const cap = walkFiles(path.resolve(root, ours));
  if (!cap.length) return null;
  const capTime = Math.max(...cap.map((f) => fs.statSync(f).mtimeMs));
  const src = walkFiles(path.join(root, "src")).filter((f) => /\.(tsx?|jsx?|mdx?|json)$/.test(f));
  if (!src.length) return null;
  const newest = src.reduce((a, f) => (fs.statSync(f).mtimeMs > a.t ? { f, t: fs.statSync(f).mtimeMs } : a), { f: null, t: 0 });
  return newest.t > capTime ? { capture: new Date(capTime).toISOString().slice(0, 16), newest: path.relative(root, newest.f) } : null;
}

export function runCopyCheck({ root = process.cwd(), peerSlug, ours = "research/build/site/text", n = 8, publicDir = "public", extraDirs = [] } = {}) {
  const dirs = peerDirs(root, peerSlug);
  const peerTexts = dirs.flatMap((d) => walkFiles(path.join(d, "text")).filter((f) => f.endsWith(".txt")).map((f) => stripBanner(fs.readFileSync(f, "utf8"))));
  const ourTexts = loadOurTexts(root, ours);
  const runs = sharedRuns(peerTexts, [...ourTexts, ...contentTexts(root)], n);
  return { peers: dirs.map((d) => path.basename(d)), ourFiles: ourTexts.length, runs, assets: peerFilesInPublic(root, dirs, publicDir, extraDirs), stale: staleCapture(root, ours) };
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (invokedDirectly) {
  try {
    const a = {}; const argv = process.argv.slice(2);
    for (let i = 0; i < argv.length; i++) if (argv[i].startsWith("--")) { a[argv[i].slice(2)] = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true; }
    const r = runCopyCheck({ peerSlug: typeof a["peer-slug"] === "string" ? a["peer-slug"] : undefined, ours: typeof a.ours === "string" ? a.ours : undefined, n: Number(a.n || 8), publicDir: typeof a.public === "string" ? a.public : "public", extraDirs: ["src", "out"] });
    if (r.stale) console.log(`HIGH stale: our capture (${r.stale.capture}) is older than ${r.stale.newest} — re-capture first`);
    if (!r.peers.length) console.log("copy-check: no captured references in research/peers — nothing to compare");
    if (!r.ourFiles) console.log("copy-check: no text of our site found — run: node tools/capture.mjs http://localhost:3000 --local --pages /,... first");
    const lines = [...r.runs.map((x) => `BLOCKER text: ${x.words} shared words in ${x.file}: "${x.snippet}"`), ...r.assets.map((x) => `BLOCKER file: ${x.file} is identical to reference asset ${x.matches}`)];
    for (const l of lines.slice(0, 10)) console.log(l.slice(0, 200));
    if (lines.length > 10) console.log(`… ${lines.length - 10} more — node tools/preship-scrub.mjs lists them all in research/build/preship-report.md`);
    if (!r.runs.length && !r.assets.length) console.log(`copy-check: clean (${r.peers.length} reference(s), ${r.ourFiles} page text file(s))`);
    console.log(`Next: ${r.stale ? "re-capture our site, then re-run" : r.runs.length || r.assets.length ? "rewrite each copied run in the client's words / replace each reference file, then re-run" : "continue"}`);
    process.exitCode = r.runs.length || r.assets.length ? 1 : 0;
  } catch (e) { console.error(`copy-check: ${String(e.message || e).split("\n")[0]}`); process.exitCode = 1; }
}
