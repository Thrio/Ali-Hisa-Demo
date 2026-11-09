import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { runPreship, runHandoffCheck, cspProblems, PUBLIC_SECRET_NAME } from "../preship-scrub.mjs";
import { exportSite, handoffNote } from "../handoff-export.mjs";
import { refetchAll, toPublic } from "../fetch-asset.mjs";
import { contentTexts, staleCapture } from "../copy-check.mjs";
import { dhashFromGray, hamming } from "../lib/imagehash.mjs";
import { encodePng, blank } from "../lib/png.mjs";

function project(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ps-"));
  for (const [rel, text] of Object.entries(files)) { fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true }); fs.writeFileSync(path.join(root, rel), text); }
  return root;
}
const has = (F, sev, check, re = /./) => F.some((f) => f.severity === sev && f.check === check && re.test(f.detail));

test("fresh clone: logged stand-ins and reference text missing are BLOCKERs, not a silent pass (G10)", () => {
  const root = project({ "research/peers/ref/asset-sources.md": "| File | Source URL | sha256 | Bytes | Fetched |\n|---|---|---|---|---|\n| hero-1a2b3c4d.jpg | https://ref.example/hero.jpg | 1a2b3c4d5e6f7a8b… | 1000 | 2026-10-20 |\n", "research/peers/ref/report.md": "# r" });
  const F = runPreship(root);
  assert.ok(has(F, "BLOCKER", "Reference assets missing here", /--refetch ref/));
  assert.ok(has(F, "BLOCKER", "Reference text missing here"));
});

test("public key names: secrets blocked, site/publishable/anon keys allowed (G29)", () => {
  for (const bad of ["NEXT_PUBLIC_RESEND_API_KEY", "NEXT_PUBLIC_SANITY_WEBHOOK_SECRET", "NEXT_PUBLIC_STRIPE_KEY", "NEXT_PUBLIC_GITHUB_TOKEN"]) assert.match(bad, PUBLIC_SECRET_NAME, bad);
  for (const ok of ["NEXT_PUBLIC_TURNSTILE_SITE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "NEXT_PUBLIC_SITE_URL"]) assert.doesNotMatch(ok, PUBLIC_SECRET_NAME, ok);
});

test("CSP: parsed, not just named; next.config headers do not count for a static export (G9)", () => {
  assert.deepEqual(cspProblems("default-src 'self'; frame-ancestors 'none'; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com"), []);
  assert.deepEqual(cspProblems("script-src 'self' 'unsafe-eval' *"), ["no default-src", "no frame-ancestors", "script-src allows 'unsafe-eval'", "script-src allows any host"]);
  const pkg = JSON.stringify({ dependencies: { next: "16.4.1" } });
  const a = runPreship(project({ "package.json": pkg, "next.config.mjs": "headers(){ return [{ key: 'Content-Security-Policy', value: 'x' }, 'Strict-Transport-Security X-Content-Type-Options Referrer-Policy'] }" }));
  assert.ok(has(a, "HIGH", "Security headers", /Content-Security-Policy not set in public\/_headers/));
  const b = runPreship(project({ "package.json": pkg, "public/_headers": "/*\n  Content-Security-Policy: script-src 'self'\n  Strict-Transport-Security: max-age=1\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: no-referrer\n" }));
  assert.ok(has(b, "BLOCKER", "Content-Security-Policy", /default-src/));
});

test("built site, worker, wrangler, metadataBase and version ranges (G29, G6)", () => {
  const root = project({
    "package.json": JSON.stringify({ dependencies: { next: "^16.4.1" } }),
    "src/worker.ts": "export default { fetch(){ return new Response('ok') } }",
    "src/app/layout.tsx": "export const metadata = { metadataBase: new URL('http://localhost:3000') }",
    "wrangler.toml": "[vars]\nTURNSTILE_SECRET_KEY = \"0x4AAAAAAAsecretsecret\"\n",
    "out/index.html": "<html><head><meta name=\"robots\" content=\"noindex\"></head><body>[[PENDING: hours]]</body></html>",
    "out/about.html": "<html><body>About</body></html>",
    "out/sitemap.xml": "<urlset><url><loc>https://x.example/</loc></url><url><loc>https://x.example/about</loc></url></urlset>",
    "out/robots.txt": "User-agent: *\nDisallow: /\n",
  });
  const F = runPreship(root);
  assert.ok(has(F, "BLOCKER", "Form Worker", /siteverify/));
  assert.ok(has(F, "BLOCKER", "metadataBase"));
  assert.ok(has(F, "BLOCKER", "Secret in wrangler config", /TURNSTILE_SECRET_KEY/));
  assert.ok(has(F, "BLOCKER", "noindex", /^\/ is in the sitemap/));
  assert.ok(!has(F, "BLOCKER", "noindex", /about/));
  assert.ok(has(F, "BLOCKER", "robots.txt"));
  assert.ok(has(F, "WARN", "Pending content"));
  assert.ok(has(F, "HIGH", "Exact versions", /next@\^16/));
  assert.ok(has(runPreship(root, { launch: true }), "BLOCKER", "Pending content"));
});

test("robots.txt: blocking only AI crawlers is fine; blocking Googlebot is not", () => {
  const base = { "out/index.html": "<html><body>Hi</body></html>", "out/sitemap.xml": "<urlset><url><loc>https://x.example/</loc></url></urlset>" };
  const ai = runPreship(project({ ...base, "out/robots.txt": "User-agent: GPTBot\nDisallow: /\n\nUser-agent: *\nAllow: /\n" }));
  assert.ok(!has(ai, "BLOCKER", "robots.txt"));
  const g = runPreship(project({ ...base, "out/robots.txt": "User-agent: Googlebot\nDisallow: /\n" }));
  assert.ok(has(g, "BLOCKER", "robots.txt"));
});

test("copy-check: identical file in src/, copied text in content modules, stale capture (G11, G12)", () => {
  const ref = Buffer.from("same-bytes-image");
  const root = project({
    "research/peers/ref/text/home.txt": "Our clinic offers gentle family dentistry for every age in the heart of the city",
    "research/peers/ref/assets/x.jpg.json": "{}",
    "src/content/home.ts": "export const hero = { headline: 'Our clinic offers gentle family dentistry for every age in the heart of the city' };",
    "research/build/site/text/home.txt": "Welcome",
  });
  fs.writeFileSync(path.join(root, "research/peers/ref/assets/x.jpg"), ref);
  fs.mkdirSync(path.join(root, "src/assets"), { recursive: true }); fs.writeFileSync(path.join(root, "src/assets/hero.jpg"), ref);
  const old = new Date(Date.now() - 3600e3); fs.utimesSync(path.join(root, "research/build/site/text/home.txt"), old, old);
  const F = runPreship(root);
  assert.ok(has(F, "BLOCKER", "Reference files", /src[\\/]assets[\\/]hero\.jpg/));
  assert.ok(has(F, "BLOCKER", "Copied text", /src[\\/]content[\\/]home\.ts/));
  assert.ok(has(F, "HIGH", "Copied text", /older than/));
  assert.match(contentTexts(root)[0].text, /gentle family dentistry/);
  assert.ok(staleCapture(root));
});

test("handoff export: new repo without kit, research, brief or other clients; check passes (G30, D18)", () => {
  const root = project({
    "plan.md": "| Client | Vera Wines |\n\n## Ops\n\n| Field | Value |\n|---|---|\n| Domain | vera.example |\n| Reference media in production | ❌ never |\n\n## Handoff & ownership\n\nThe client gets a new repo.\n\n| Asset | Owner |\n|---|---|\n| Domain | Client |\n",
    "src/app/page.tsx": "export default function P(){ return <h1>Vera</h1> }", "package.json": "{}",
    "references/used-references.md": "| 2026 | Other Client | Tirana |", "research/peers/ref/pages/home/band-1-1440.png": "png", "brief/notes.md": "x",
    ".cursor/rules/core.mdc": "x", "tools/capture.mjs": "x", "PROGRESS.md": "x", "web-brain.lock": "{}",
  });
  execFileSync("git", ["init", "-q"], { cwd: root }); execFileSync("git", ["add", "-A"], { cwd: root }); execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", "commit", "-qm", "x"], { cwd: root });
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "ho-")), "vera-site");
  assert.throws(() => exportSite(root, path.join(root, "inside")), /outside this project/);
  const r = exportSite(root, out);
  assert.deepEqual(r.kept, ["HANDOFF.md", "package.json", "src"]);
  assert.match(fs.readFileSync(path.join(out, "HANDOFF.md"), "utf8"), /Handoff — Vera Wines[\s\S]*vera\.example/);
  assert.doesNotMatch(fs.readFileSync(path.join(out, "HANDOFF.md"), "utf8"), /Reference media/);
  assert.equal(execFileSync("git", ["log", "--oneline"], { cwd: out, encoding: "utf8" }).trim().split("\n").length, 1);
  assert.deepEqual(runHandoffCheck(out), []);
  fs.mkdirSync(path.join(out, "research")); fs.writeFileSync(path.join(out, "src/app/x.tsx"), "[[PENDING: x]]");
  assert.equal(runHandoffCheck(out).filter((f) => f.severity === "BLOCKER").length, 2);
  assert.match(handoffNote(""), /Handoff — the client/);
});

