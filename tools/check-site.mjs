#!/usr/bin/env node
// Visual and runtime QA of OUR site (loopback only): screenshots at each width plus checks that catch
// what "looks done" hides — overflow, off-centre forms, uneven spacing, overlaps, console errors, loops.
//   node tools/check-site.mjs [--base http://localhost:3000 | --serve out] --pages /,/about [--widths 375,1440] [--qa] [--launch] [--band <n>]
// BLOCKER → exit 1. Full JSON: research/build/site-check.json. Screenshots: research/build/site-check/.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { checkUrl, isLoopbackHost } from "./lib/guard.mjs";
import { launchBrowser, hardenedContext } from "./lib/browser.mjs";
import { writeInside, writeJsonInside, pageSlug, assertSlug } from "./lib/paths.mjs";
import { readPageMap } from "./lib/pagemap.mjs";
import { pageQaFacts, overlaps, asymmetric, offScale, siblingGaps, loopSuspect, bandOrder, blueprintOrder, verdict, DEV_NOISE } from "./lib/sitecheck.mjs";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) { if (!argv[i].startsWith("--")) continue; const k = argv[i].slice(2); const n = argv[i + 1]; if (n === undefined || n.startsWith("--")) a[k] = true; else { a[k] = n; i++; } }
  return a;
}

/** Judge one page at one width from the collected facts and runtime events. */
export function judge(facts, rt, { launch = false, expected = [] } = {}) {
  const F = [];
  const add = (severity, check, detail) => F.push({ severity, check, detail });
  if (facts.overflow.scrollWidth > facts.overflow.clientWidth + 1) add("BLOCKER", "Horizontal overflow", `page is ${facts.overflow.scrollWidth}px wide in a ${facts.overflow.clientWidth}px viewport`);
  for (const e of rt.errors.slice(0, 4)) add("BLOCKER", "Console error", e);
  for (const r of rt.failed.slice(0, 4)) add(/favicon/.test(r) ? "WARN" : "BLOCKER", "Failed request", r);
  for (const c of rt.csp.slice(0, 4)) add("BLOCKER", "CSP violation", c);
  for (const s of facts.brokenImages) add("BLOCKER", "Broken image", s);
  const loop = loopSuspect(rt.loop);
  if (loop.length) add("BLOCKER", "Possible infinite loop", loop.join("; "));
  if (facts.viewportMeta === false) add("BLOCKER", "No viewport meta", "phones render the page 980px wide — Next adds it by default; check the root layout");
  if (facts.h1 !== 1) add("BLOCKER", "Headings", `${facts.h1} h1 elements (need exactly 1)`);
  const order = bandOrder(facts.bands, expected);
  if (order) add("BLOCKER", "Band order", order);
  if (facts.pending.length) add(launch ? "BLOCKER" : "WARN", "Pending content", facts.pending.join(" · "));
  if (facts.peerRefs) add(launch ? "BLOCKER" : "WARN", "Reference stand-ins", `${facts.peerRefs} element(s) load /_peer/ files`);
  for (const o of facts.outside.slice(0, 4)) add("HIGH", "Outside the viewport", o);
  for (const o of overlaps(facts.texts).slice(0, 4)) add("HIGH", "Overlapping text", `${o.a} × ${o.b} (${o.pct}%)`);
  for (const c of facts.centred.filter((x) => asymmetric(x))) add("HIGH", "Off-centre", `${c.sel}: left ${c.leftGap}px vs right ${c.rightGap}px`);
  for (const s of facts.spacing) { const bad = offScale(s.vals.map(([, v]) => v), facts.base, facts.named); if (bad.length) add("HIGH", "Off-scale spacing", `${s.sel}: ${s.vals.filter(([, v]) => bad.includes(v)).map(([k, v]) => `${k} ${v}px`).join(", ")} (scale ${facts.base}px)`); }
  for (const g of facts.groups) { const r = siblingGaps(g.rects); if (r && r.spread > 2) add("HIGH", "Uneven gaps", `${g.sel}: ${r.axis} gaps ${r.gaps.join("/")}px`); }
  for (const t of facts.taps) add("HIGH", "Tap target < 44px", t);
  for (const h of facts.heavyImages) add("WARN", "Oversized image", h);
  for (const n of facts.noAlt) add("WARN", "Image without alt", n);
  if (facts.imageSlots.length) add("WARN", "Empty image slots", facts.imageSlots.join(", "));
  return F;
}

