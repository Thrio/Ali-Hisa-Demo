import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { summarize, gate, stageStatus, tooling, section, tableRows, blueprintBands, motionTokensTs, tokenValue, render } from "../check-project.mjs";

function project(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cp-"));
  for (const [rel, text] of Object.entries(files)) { fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true }); fs.writeFileSync(path.join(root, rel), text); }
  return root;
}
const PROGRESS = (stages = []) => `# P\n\n## Stage approvals\n\n| Stage | Approved by | Date | Note |\n|---|---|---|---|\n${["kickoff", "refs", "design", "qa"].map((s) => `| ${s} | ${stages.includes(s) ? "Ana" : ""} | | |`).join("\n")}\n\n## Bands\n\n| Page | Band | Status | Rounds | Minutes | Note |\n|---|---|---|---|---|---|\n| home | 1 | ok | 1 | 20 | |\n\n## Run log\n`;
const PLAN_DONE = `| Document status | ✅ Confirmed |\n\n## Agreed structure\n\n| Page | Agreed | Confirmed |\n|---|---|---|\n| Home | hero + grid | ✅ |\n\n### Clone Blueprint\n\n| Page | # | Band | x | Client content / dropped |\n|---|---|---|---|---|\n| home | 1 | Hero | a | headline |\n| home | 2 | Logos | a | dropped |\n\n### Motion map\n\n| Route | # | Motion |\n|---|---|---|\n| / | 1 | reveal |\n\n## Decisions\n\n| Date | Decision | Why | Who |\n|---|---|---|---|\n| 2026-10-27 | Reference: example.com | client pick | Ana |\n`;
const TOKENS = ":root{--motion-reveal-distance:16px;--motion-reveal-duration:.85s;--motion-reveal-ease:cubic-bezier(0.22,1,0.36,1);--motion-reveal-stagger:70ms;--hero-min-height:100svh;--header-height:72px}";

test("markdown helpers", () => {
  const md = "## A\n\n| x | y |\n|---|---|\n| 1 | 2 |\n\n## B\n\ntext";
  assert.deepEqual(tableRows(section(md, "A")), [["1", "2"]]);
  assert.equal(section(md, "B").trim(), "text");
  assert.deepEqual(blueprintBands(PLAN_DONE), [{ page: "home", band: "1" }]);
});

test("fresh project: kickoff is next and later stages are gated", () => {
  const root = project({ "plan.md": "| Layer | [REQUIRED: landing / multipage / cms / shop] |\n", "PROGRESS.md": PROGRESS(), "brief/client-questions.docx": "x", "web-brain.lock": JSON.stringify({ version: "3.3.0", layer: "multipage", files: {} }) });
  const s = summarize(root, { probe: false });
  assert.equal(s.stage, "kickoff");
  assert.match(s.stages.kickoff.join(), /REQUIRED/);
  assert.match(s.stages.kickoff.join(), /BRIEF-INDEX/);
  const g = gate(s, "scaffold");
  assert.equal(g.ok, false);
  assert.match(g.msg, /needs \/kickoff first/);
  const out = render(s);
  assert.ok(out.split("\n").length <= 12);
  assert.match(out.split("\n").pop(), /^Next: /);
});

test("stages advance with files and approvals", () => {
  const root = project({
    "plan.md": PLAN_DONE, "PROGRESS.md": PROGRESS(["kickoff", "refs", "design"]),
    "brief/notes.md": "x", "brief/BRIEF-INDEX.md": "## Files\n\n| File | Type | Facts → plan section |\n|---|---|---|\n| `brief/notes.md` | md | hours → Ops |\n",
    "research/peers/ref/report.md": "# r", "research/page-map.json": "{}",
    "DESIGN.md": "## Direction: Calm clinic", "design/tokens.css": TOKENS,
    "package.json": JSON.stringify({ scripts: { dev: "x", build: "x", lint: "x", typecheck: "x", verify: "x" } }), "package-lock.json": "{}",
    "src/app/globals.css": TOKENS, "src/lib/motion-tokens.ts": "x", "src/app/page.tsx": "<section data-band=\"1\">",
  });
  const S = stageStatus(root);
  for (const st of ["kickoff", "refs", "design", "scaffold", "build"]) assert.deepEqual(S[st], [], `${st}: ${S[st]}`);
  assert.match(S.qa.join(), /check-site/);
});

test("build gate: a band marked ok needs a band-check run (rounds ≥ 1, and in band-rounds.json when it exists)", () => {
  const files = (progress, extra = {}) => ({
    "plan.md": PLAN_DONE, "PROGRESS.md": progress, "src/app/page.tsx": "<section data-band=\"1\">", ...extra,
  });
  const zero = PROGRESS(["kickoff", "refs", "design"]).replace("| home | 1 | ok | 1 | 20 | |", "| home | 1 | ok | 0 | 20 | |");
  assert.match(stageStatus(project(files(zero))).build.join(), /without a band-check run \(home\/1\)/);
  const one = PROGRESS(["kickoff", "refs", "design"]);
  assert.doesNotMatch(stageStatus(project(files(one))).build.join(), /band-check run/);
  const missing = files(one, { "research/build/band-rounds.json": JSON.stringify({ "about/2": 1 }) });
  assert.match(stageStatus(project(missing)).build.join(), /without a band-check run/);
  const present = files(one, { "research/build/band-rounds.json": JSON.stringify({ "home/1": 2 }) });
  assert.doesNotMatch(stageStatus(project(present)).build.join(), /band-check run/);
});

