#!/usr/bin/env node
// Property-level diagnostics: reference band vs our band, same page, same widths.
// Says WHAT differs and which clone lesson it usually means. Not a score.
//   node tools/measure-diff.mjs --peer-slug ref --page home --band 3 [--widths 375,1440] [--site site]
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { assertSlug, resolveInside, writeInside } from "./lib/paths.mjs";
import { resolvePage } from "./lib/pagemap.mjs";

const px = (v) => { const n = parseFloat(String(v ?? "")); return Number.isFinite(n) ? n : null; };
const sides = (v) => String(v || "").split(/\s+/).map(px);

export function compareMeasures(peer, ours) {
  const rows = [];
  const add = (property, a, b, ok, lesson) => { if (a == null && b == null) return; rows.push({ property, reference: a ?? "—", build: b ?? "—", status: ok ? "match" : "differs", lesson: ok ? "" : String(lesson).replace(/^[\d, ]+(?=:)/, (m) => m.replace(/\d+/g, (d) => `L${d}`)) }); };
  const near = (a, b, tol) => a != null && b != null && Math.abs(a - b) <= tol;
  const P = peer.placement || {}; const B = ours.placement || {};
  const ps = peer.summary || {}; const bs = ours.summary || {};
  add("placement top (px)", P.top, B.top, near(P.top, B.top, 4), "1, 8: chrome clearance counted twice, or band placed wrong");
  add("height (px)", P.height, B.height, near(P.height, B.height, Math.max(8, (P.height || 0) * 0.03)), "5, 6: padding model, or content blowing a fixed box");
  add("width (px)", P.width, B.width, near(P.width, B.width, 4), "4: gutter eating max-width");
  const pp = sides(ps.padding); const bp = sides(bs.padding);
  ["top", "right", "bottom", "left"].forEach((s, i) => add(`padding ${s}`, ps.padding ? `${pp[i]}px` : null, bs.padding ? `${bp[i]}px` : null, near(pp[i], bp[i], 4), "5: layout or padding model invented"));
  const pc = ps.contentBox || {}; const bc = bs.contentBox || {};
  add("content box width (px)", pc.width, bc.width, near(pc.width, bc.width, 8), "4: gutter vs max-width");
  add("columns", ps.columns, bs.columns, ps.columns === bs.columns, "5: layout model invented");
  add("layout gap", ps.layoutGap, bs.layoutGap, near(px(ps.layoutGap), px(bs.layoutGap), 4) || ps.layoutGap === bs.layoutGap, "5: spacing grammar");
  add("background paint", ps.backgroundPaint, bs.backgroundPaint, ps.backgroundPaint === bs.backgroundPaint, "2: opaque wash where the reference is transparent (or the reverse)");
  add("border t r b l", ps.border, bs.border, ps.border === bs.border, "3: border grammar");
  add("radius", ps.radius, bs.radius, near(px(ps.radius), px(bs.radius), 2) || ps.radius === bs.radius, "3: border grammar");
  for (const role of ["heading", "body"]) {
    const a = ps[role]; const b = bs[role];
    if (!a && !b) continue;
    add(`${role} size`, a && a.size, b && b.size, a && b && near(px(a.size), px(b.size), 2), "type scale off");
    add(`${role} weight`, a && a.weight, b && b.weight, a && b && a.weight === b.weight, "type weight off");
    add(`${role} line height`, a && a.lineHeight, b && b.lineHeight, a && b && (near(px(a.lineHeight), px(b.lineHeight), 3) || a.lineHeight === b.lineHeight), "type rhythm off");
    add(`${role} lines (copy fit)`, a && a.lines, b && b.lines, a && b && Math.abs((a.lines || 0) - (b.lines || 0)) <= 1, "6: client copy longer or shorter than the slot");
  }
  const sa = ps.slots || {}; const sb = bs.slots || {};
  add("images (layered media)", sa.images, sb.images, sa.images === sb.images, "9: a media layer is missing");
  add("headings h1/h2/h3", `${sa.h1}/${sa.h2}/${sa.h3}`, `${sb.h1}/${sb.h2}/${sb.h3}`, sa.h1 === sb.h1 && sa.h2 === sb.h2 && sa.h3 === sb.h3, "12: elements invented or dropped");
  return rows;
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (invokedDirectly) {
  try {
    const a = {}; const argv = process.argv.slice(2);
    for (let i = 0; i < argv.length; i++) if (argv[i].startsWith("--")) { a[argv[i].slice(2)] = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true; }
    const root = process.cwd();
    const slug = assertSlug(String(a["peer-slug"] || ""), "--peer-slug");
    const page = assertSlug(String(a.page || "home"), "--page");
    const band = assertSlug(String(a.band || "1"), "--band");
    const site = assertSlug(String(a.site || "site"), "--site");
    const widths = String(a.widths || "375,1440").split(",").map((w) => w.trim());
    const out = [`# Measure diff — ${page} · band ${band}`, "", "Diagnostics, not a score. Rows marked differs point at the clone lesson they usually mean; colours, copy, logo and photos are expected to differ.", ""];
    let differs = 0;
    for (const w of widths) {
      const pg = resolvePage(root, page);
      const pf = resolveInside(root, "research", "peers", slug, "measures", pg.peer, `band-${band}-${w}.json`);
      const bf = resolveInside(root, "research", "build", site, "measures", pg.build, `band-${band}-${w}.json`);
      if (!fs.existsSync(pf) || !fs.existsSync(bf)) { out.push(`## ${w}px`, "", `Missing ${!fs.existsSync(pf) ? path.relative(root, pf) : path.relative(root, bf)} — capture it first.`, ""); continue; }
      const rows = compareMeasures(JSON.parse(fs.readFileSync(pf, "utf8")), JSON.parse(fs.readFileSync(bf, "utf8")));
      differs += rows.filter((r) => r.status === "differs").length;
      out.push(`## ${w}px`, "", "| Property | Reference | Build | Status | Usually means (lesson) |", "|---|---|---|---|---|", ...rows.map((r) => `| ${r.property} | ${r.reference} | ${r.build} | ${r.status} | ${r.lesson} |`), "");
    }
    const file = writeInside(root, path.join("research", "build", `measure-diff-${page}-band-${band}.md`), out.join("\n"));
    if (a.verbose) console.log(out.join("\n"));
    else { const rows = out.filter((l) => /\| differs \|/.test(l)); console.log(`measure-diff ${page} band ${band}: ${differs} row(s) differ`); for (const l of rows.slice(0, 10)) console.log(`  ${l.replace(/^\| |\s*\|\s*$/g, "").replace(/ \| /g, " · ")}`.slice(0, 180)); if (rows.length > 10) console.log(`  … ${rows.length - 10} more`); }
    console.log(`saved ${path.relative(root, file)}${a.verbose ? "" : " (--verbose prints the full table)"}`);
  } catch (e) { console.error(`measure-diff: ${String(e.message || e).split("\n")[0]}`); process.exitCode = 1; }
}