async function checkPage(context, url, width, height, opts) {
  const page = await context.newPage();
  const rt = { errors: [], failed: [], csp: [], loop: { mutations: 0, requests: 0, longTaskMs: 0 } };
  const origin = new URL(url).origin;
  page.on("console", (m) => { const t = m.text(); if (DEV_NOISE.test(t)) return; if (/Content Security Policy|Refused to (load|execute|apply|connect|frame)/i.test(t)) rt.csp.push(t.slice(0, 200)); else if (m.type() === "error") rt.errors.push(t.slice(0, 200)); });
  page.on("pageerror", (e) => rt.errors.push(`uncaught: ${String(e.message || e).slice(0, 180)}`));
  page.on("response", (r) => { const u = r.url(); if (r.status() >= 400 && u.startsWith(origin) && !DEV_NOISE.test(u)) rt.failed.push(`${r.status()} ${u.slice(origin.length) || "/"}`); });
  let counting = false;
  page.on("request", (r) => { if (counting && !DEV_NOISE.test(r.url())) rt.loop.requests++; });
  try {
    await page.goto(url, { waitUntil: "load", timeout: 45000 });
    await sleep(2000);
    // Loop detector: 3 s window, only element/text changes count (not style/attribute changes).
    await page.evaluate(() => {
      window.__qa = { m: 0, lt: 0 };
      new MutationObserver((list) => { for (const x of list) window.__qa.m += x.type === "childList" ? x.addedNodes.length + x.removedNodes.length : 1; }).observe(document, { childList: true, characterData: true, subtree: true });
      try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__qa.lt += e.duration; }).observe({ type: "longtask" }); } catch (e) { /* not supported */ }
    });
    counting = true; await sleep(3000); counting = false;
    const q = await page.evaluate(() => window.__qa).catch(() => ({ m: 0, lt: 0 }));
    rt.loop.mutations = q.m; rt.loop.longTaskMs = q.lt;
    // Scroll through once so reveals and lazy images settle, then back to the top.
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < Math.min(h, 30000); y += Math.round(height * 0.8)) { await page.evaluate((t) => window.scrollTo(0, t), y); await sleep(120); }
    await page.evaluate(() => window.scrollTo(0, 0)); await sleep(1200);
    rt.csp.push(...(await page.evaluate(() => window.__csp || []).catch(() => [])));
    const shot = await page.screenshot({ fullPage: true, animations: "disabled", caret: "hide", timeout: 30000 }).catch(() => null);
    const facts = await page.evaluate(pageQaFacts, { band: opts.band || null });
    return { facts, rt, shot };
  } finally { await page.close().catch(() => {}); }
}