test("build gate: last verdict FIX blocks ok; page names compare case-insensitively", () => {
  const prog = PROGRESS(["kickoff", "refs", "design"]).replace("| home | 1 | ok |", "| Home | 1 | ok |");
  const base = { "plan.md": PLAN_DONE, "PROGRESS.md": prog, "src/app/page.tsx": "<section data-band=\"1\">" };
  const fix = stageStatus(project({ ...base, "research/build/band-rounds.json": JSON.stringify({ "home/1": { rounds: 2, verdict: "FIX" } }) })).build.join();
  assert.match(fix, /last band-check said FIX/);
  assert.doesNotMatch(fix, /without a band-check run/);
  const ok = stageStatus(project({ ...base, "research/build/band-rounds.json": JSON.stringify({ "home/1": { rounds: 2, verdict: "REVIEW" } }) })).build.join();
  assert.doesNotMatch(ok, /FIX|band-check run/);
});

test("launch gate: preship report must be --audit --launch and newer than out/", () => {
  const base = { "plan.md": PLAN_DONE, "PROGRESS.md": PROGRESS(["kickoff", "refs", "design", "qa"]) };
  const plain = stageStatus(project({ ...base, "research/build/preship-report.md": "# Pre-ship scrub\n\nMode: audit\n" })).launch.join();
  assert.match(plain, /not run with --audit --launch/);
  const root = project({ ...base, "out/index.html": "<html></html>", "research/build/preship-report.md": "# Pre-ship scrub\n\nMode: audit+launch\n\n| OK | All checks | Nothing found |\n" });
  const old = new Date(Date.now() - 60_000); fs.utimesSync(path.join(root, "research/build/preship-report.md"), old, old);
  assert.match(stageStatus(root).launch.join(), /older than out/);
  const later = new Date(Date.now() + 5_000); fs.utimesSync(path.join(root, "research/build/preship-report.md"), later, later);
  assert.deepEqual(stageStatus(root).launch, []);
});

test("kickoff on the REAL plan.md template: only real placeholders count; a filled plan passes", () => {
  const kitPlan = fs.readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), "..", "..", "plan.md"), "utf8");
  const fresh = project({ "plan.md": kitPlan, "PROGRESS.md": PROGRESS() });
  const left = stageStatus(fresh).kickoff.find((m) => /REQUIRED/.test(m));
  assert.ok(left, "fresh template has placeholders");
  // Fill every placeholder the way kickoff does (keep the template's own explanation line, which quotes the token in backticks).
  const filled = kitPlan.split("\n").map((l) => (/`\[REQUIRED\]`/.test(l) ? l : l.replace(/\[REQUIRED[^\]]*\]/g, "filled"))).join("\n").replace(/\| Document status \|[^\n]*/, "| Document status | ✅ Confirmed |");
  const done = project({ "plan.md": filled, "PROGRESS.md": PROGRESS(["kickoff"]), "brief/BRIEF-INDEX.md": "## Files\n\n| File | Type | Facts → plan section |\n|---|---|---|\n" });
  assert.ok(!stageStatus(done).kickoff.some((m) => /REQUIRED/.test(m)), stageStatus(done).kickoff.join());
});

test("build gate: NEEDS-REVIEW with a structural base cannot be ok", () => {
  const base = { "plan.md": PLAN_DONE, "PROGRESS.md": PROGRESS(["kickoff", "refs", "design"]), "src/app/page.tsx": "<section data-band=\"1\">" };
  const nr = stageStatus(project({ ...base, "research/build/band-rounds.json": JSON.stringify({ "home/1": { rounds: 4, verdict: "NEEDS-REVIEW", base: "FIX" } }) })).build.join();
  assert.match(nr, /last band-check said FIX/);
});

test("capture marked incomplete blocks refs", () => {
  const root = project({ "plan.md": PLAN_DONE, "PROGRESS.md": PROGRESS(["refs"]), "research/peers/ref/report.md": "**Bands: incomplete** — footer not reached", "research/page-map.json": "{}" });
  assert.match(stageStatus(root).refs.join(), /incomplete/);
});

test("tooling: edited kit files and deploy scripts are reported", () => {
  const rule = "rule v1";
  const h = crypto.createHash("sha256").update(rule).digest("hex");
  const root = project({ ".cursor/rules/core.mdc": "rule v2 (edited)", "web-brain.lock": JSON.stringify({ files: { ".cursor/rules/core.mdc": h } }), "package.json": JSON.stringify({ scripts: { ship: "wrangler deploy" } }) });
  const t = tooling(root, { probe: false }).map((x) => x.msg).join(" | ");
  assert.match(t, /kit file\(s\) edited/);
  assert.match(t, /deploy or delete: ship/);
  assert.match(t, /tools not installed/);
});

test("motion tokens: units and easing", () => {
  assert.equal(tokenValue("850ms"), 0.85);
  assert.equal(tokenValue("0.85s"), 0.85);
  assert.equal(tokenValue("16px"), 16);
  assert.deepEqual(tokenValue("cubic-bezier(0.22, 1, 0.36, 1)"), [0.22, 1, 0.36, 1]);
  assert.match(motionTokensTs(TOKENS), /export const reveal = \{distance: 16, duration: 0.85, ease: \[0.22, 1, 0.36, 1\] as \[number, number, number, number\], stagger: 0.07\};/);
});