test("fetch-asset --refetch re-downloads logged stand-ins and flags changed ones; --to-public only for logged files (G40)", async () => {
  const png = encodePng(blank(4, 4));
  const root = project({ "research/peers/ref/asset-sources.md": "| File | Source URL | sha256 | Bytes | Fetched |\n|---|---|---|---|---|\n| a.png | https://ref.example/a.png | 0000000000000000… | 1 | 2026-10-20 |\n| b.png | https://ref.example/b.png | ffff… | 1 | 2026-10-20 |\n" });
  fs.mkdirSync(path.join(root, "research/peers/ref/assets"), { recursive: true }); fs.writeFileSync(path.join(root, "research/peers/ref/assets/b.png"), png);
  const r = await refetchAll({ peer: "ref", root, get: async () => ({ status: 200, body: png }) });
  assert.deepEqual([r.fetched, r.present, r.changed], [1, 1, ["a.png"]]);
  assert.equal(toPublic(root, "research/peers/ref/assets/a.png"), "public/_peer/a.png");
  assert.ok(fs.existsSync(path.join(root, "public/_peer/a.png")));
  fs.writeFileSync(path.join(root, "research/peers/ref/assets/c.png"), png);
  assert.throws(() => toPublic(root, "research/peers/ref/assets/c.png"), /not logged/);
  assert.throws(() => toPublic(root, "brief/c.png"), /only files saved by fetch-asset/);
});

test("dHash: same picture rescaled matches, different picture does not", () => {
  const g1 = Array.from({ length: 72 }, (_, i) => (i % 9) * 20 + Math.floor(i / 9));
  const g2 = g1.map((v) => v * 0.9 + 5);
  const g3 = g1.map((v, i) => (i % 2 ? 255 - v : v));
  assert.equal(hamming(dhashFromGray(g1), dhashFromGray(g2)), 0);
  assert.ok(hamming(dhashFromGray(g1), dhashFromGray(g3)) > 6);
});
