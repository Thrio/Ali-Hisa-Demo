#!/usr/bin/env node
// One command per band: capture our route → overlays at 1440 and 375 (one sheet each) → measure diff → check-site in the band.
//   node tools/band-check.mjs --peer-slug <ref> --page <name> --band <n> [--base http://localhost:3000 | --serve out] [--first-screen]
// Prints ≤ 12 lines and a verdict: REVIEW (open the sheets) · FIX (structure, placement or a BLOCKER/HIGH) · NEEDS-REVIEW (round > 3).
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { assertSlug, resolveInside, writeJsonInside } from "./lib/paths.mjs";
import { resolvePage } from "./lib/pagemap.mjs";
import { runCapture } from "./capture.mjs";
import { runOverlay } from "./overlay.mjs";
import { compareMeasures } from "./measure-diff.mjs";
import { runCheckSite } from "./check-site.mjs";

const WIDTHS = [1440, 375];
const STRUCTURAL = /height differs|aligns better shifted|edges exist only|widths differ/;

/** base = what the evidence says (FIX / REVIEW); verdict = base, or NEEDS-REVIEW when a FIX has run past 3 rounds (log it, move on). */
export function bandVerdict({ hints, siteFindings, round }) {
  const structural = hints.some((h) => STRUCTURAL.test(h));
  const serious = siteFindings.some((f) => f.severity === "BLOCKER" || f.severity === "HIGH");
  const base = structural || serious ? "FIX" : "REVIEW";
  return base === "FIX" && round > 3 ? "NEEDS-REVIEW" : base;
}
export function bandBase({ hints, siteFindings }) { return bandVerdict({ hints, siteFindings, round: 1 }); }

// research/build/band-rounds.json: { "<page>/<band>": { rounds, verdict } } (old files hold a bare number).
function readRounds(root) {
  try { return JSON.parse(fs.readFileSync(path.join(root, "research", "build", "band-rounds.json"), "utf8")); } catch { return {}; }
}
export function roundEntry(v) { return typeof v === "number" ? { rounds: v, verdict: null } : { rounds: (v && v.rounds) || 0, verdict: (v && v.verdict) || null }; }

/** Rounds restart at 1 when the band's PROGRESS.md row is already ok (a re-check of an approved band is a new series, so a regression is FIX, not NEEDS-REVIEW). */
export function bandApproved(root, key) {
  try {
    const [page, band] = key.split("/");
    return fs.readFileSync(path.join(root, "PROGRESS.md"), "utf8").split("\n").some((l) => { const c = l.split("|").map((x) => x.trim()); return c[1] && c[1].toLowerCase() === page.toLowerCase() && c[2] === band && /^ok$/i.test(c[3] || ""); });
  } catch { return false; }
}

export function nextRound(root, key) {
  const j = readRounds(root);
  const e = roundEntry(j[key]); e.rounds = bandApproved(root, key) ? 1 : e.rounds + 1; j[key] = e;
  writeJsonInside(root, path.join("research", "build", "band-rounds.json"), j);
  return e.rounds;
}

export function saveVerdict(root, key, verdict, base = verdict) {
  const j = readRounds(root);
  j[key] = { ...roundEntry(j[key]), verdict, base };
  writeJsonInside(root, path.join("research", "build", "band-rounds.json"), j);
}