export async function runCheckSite(opts) {
  const root = process.cwd();
  const start = new URL(opts.base);
  if (!checkUrl(opts.base, { allowLoopback: true }).ok || !isLoopbackHost(start.hostname)) throw new Error("check-site only checks our own build on localhost / 127.0.0.1");
  const plan = fs.existsSync(path.join(root, "plan.md")) ? fs.readFileSync(path.join(root, "plan.md"), "utf8") : "";
  const map = readPageMap(root);
  const nameOf = (route) => { const hit = map.find((p) => p.build === route); return hit ? hit.name : pageSlug(route); };
  const { browser } = await launchBrowser({ channel: process.env.CAPTURE_CHANNEL || "chromium", headless: true, unsafeNoSandbox: opts.unsafeNoSandbox });
  const results = [];
  try {
    for (const width of opts.widths) {
      const height = width < 768 ? 812 : width < 1200 ? 1024 : 900;
      const { context } = await hardenedContext(browser, { width, height, allowLoopback: true, origin: start.origin });
      await context.addInitScript(() => { document.addEventListener("securitypolicyviolation", (e) => { (window.__csp = window.__csp || []).push(`${e.violatedDirective} blocked ${e.blockedURI || "inline"}`); }); });
      try {
        for (const route of opts.pages) {
          const url = new URL(route, start).toString();
          const { facts, rt, shot } = await checkPage(context, url, width, height, opts);
          const name = nameOf(route);
          if (shot) writeInside(root, path.join("research", "build", "site-check", `${pageSlug(route)}${opts.band ? `-band-${opts.band}` : ""}-${width}.png`), shot);
          const findings = judge(facts, rt, { launch: opts.launch, expected: opts.band ? [] : blueprintOrder(plan, name) });
          results.push({ route, name, width, findings });
        }
      } finally { await context.close().catch(() => {}); }
    }
  } finally { await browser.close().catch(() => {}); }
  const all = results.flatMap((r) => r.findings);
  const summary = verdict(all);
  writeJsonInside(root, path.join("research", "build", opts.band ? `site-check-band-${opts.band}.json` : "site-check.json"), { time: new Date().toISOString(), base: opts.base, launch: opts.launch, pages: results, summary });
  return { results, summary };
}

export function render({ results, summary }, opts) {
  const L = [`check-site · ${opts.pages.length} page(s) × ${opts.widths.join("/")} · BLOCKER ${summary.BLOCKER} · HIGH ${summary.HIGH} · WARN ${summary.WARN}`];
  const order = { BLOCKER: 0, HIGH: 1, WARN: 2 };
  const flat = results.flatMap((r) => r.findings.map((f) => ({ ...f, at: `${r.route}@${r.width}` }))).sort((a, b) => order[a.severity] - order[b.severity]);
  for (const f of flat.slice(0, 11)) L.push(`  ${f.severity.padEnd(7)} ${f.at} ${f.check}: ${f.detail}`.slice(0, 200));
  if (flat.length > 11) L.push(`  … ${flat.length - 11} more in research/build/site-check${opts.band ? `-band-${opts.band}` : ""}.json`);
  L.push(`Screenshots: research/build/site-check/ — open them and write one verdict line per page and width.`);
  L.push(summary.BLOCKER ? "Next: fix every BLOCKER with /fix, then re-run." : summary.HIGH ? "Next: fix the HIGH items (or explain each), then re-run." : "Next: clean — continue.");
  return L.join("\n");
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (invokedDirectly) {
  const a = parseArgs(process.argv.slice(2));
  const widths = String(a.widths || "375,1440").split(",").map(Number).filter((n) => n >= 320 && n <= 2560);
  if (a.qa && !widths.includes(768)) widths.push(768);
  const opts = { base: typeof a.base === "string" ? a.base : "http://localhost:3000/", pages: String(a.pages || "/").split(",").map((p) => p.trim()).filter(Boolean), widths: widths.sort((x, y) => y - x), launch: Boolean(a.launch), band: typeof a.band === "string" ? assertSlug(a.band, "--band") : null, unsafeNoSandbox: Boolean(a["unsafe-no-sandbox"]) };
  (async () => {
    let srv = null;
    try {
      if (typeof a.serve === "string") { const { serveStatic } = await import("./lib/serve.mjs"); srv = await serveStatic(a.serve); opts.base = srv.url; }
      const r = await runCheckSite(opts);
      console.log(render(r, opts));
      process.exitCode = r.summary.BLOCKER ? 1 : 0;
    } catch (e) { console.error(`check-site: ${String(e.message || e).split("\n")[0]}`); process.exitCode = 1; }
    finally { if (srv) await srv.close(); }
  })();
}
