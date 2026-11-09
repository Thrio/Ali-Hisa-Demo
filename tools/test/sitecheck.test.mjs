import { test } from "node:test";
import assert from "node:assert/strict";
import { overlaps, asymmetric, offScale, siblingGaps, loopSuspect, bandOrder, blueprintOrder, verdict } from "../lib/sitecheck.mjs";
import { judge } from "../check-site.mjs";

test("overflow, off-centre form, uneven gaps, off-scale spacing, loop (qa.html defects as data)", () => {
  const facts = {
    overflow: { scrollWidth: 1728, clientWidth: 1440 }, h1: 1, bands: ["1", "2", "3", "4"],
    outside: ["[band 1] div.wide (0→1728 of 1440)"], texts: [], brokenImages: [], heavyImages: [], noAlt: [], imageSlots: [], pending: [], peerRefs: 0, taps: [],
    centred: [{ sel: "[band 2] form", leftGap: 40, rightGap: 360 }],
    spacing: [{ sel: "[band 4] section.odd", vals: [["paddingTop", 13], ["paddingLeft", 13]] }, { sel: "[band 1] section", vals: [["paddingTop", 32], ["paddingLeft", 24]] }],
    base: 4, named: [],
    groups: [{ sel: "[band 3] div.cards", rects: [{ top: 0, left: 24, width: 150, height: 100 }, { top: 0, left: 190, width: 150, height: 100 }, { top: 0, left: 364, width: 150, height: 100 }] }],
  };
  const rt = { errors: [], failed: [], csp: [], loop: { mutations: 1200, requests: 0, longTaskMs: 0 } };
  const F = judge(facts, rt, { expected: ["1", "2", "3", "4"] });
  const checks = F.map((f) => `${f.severity} ${f.check}`);
  for (const c of ["BLOCKER Horizontal overflow", "BLOCKER Possible infinite loop", "HIGH Off-centre", "HIGH Uneven gaps", "HIGH Off-scale spacing", "HIGH Outside the viewport"]) assert.ok(checks.includes(c), c);
  assert.equal(F.filter((f) => f.check === "Off-scale spacing").length, 1, "32/24 are on the 4px scale");
  assert.deepEqual(verdict(F), { BLOCKER: 2, HIGH: 4, WARN: 0 });
});

test("pure checks", () => {
  assert.deepEqual(offScale([16, 13, 24, 25, 7, 12.4], 4, [7]), [13, 25]);
  assert.equal(asymmetric({ leftGap: 100, rightGap: 103 }), false);
  assert.equal(asymmetric({ leftGap: 40, rightGap: 360 }), true);
  assert.deepEqual(overlaps([{ id: 1, sel: "a", top: 0, left: 0, width: 100, height: 20 }, { id: 2, sel: "b", top: 5, left: 0, width: 100, height: 20 }]).map((o) => o.pct), [75]);
  assert.equal(overlaps([{ id: 1, sel: "p", top: 0, left: 0, width: 100, height: 20, related: [2] }, { id: 2, sel: "a", top: 0, left: 0, width: 40, height: 20, related: [1] }]).length, 0, "ancestor pairs ignored");
  const grid = siblingGaps([{ top: 0, left: 0, width: 100, height: 50 }, { top: 0, left: 124, width: 100, height: 50 }, { top: 74, left: 0, width: 100, height: 50 }, { top: 74, left: 124, width: 100, height: 50 }]);
  assert.equal(grid.axis, "grid"); assert.equal(grid.spread, 0);
  assert.deepEqual(loopSuspect({ mutations: 30, requests: 2, longTaskMs: 100 }), []);
  assert.equal(loopSuspect({ mutations: 0, requests: 0, longTaskMs: 2000 }).length, 1);
  assert.equal(bandOrder(["1", "3", "2"], ["1", "2", "3"]), "data-band order 1,3,2 ≠ Blueprint 1,2,3");
  assert.equal(bandOrder(["1", "2a", "2"], ["1", "2"]), null, "approved added band 2a is fine");
  assert.match(bandOrder(["1"], ["1", "2"]), /missing 2/);
});