export async function runBandCheck(opts) {
  const root = process.cwd();
  const pg = resolvePage(root, opts.page);
  const firstScreen = Boolean(opts.firstScreen);
  const band = firstScreen ? "first-screen" : assertSlug(opts.band, "--band");
  await runCapture({ url: opts.base, slug: "site", out: "research/build", pages: [pg.route], guessHome: false, maxPages: 1, widths: WIDTHS, delay: 0, motion: false, states: false, filmstrip: false, local: true, headless: true, unsafeNoSandbox: opts.unsafeNoSandbox, channel: opts.unsafeNoSandbox ? "chromium" : undefined });
  const lines = [], hints = [], sheets = [];
  for (const w of WIDTHS) {
    const file = firstScreen ? `first-screen-${w}.png` : `band-${band}-${w}.png`;
    const peer = resolveInside(root, "research", "peers", opts.peerSlug, "pages", pg.peer, file);
    const build = resolveInside(root, "research", "build", "site", "pages", pg.build, file);
    if (!fs.existsSync(peer)) { lines.push(`${w}: reference shot missing (${path.relative(root, peer)})`); continue; }
    if (!fs.existsSync(build)) { lines.push(`${w}: our shot missing — is data-band="${band}" on the band root at ${pg.route}?`); hints.push("widths differ"); continue; }
    const out = path.join("research", "build", `overlay-${opts.page}-${firstScreen ? "first-screen" : `band-${band}`}-${w}.png`);
    const { files, report } = runOverlay({ peer, build, out, root });
    sheets.push(files[0]);
    hints.push(...report.hints);
    const top = report.hints.find((h) => STRUCTURAL.test(h)) || report.hints[0] || "no structural hint";
    lines.push(`${w}: structure ${report.structureMismatchPct}% · ${top}`.slice(0, 170));
  }
  if (!firstScreen) {
    const diffs = [];
    for (const w of WIDTHS) {
      const pf = resolveInside(root, "research", "peers", opts.peerSlug, "measures", pg.peer, `band-${band}-${w}.json`);
      const bf = resolveInside(root, "research", "build", "site", "measures", pg.build, `band-${band}-${w}.json`);
      if (fs.existsSync(pf) && fs.existsSync(bf)) for (const r of compareMeasures(JSON.parse(fs.readFileSync(pf, "utf8")), JSON.parse(fs.readFileSync(bf, "utf8")))) if (r.status === "differs") diffs.push(`${w} ${r.property} ${r.reference}→${r.build} (${r.lesson.split(":")[0]})`);
    }
    if (diffs.length) lines.push(`measures: ${diffs.slice(0, 3).join(" · ")}${diffs.length > 3 ? ` · +${diffs.length - 3}` : ""}`.slice(0, 200));
  }
  const site = await runCheckSite({ base: opts.base, pages: [pg.route], widths: WIDTHS, launch: false, band: firstScreen ? null : band, unsafeNoSandbox: opts.unsafeNoSandbox });
  const findings = site.results.flatMap((r) => r.findings.map((f) => ({ ...f, width: r.width })));
  const serious = findings.filter((f) => f.severity !== "WARN");
  if (serious.length) lines.push(`check-site: ${serious.slice(0, 2).map((f) => `${f.severity} ${f.check} @${f.width}: ${f.detail}`).join(" · ")}`.slice(0, 200));
  const round = nextRound(root, `${opts.page}/${band}`);
  const verdict = bandVerdict({ hints, siteFindings: findings, round });
  saveVerdict(root, `${opts.page}/${band}`, verdict, bandBase({ hints, siteFindings: findings }));
  return { lines, sheets, verdict, round };
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (invokedDirectly) {
  const a = {}; const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) if (argv[i].startsWith("--")) { const n = argv[i + 1]; a[argv[i].slice(2)] = n && !n.startsWith("--") ? (i++, n) : true; }
  (async () => {
    let srv = null;
    try {
      if (!a["peer-slug"] || !a.page || (!a.band && !a["first-screen"])) throw new Error("usage: --peer-slug <ref> --page <name> --band <n> [--base URL | --serve out] [--first-screen]");
      const opts = { peerSlug: assertSlug(String(a["peer-slug"]), "--peer-slug"), page: String(a.page), band: a.band ? String(a.band) : null, firstScreen: Boolean(a["first-screen"]), base: typeof a.base === "string" ? a.base : "http://localhost:3000/", unsafeNoSandbox: Boolean(a["unsafe-no-sandbox"]) };
      if (typeof a.serve === "string") { const { serveStatic } = await import("./lib/serve.mjs"); srv = await serveStatic(a.serve); opts.base = srv.url; }
      const r = await runBandCheck(opts);
      console.log([`band-check ${opts.page} ${opts.firstScreen ? "first screen" : `band ${opts.band}`} · round ${r.round}`, ...r.lines, `open: ${r.sheets.join("  ") || "—"}`, `verdict: ${r.verdict}`,
        r.verdict === "REVIEW" ? "Next: open both sheets, write one verdict line per width, then show the band." : r.verdict === "FIX" ? "Next: fix structure/placement first (L1–L13), then run band-check again." : "Next: commit, mark needs review in PROGRESS.md with the reason, move on."].slice(0, 12).join("\n"));
      process.exitCode = r.verdict === "FIX" ? 1 : 0;
    } catch (e) { console.error(`band-check: ${String(e.message || e).split("\n")[0]}`); process.exitCode = 1; }
    finally { if (srv) await srv.close(); }
  })();
}
