#!/usr/bin/env node
// Accessibility pass with a pinned LOCAL axe-core (never a CDN), on our own build.
//   axe-core is pinned in tools/package.json (installed by npm ci) — no per-project install.
//   node tools/a11y.mjs http://localhost:3000 --pages /,/about,/contact      (or --serve out: the static build, no server needed)
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { checkUrl, isLoopbackHost } from "./lib/guard.mjs";
import { launchBrowser, hardenedContext } from "./lib/browser.mjs";
import { pageSlug, writeJsonInside } from "./lib/paths.mjs";

export async function runA11y(base, pages, { unsafeNoSandbox = false } = {}) {
  const v = checkUrl(base, { allowLoopback: true });
  if (!v.ok || !isLoopbackHost(v.url.hostname)) throw new Error("a11y runs on our own build at localhost only");
  let axePath;
  try { axePath = createRequire(import.meta.url).resolve("axe-core/axe.min.js"); }
  catch { throw new Error("axe-core is not installed: cd tools && npm ci --ignore-scripts"); }
  const { browser } = await launchBrowser({ channel: process.env.CAPTURE_CHANNEL || "chromium", unsafeNoSandbox });
  const results = {};
  try {
    for (const width of [375, 1440]) {
      const { context } = await hardenedContext(browser, { width, height: width < 768 ? 812 : 900, allowLoopback: true, origin: v.url.origin });
      for (const p of pages) {
        const page = await context.newPage();
        await page.goto(new URL(p, v.url.origin).toString(), { waitUntil: "load", timeout: 45000 });
        await page.addScriptTag({ path: axePath });
        const violations = await page.evaluate(async () => (await window.axe.run()).violations.map((x) => ({ id: x.id, impact: x.impact, nodes: x.nodes.length, help: x.help })));
        results[`${pageSlug(p)}@${width}`] = violations;
        writeJsonInside(process.cwd(), path.join("research", "build", `a11y-${pageSlug(p)}-${width}.json`), violations);
        await page.close();
      }
      await context.close();
    }
  } finally { await browser.close(); }
  return results;
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (invokedDirectly) {
  const argv = process.argv.slice(2);
  const pages = argv.includes("--pages") ? argv[argv.indexOf("--pages") + 1].split(",") : ["/"];
  (async () => {
    let srv = null;
    try {
      let base = argv[0] && !argv[0].startsWith("--") ? argv[0] : "http://localhost:3000";
      if (argv.includes("--serve")) {
        const dir = argv[argv.indexOf("--serve") + 1];
        if (!dir || dir.startsWith("--")) throw new Error("usage: node tools/a11y.mjs --serve out --pages /,/about   (or a URL instead of --serve)");
        const { serveStatic } = await import("./lib/serve.mjs"); srv = await serveStatic(dir); base = srv.url;
      }
      const r = await runA11y(base, pages, { unsafeNoSandbox: argv.includes("--unsafe-no-sandbox") });
      const rank = { critical: 0, serious: 1, moderate: 2, minor: 3 };
      const all = Object.entries(r).flatMap(([k, list]) => list.map((x) => ({ k, ...x }))).sort((a, b) => (rank[a.impact] ?? 4) - (rank[b.impact] ?? 4));
      const serious = all.filter((x) => x.impact === "serious" || x.impact === "critical").length;
      for (const x of all.slice(0, 12)) console.log(`${x.k}  ${x.impact || "-"}  ${x.id} (${x.nodes} nodes) — ${x.help}`.slice(0, 180));
      if (all.length > 12) console.log(`… ${all.length - 12} more in research/build/a11y-*.json`);
      console.log(serious ? `${serious} serious/critical — Blocker. Next: /fix each, then re-run.` : "No serious or critical violations. Next: continue /qa.");
      process.exitCode = serious ? 1 : 0;
    } catch (e) { console.error(`a11y: ${String(e.message || e).split("\n")[0]}`); process.exitCode = 1; }
    finally { if (srv) await srv.close(); }
  })();
}
