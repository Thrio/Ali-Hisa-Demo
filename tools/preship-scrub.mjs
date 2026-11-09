#!/usr/bin/env node
// Pre-launch gate. Run from the client project root before every deploy and at handoff.
//   node tools/preship-scrub.mjs [--audit] [--launch]       BLOCKER = do not deploy · HIGH = fix before handoff · WARN = check by hand
//   node tools/preship-scrub.mjs --handoff <export-dir>     checks the client export made by tools/handoff-export.mjs
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { walkFiles, writeInside } from "./lib/paths.mjs";
import { checkFloor } from "./lib/versions.mjs";
import { runCopyCheck, peerDirs } from "./copy-check.mjs";
import { parseRobots, isAllowed } from "./lib/robots.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CODE_DIRS = ["src", "app", "components", "lib", "content", "sanity", "studio", "public", "styles"];
const TEXT_EXT = /\.(tsx?|jsx?|mjs|cjs|css|json|jsonc|toml|md|mdx|html?|svg|ya?ml|txt)$/i;
const IMG_EXT = /\.(png|jpe?g|webp|avif|gif)$/i;
export const SECRET_PATTERNS = [
  [/-----BEGIN (RSA |EC |OPENSSH |DSA |)PRIVATE KEY-----/, "private key"],
  [/\bsk_live_[0-9a-zA-Z]{16,}/, "Stripe live secret key"],
  [/\bgh[pousr]_[0-9A-Za-z]{30,}/, "GitHub token"],
  [/\bgithub_pat_[0-9A-Za-z_]{40,}/, "GitHub fine-grained token"],
  [/\bxox[abposr]-[0-9A-Za-z-]{10,}/, "Slack token"],
  [/\bAKIA[0-9A-Z]{16}\b/, "AWS access key"],
  [/\bAIza[0-9A-Za-z_-]{35}\b/, "Google API key"],
  [/\bsk[a-zA-Z0-9]{70,}\b/, "Sanity-style token"],
  [/\bre_[A-Za-z0-9]{8,}_[A-Za-z0-9]{16,}\b/, "Resend API key"],
  [/CLOUDFLARE_API_TOKEN\s*[=:]\s*["']?[A-Za-z0-9_-]{40}/, "Cloudflare API token"],
  [/TURNSTILE_SECRET[A-Z_]*\s*[=:]\s*["']?0x[0-9A-Za-z_-]{20,}/, "Turnstile secret key"],
  [/api\.cloudflare\.com\/client\/v4\/workers\/builds\/deploy_hooks\/[A-Za-z0-9-]{16,}/, "Cloudflare deploy hook URL"],
];
// Public by design: Turnstile site key, publishable / anon keys.
export const PUBLIC_SECRET_NAME = /NEXT_PUBLIC_(?![A-Z0-9_]*(SITE_KEY|PUBLISHABLE_KEY|ANON_KEY)\b)[A-Z0-9_]*(SECRET|PRIVATE|PASSWORD|TOKEN|SERVICE_ROLE|WEBHOOK|_KEY|APIKEY)\b/;
export const HANDOFF_REMOVE = [".cursor", "tools", "references", "research", "brief", "design", "docs/upgrade", ".kit-updates", "PROGRESS.md", "plan.md", "DESIGN.md", "AGENTS.md", "SECURITY.md", "web-brain.lock", "ecommerce-brain.lock", ".cursorignore", "public/_peer"];

function gitFiles(root) {
  try { return execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).split("\n").filter(Boolean); }
  catch { return null; }
}
const codeFiles = (root) => CODE_DIRS.flatMap((d) => walkFiles(path.join(root, d))).filter((f) => TEXT_EXT.test(f) && !/[\\/]_peer[\\/]/.test(f) && fs.statSync(f).size < 2_000_000);
const builtHtml = (root) => walkFiles(path.join(root, "out")).filter((f) => /\.html$/i.test(f));

/** Summarise `npm audit --json` output: counts plus the high and critical packages and what npm would change. */
export function summarizeAudit(report) {
  const m = (report && report.metadata && report.metadata.vulnerabilities) || {};
  const list = Object.entries((report && report.vulnerabilities) || {}).map(([name, v]) => {
    const f = v && v.fixAvailable;
    return { name, severity: v && v.severity, fix: f && typeof f === "object" ? `${f.name}@${f.version}${f.isSemVerMajor ? " (breaking)" : ""}` : Boolean(f) };
  });
  const rank = { critical: 0, high: 1 };
  return {
    total: m.total ?? list.length, critical: m.critical || 0, high: m.high || 0, moderate: m.moderate || 0, low: m.low || 0,
    top: list.filter((x) => x.severity in rank).sort((a, b) => rank[a.severity] - rank[b.severity]).slice(0, 15),
  };
}

/** Parse a Content-Security-Policy value into { directive: [sources] }. */
export function parseCsp(value) {
  const out = {};
  for (const part of String(value).split(";")) { const [d, ...src] = part.trim().split(/\s+/); if (d) out[d.toLowerCase()] = src; }
  return out;
}
export function cspProblems(value) {
  const p = parseCsp(value); const out = [];
  if (!p["default-src"]) out.push("no default-src");
  if (!p["frame-ancestors"]) out.push("no frame-ancestors");
  for (const [d, src] of Object.entries(p)) {
    if (src.includes("'unsafe-eval'")) out.push(`${d} allows 'unsafe-eval'`);
    if (src.some((s) => s === "*" || /^https?:\/\/\*$/.test(s) || s === "https:" || s === "http:")) out.push(`${d} allows any host`);
  }
  return out;
}

export function runPreship(root = process.cwd(), { audit = false, launch = false } = {}) {
  const F = [];
  const add = (severity, check, detail) => F.push({ severity, check, detail });
  const rel = (f) => path.relative(root, f);

  // Reference files and text
  if (fs.existsSync(path.join(root, "public", "_peer"))) add("BLOCKER", "Reference comps", "public/_peer/ still exists — replace every comp, then delete the folder");
  const dirs = peerDirs(root);
  for (const d of dirs) {
    const name = path.basename(d);
    const log = path.join(d, "asset-sources.md");
    const logged = fs.existsSync(log) ? fs.readFileSync(log, "utf8").split("\n").filter((l) => /^\| [^|]+\.(png|jpe?g|webp|avif|gif|svg|mp4|webm) \|/i.test(l)).length : 0;
    const have = walkFiles(path.join(d, "assets")).filter((f) => !f.endsWith(".json")).length;
    if (logged && have < logged) add("BLOCKER", "Reference assets missing here", `${name}: ${logged} logged, ${have} on this machine — run node tools/fetch-asset.mjs --refetch ${name} (a fresh clone has none, so nothing could be compared)`);
    if (fs.existsSync(path.join(d, "report.md")) && !fs.existsSync(path.join(d, "text"))) add("BLOCKER", "Reference text missing here", `${name}: no text/ — re-capture with node tools/capture.mjs <url> --slug ${name} --fast so copy-check can compare`);
  }
  const cc = runCopyCheck({ root, extraDirs: ["src", "out"] });
  for (const x of cc.assets) add("BLOCKER", "Reference files", `${x.file} is identical to reference asset ${x.matches}`);
  for (const x of cc.runs) add("BLOCKER", "Copied text", `${x.words} shared words in ${x.file}: "${x.snippet}"`);
  if (dirs.length && !cc.ourFiles) add("HIGH", "Copied text", "no capture of our site to compare — run: node tools/capture.mjs --serve out --pages <all routes> --fast");
  if (cc.stale) add("HIGH", "Copied text", `our capture (${cc.stale.capture}) is older than ${cc.stale.newest} — re-capture before trusting copy-check`);

  const hosts = new Set();
  for (const d of dirs) { try { const m = JSON.parse(fs.readFileSync(path.join(d, "manifest.json"), "utf8")); if (m.origin) hosts.add(new URL(m.origin).hostname.replace(/^www\./, "")); } catch { /* no manifest */ } }
  const files = codeFiles(root);
  for (const f of files) {
    const text = fs.readFileSync(f, "utf8");
    for (const h of hosts) if (text.includes(h)) add("BLOCKER", "Reference domain in code", `${rel(f)} mentions ${h} (hotlinked asset or leftover reference)`);
    const pub = text.match(PUBLIC_SECRET_NAME);
    if (pub) add("BLOCKER", "Secret in a public variable", `${rel(f)} uses ${pub[0]} — NEXT_PUBLIC_ values ship to every visitor`);
    if (/dangerouslyAllowSVG\s*:\s*true/.test(text)) add("BLOCKER", "SVG image processing", `${rel(f)} enables dangerouslyAllowSVG (October 2026 RCE class) — serve SVG as static files`);
    if (/dangerouslySetInnerHTML/.test(text) && !/application\/ld\+json/.test(text)) add("WARN", "Raw HTML", `${rel(f)} uses dangerouslySetInnerHTML outside JSON-LD — confirm the content is ours and escaped`);
    if (/metadataBase\s*[:=][^\n]*(localhost|127\.0\.0\.1)/.test(text)) add("BLOCKER", "metadataBase", `${rel(f)} points metadataBase at localhost — use the live site URL`);
  }
  const slots = files.filter((f) => /\.(tsx|jsx)$/.test(f) && /<ImageSlot\b|data-image-slot/.test(fs.readFileSync(f, "utf8")) && !/components[\\/]ui[\\/]image-slot/.test(f));
  if (slots.length) add("WARN", "Empty image slots", `${slots.length} file(s) still use ImageSlot (${slots.slice(0, 3).map(rel).join(", ")}) — client photos pending`);
  for (const name of ["next.config.js", "next.config.mjs", "next.config.ts"]) {
    const f = path.join(root, name);
    if (fs.existsSync(f) && /dangerouslyAllowSVG\s*:\s*true/.test(fs.readFileSync(f, "utf8"))) add("BLOCKER", "SVG image processing", `${name} enables dangerouslyAllowSVG`);
  }
  const envExample = path.join(root, ".env.example");
  if (fs.existsSync(envExample)) { const m = fs.readFileSync(envExample, "utf8").match(PUBLIC_SECRET_NAME); if (m) add("BLOCKER", "Secret in a public variable", `.env.example declares ${m[0]}`); }
  for (const name of ["wrangler.toml", "wrangler.json", "wrangler.jsonc"]) {
    const f = path.join(root, name);
    if (!fs.existsSync(f)) continue;
    const t = fs.readFileSync(f, "utf8");
    for (const m of t.matchAll(/["']?([A-Z0-9_]*(SECRET|TOKEN|PASSWORD|API_KEY|PRIVATE)[A-Z0-9_]*)["']?\s*[=:]\s*["']([^"']{6,})["']/g)) add("BLOCKER", "Secret in wrangler config", `${name}: ${m[1]} has a value — use a Worker secret (wrangler secret put / dashboard)`);
  }

  // Git
  const tracked = gitFiles(root);
  if (tracked) {
    for (const t of tracked) {
      if (/(^|\/)\.env(\.|$)/.test(t) && !t.endsWith(".env.example")) add("BLOCKER", "Secrets in git", `${t} is committed`);
      if (/(^|\/)\.dev\.vars/.test(t)) add("BLOCKER", "Secrets in git", `${t} is committed`);
      if (/^research\/peers\/[^/]+\/(assets|text)\//.test(t)) add("HIGH", "Reference files in git", `${t} is committed — remove it and keep only asset-sources.md`);
    }
    for (const t of tracked) {
      const f = path.join(root, t);
      if (!fs.existsSync(f) || !TEXT_EXT.test(t) || fs.statSync(f).size > 2_000_000 || t.startsWith("tools/")) continue;
      const text = fs.readFileSync(f, "utf8");
      for (const [re, label] of SECRET_PATTERNS) if (re.test(text)) add("BLOCKER", "Secret in git", `${t} contains what looks like a ${label}`);
    }
  } else add("WARN", "Secrets in git", "not a git repo here — the tracked-file checks were skipped");

  // Security headers: a static export ignores next.config headers(); only public/_headers counts (OpenNext path: next.config too).
  const pkgFile = path.join(root, "package.json");
  let pkg = null; try { pkg = JSON.parse(fs.readFileSync(pkgFile, "utf8")); } catch { /* none */ }
  const openNext = fs.existsSync(path.join(root, "open-next.config.ts")) || Boolean(pkg && { ...pkg.dependencies, ...pkg.devDependencies }["@opennextjs/cloudflare"]);
  const headerSources = ["public/_headers", ...(openNext ? ["next.config.js", "next.config.mjs", "next.config.ts"] : [])].map((n) => path.join(root, n)).filter((f) => fs.existsSync(f));
  const headerText = headerSources.map((f) => fs.readFileSync(f, "utf8")).join("\n");
  if (pkg) {
    for (const h of ["Content-Security-Policy", "Strict-Transport-Security", "X-Content-Type-Options", "Referrer-Policy"]) if (!headerText.includes(h)) add("HIGH", "Security headers", `${h} not set in public/_headers${openNext ? " or next.config headers()" : " (next.config headers() do not apply to a static export)"}`);
    const csp = headerText.match(/Content-Security-Policy:\s*([^\n]+)/);
    if (csp) for (const p of cspProblems(csp[1])) add("BLOCKER", "Content-Security-Policy", p);
  }

  // Webhooks and forms
  for (const f of files.filter((x) => /[\\/]api[\\/]revalidate[\\/]/.test(x))) if (!/parseBody|isValidSignature/.test(fs.readFileSync(f, "utf8"))) add("BLOCKER", "Unsigned webhook", `${rel(f)} does not verify the Sanity signature (use parseBody from next-sanity/webhook)`);
  const worker = path.join(root, "src", "worker.ts");
  if (fs.existsSync(worker)) {
    const w = fs.readFileSync(worker, "utf8");
    if (!/siteverify/.test(w)) add("BLOCKER", "Form Worker", "src/worker.ts never calls Turnstile siteverify — spam and abuse go straight to the inbox");
    if (!/honeypot|hp_|website_url|company_name/i.test(w)) add("HIGH", "Form Worker", "src/worker.ts has no honeypot check");
    if (!/\.limit\(/.test(w)) add("HIGH", "Form Worker", "src/worker.ts has no rate limit (Workers Rate Limiting binding)");
  }

  // Built site (out/)
  const html = builtHtml(root);
  if (html.length) {
    const pending = html.filter((f) => /\[\[PENDING/.test(fs.readFileSync(f, "utf8")));
    if (pending.length) add(launch ? "BLOCKER" : "WARN", "Pending content", `${pending.length} built page(s) still show [[PENDING …]] (${pending.slice(0, 3).map(rel).join(", ")})`);
    const sitemap = path.join(root, "out", "sitemap.xml");
    const locs = fs.existsSync(sitemap) ? [...fs.readFileSync(sitemap, "utf8").matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => { try { return new URL(m[1]).pathname; } catch { return null; } }).filter(Boolean) : [];
    for (const p of locs) {
      const clean = p.replace(/\/+$/, "") || "/";
      const cand = clean === "/" ? ["index.html"] : [`${clean.slice(1)}.html`, `${clean.slice(1)}/index.html`];
      const f = cand.map((c) => path.join(root, "out", c)).find((c) => fs.existsSync(c));
      if (f && /<meta[^>]+name=["']robots["'][^>]+noindex/i.test(fs.readFileSync(f, "utf8"))) add("BLOCKER", "noindex", `${p} is in the sitemap but has noindex`);
    }
    const robots = path.join(root, "out", "robots.txt");
    // Generic crawlers (*) must reach the home page; blocking only named bots (e.g. GPTBot) is fine.
    if (fs.existsSync(robots) && !isAllowed(parseRobots(fs.readFileSync(robots, "utf8")), "Googlebot", "/").allowed) add("BLOCKER", "robots.txt", "robots.txt blocks search engines from the whole site");
  } else if (launch) add("WARN", "Built site", "no out/ — run npm run build so the built pages are checked");

  // Lockfile and exact versions
  const lockFile = path.join(root, "package-lock.json");
  if (pkg && fs.existsSync(lockFile)) {
    try {
      const lockRoot = (JSON.parse(fs.readFileSync(lockFile, "utf8")).packages || {})[""] || {};
      for (const field of ["dependencies", "devDependencies", "optionalDependencies"]) {
        const want = pkg[field] || {}; const got = lockRoot[field] || {};
        for (const [name, spec] of Object.entries(want)) if (got[name] !== spec) add("BLOCKER", "Lockfile out of sync", `${name}: package.json says ${spec}, package-lock.json says ${got[name] ?? "nothing"} — run npm install, then commit both files`);
        for (const name of Object.keys(got)) if (!(name in want)) add("BLOCKER", "Lockfile out of sync", `${name} is in package-lock.json but not in package.json — run npm install`);
      }
    } catch { add("HIGH", "Lockfile", "package.json or package-lock.json is not valid JSON"); }
  } else if (pkg && !fs.existsSync(path.join(root, "pnpm-lock.yaml"))) add("HIGH", "Lockfile", "no package-lock.json — commit one so every install is the same");
  if (pkg) {
    const ranged = Object.entries({ ...pkg.dependencies, ...pkg.devDependencies }).filter(([, v]) => /^[\^~]|^[<>=*]|\bx\b|latest/.test(String(v)));
    if (ranged.length) add("HIGH", "Exact versions", `${ranged.slice(0, 5).map(([k, v]) => `${k}@${v}`).join(", ")} — reinstall with npm install <name>@<version> --save-exact`);
  }

  if (audit) {
    let out = "";
    try { out = execFileSync(process.platform === "win32" ? "npm.cmd" : "npm", ["audit", "--omit=dev", "--json"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 120000 }); }
    catch (e) { out = e && e.stdout ? String(e.stdout) : ""; }
    try {
      const a = summarizeAudit(JSON.parse(out));
      try { writeInside(root, path.join("research", "build", "audit.json"), out); } catch { /* read-only tree */ }
      if (a.critical || a.high) add("HIGH", "npm audit", `${a.critical} critical, ${a.high} high in runtime dependencies (${a.top.slice(0, 6).map((x) => x.name).join(", ")}) — see research/build/audit.json. Update within the same major or choose a lighter layer; never npm audit fix --force`);
      else if (a.total) add("WARN", "npm audit", `${a.total} lower-severity advisories in runtime dependencies — see research/build/audit.json`);
    } catch { add("WARN", "npm audit", "the audit could not run (offline?) — run npm audit --omit=dev before launch"); }
  }

  const floorFile = path.join(HERE, "security-floor.json");
  if (fs.existsSync(floorFile)) for (const x of checkFloor(root, floorFile).findings) add(x.severity.toUpperCase(), "Security floor", `${x.package}: ${x.detail}`);
  return F;
}

/** The client export (tools/handoff-export.mjs): nothing internal, nothing pending. */
export function runHandoffCheck(dir) {
  const F = [];
  for (const p of HANDOFF_REMOVE) if (fs.existsSync(path.join(dir, p))) F.push({ severity: "BLOCKER", check: "Handoff export", detail: `${p} is in the export (internal or reference material)` });
  const files = walkFiles(dir).filter((f) => !/[\\/](node_modules|\.git)[\\/]/.test(f));
  for (const f of files.filter((x) => TEXT_EXT.test(x) && fs.statSync(x).size < 2_000_000)) {
    const t = fs.readFileSync(f, "utf8");
    if (/\[\[PENDING/.test(t)) F.push({ severity: "BLOCKER", check: "Handoff export", detail: `${path.relative(dir, f)} still contains [[PENDING` });
    for (const [re, label] of SECRET_PATTERNS) if (re.test(t)) F.push({ severity: "BLOCKER", check: "Handoff export", detail: `${path.relative(dir, f)} contains what looks like a ${label}` });
  }
  if (!fs.existsSync(path.join(dir, "HANDOFF.md"))) F.push({ severity: "HIGH", check: "Handoff export", detail: "no HANDOFF.md for the client" });
  return F;
}

/** Look-alike reference images (resized or re-encoded): 8×8 difference hash in Chromium, Hamming ≤ 6. */
export async function runImageCheck(root, { unsafeNoSandbox = false } = {}) {
  const dirs = peerDirs(root);
  const peer = dirs.flatMap((d) => walkFiles(path.join(d, "assets")).filter((f) => IMG_EXT.test(f)));
  const ours = ["public", "src", "out"].flatMap((d) => walkFiles(path.join(root, d))).filter((f) => IMG_EXT.test(f) && !/[\\/]_peer[\\/]/.test(f) && fs.statSync(f).size < 20_000_000);
  if (!peer.length || !ours.length) return [];
  const { imageHashes, hamming } = await import("./lib/imagehash.mjs");
  let hp, ho;
  try { hp = await imageHashes(peer, { unsafeNoSandbox }); ho = await imageHashes(ours, { unsafeNoSandbox }); }
  catch (e) { return [{ severity: "WARN", check: "Look-alike images", detail: `unverified — browser not available (${String(e.message || e).split("\n")[0]})` }]; }
  const F = [];
  for (const [f, h] of Object.entries(ho)) {
    if (!h) continue;
    const hit = Object.entries(hp).find(([, p]) => p && hamming(p, h) <= 6);
    if (hit) F.push({ severity: "BLOCKER", check: "Look-alike image", detail: `${path.relative(root, f)} looks like reference image ${path.relative(root, hit[0])}` });
  }
  return F;
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (invokedDirectly) {
  (async () => {
    const root = process.cwd();
    const argv = process.argv.slice(2);
    const hi = argv.indexOf("--handoff");
    let findings;
    if (hi >= 0) {
      const dir = path.resolve(root, argv[hi + 1] || "");
      if (!argv[hi + 1] || !fs.existsSync(dir)) { console.error("preship-scrub: --handoff <export-dir> (made by node tools/handoff-export.mjs)"); process.exitCode = 1; return; }
      findings = runHandoffCheck(dir);
    } else {
      findings = runPreship(root, { audit: argv.includes("--audit"), launch: argv.includes("--launch") });
      findings.push(...await runImageCheck(root, { unsafeNoSandbox: argv.includes("--unsafe-no-sandbox") }));
    }
    const order = { BLOCKER: 0, HIGH: 1, WARN: 2 };
    findings.sort((a, b) => order[a.severity] - order[b.severity]);
    const mode = hi >= 0 ? "handoff" : [argv.includes("--audit") && "audit", argv.includes("--launch") && "launch"].filter(Boolean).join("+") || "basic";
    const lines = ["# Pre-ship scrub", "", `Run ${new Date().toISOString()}${hi >= 0 ? " · handoff export" : ""}`, `Mode: ${mode}`, "", "| Severity | Check | Detail |", "|---|---|---|", ...findings.map((f) => `| ${f.severity} | ${f.check} | ${f.detail.replace(/\|/g, "/")} |`)];
    if (!findings.length) lines.push("| OK | All checks | Nothing found |");
    if (hi < 0) { try { writeInside(root, path.join("research", "build", "preship-report.md"), lines.join("\n") + "\n"); } catch { /* read-only tree */ } }
    for (const f of findings.slice(0, 11)) console.log(`${f.severity.padEnd(7)} ${f.check}: ${f.detail}`.slice(0, 220));
    if (findings.length > 11) console.log(`… ${findings.length - 11} more in research/build/preship-report.md`);
    const blockers = findings.filter((f) => f.severity === "BLOCKER").length;
    console.log(blockers ? `${blockers} BLOCKER(s) — do not deploy.` : findings.length ? "No blockers." : "Clean.");
    console.log(`Next: ${blockers ? "fix the first BLOCKER, then re-run" : findings.some((f) => f.severity === "HIGH") ? "fix or write down each HIGH, then re-run" : mode.includes("launch") ? "/deploy" : "run with --audit --launch before /deploy"}`);
    process.exitCode = blockers ? 1 : 0;
  })();
}