test("Blueprint order from plan.md skips dropped bands", () => {
  const plan = "### Clone Blueprint\n\n| Page | # | Band | Client content / dropped |\n|---|---|---|---|\n| home | 1 | Hero | yes |\n| home | 2 | Logos | dropped |\n| home | 3 | Cards | yes |\n| about | 1 | Intro | yes |\n\n### Motion map\n";
  assert.deepEqual(blueprintOrder(plan, "home"), ["1", "3"]);
  assert.deepEqual(blueprintOrder(plan, "about"), ["1"]);
});

test("launch mode turns pending text and stand-ins into blockers; dev noise is not an error", () => {
  const base = { overflow: { scrollWidth: 375, clientWidth: 375 }, h1: 1, bands: [], outside: [], texts: [], centred: [], spacing: [], base: 4, named: [], groups: [], taps: [], brokenImages: [], heavyImages: [], noAlt: [], imageSlots: ["[band 2] div.slot"], pending: ["[[PENDING: hours]]"], peerRefs: 2 };
  const rt = { errors: [], failed: [], csp: [], loop: { mutations: 0, requests: 0, longTaskMs: 0 } };
  assert.deepEqual(verdict(judge(base, rt)), { BLOCKER: 0, HIGH: 0, WARN: 3 });
  assert.deepEqual(verdict(judge(base, rt, { launch: true })), { BLOCKER: 2, HIGH: 0, WARN: 1 });
});

test("band-check verdicts and round counter", async () => {
  const { bandVerdict, nextRound } = await import("../band-check.mjs");
  assert.equal(bandVerdict({ hints: ["look at y 10–20px"], siteFindings: [{ severity: "WARN" }], round: 1 }), "REVIEW");
  assert.equal(bandVerdict({ hints: ["band height differs by 40px — check padding model"], siteFindings: [], round: 2 }), "FIX");
  assert.equal(bandVerdict({ hints: [], siteFindings: [{ severity: "HIGH" }], round: 1 }), "FIX");
  assert.equal(bandVerdict({ hints: ["band height differs by 40px"], siteFindings: [], round: 4 }), "NEEDS-REVIEW");
  assert.equal(bandVerdict({ hints: ["look at y 10–20px"], siteFindings: [], round: 7 }), "REVIEW", "a clean band stays REVIEW however many rounds");
  const fs = await import("node:fs"); const os = await import("node:os"); const path = await import("node:path");
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "bc-"));
  assert.equal(nextRound(root, "home/1"), 1); assert.equal(nextRound(root, "home/1"), 2); assert.equal(nextRound(root, "home/2"), 1);
  const { saveVerdict } = await import("../band-check.mjs");
  saveVerdict(root, "home/1", "NEEDS-REVIEW", "FIX");
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, "research/build/band-rounds.json"), "utf8"))["home/1"], { rounds: 2, verdict: "NEEDS-REVIEW", base: "FIX" });
  fs.writeFileSync(path.join(root, "research/build/band-rounds.json"), JSON.stringify({ "about/3": 4 }));
  assert.equal(nextRound(root, "about/3"), 5); // old numeric files still count
  fs.writeFileSync(path.join(root, "PROGRESS.md"), "## Bands\n\n| Page | Band | Status | Rounds | Minutes | Note |\n|---|---|---|---|---|---|\n| About | 3 | ok | 2 | 20 | |\n");
  assert.equal(nextRound(root, "about/3"), 1, "an approved band starts a new series");
});

test("static server: a malformed URL escape is a 404, not a crash", async () => {
  const { resolveStatic } = await import("../lib/serve.mjs");
  const fs = await import("node:fs"); const os = await import("node:os"); const path = await import("node:path");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "srv-")); fs.writeFileSync(path.join(dir, "index.html"), "<html></html>");
  assert.equal(resolveStatic(dir, "/img%zz.png"), null);
  assert.ok(resolveStatic(dir, "/").endsWith("index.html"));
});
