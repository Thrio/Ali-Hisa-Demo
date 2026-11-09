#!/usr/bin/env node
// The repo the client receives: the site only, in a NEW git repo (clean history — no reference screenshots,
// no other clients' names from references/used-references.md, no kit or internal notes).
//   node tools/handoff-export.mjs <out-dir>        (out-dir must be outside this project)
// Then: node tools/preship-scrub.mjs --handoff <out-dir>
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { HANDOFF_REMOVE } from "./preship-scrub.mjs";

/** HANDOFF.md for the client from plan.md (Handoff & ownership + Ops), without internal sections. */
export function handoffNote(plan) {
  const pick = (title) => { const lines = plan.split("\n"); const i = lines.findIndex((l) => l.startsWith(`## ${title}`)); if (i < 0) return ""; const out = []; for (let j = i + 1; j < lines.length && !/^#{1,2} /.test(lines[j]); j++) out.push(lines[j]); return out.join("\n").trim(); };
  const name = (plan.match(/^\| Client \| ([^|]+) \|/m) || [])[1] || "the client";
  return [`# Handoff — ${name.trim()}`, "", "Everything you need to run and edit your site. Secret values are never written here; they live in Cloudflare (and Sanity for the CMS).", "",
    "## Accounts and ownership", "", pick("Handoff & ownership").replace(/^The client gets[^\n]*\n*/m, ""), "", "## Hosting and services", "", pick("Ops").replace(/^\| Reference media[^\n]*\n?/m, ""), "",
    "## Run it locally", "", "```sh", "npm ci", "npm run dev      # http://localhost:3000", "npm run build    # static site in out/", "```", "",
    "Content: `src/content/*.ts` (or the Sanity Studio for CMS sites — see docs/editor-guide.md).", ""].join("\n");
}

export function exportSite(root, outDir) {
  const out = path.resolve(outDir);
  const r = path.relative(root, out);
  if (!r.startsWith("..") && !path.isAbsolute(r)) throw new Error("the export must go outside this project (e.g. ../<client>-site)");
  if (fs.existsSync(out) && fs.readdirSync(out).length) throw new Error(`${out} exists and is not empty`);
  fs.mkdirSync(out, { recursive: true });
  const tar = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "handoff-")), "site.tar");
  execFileSync("git", ["archive", "--format=tar", "-o", tar, "HEAD"], { cwd: root, stdio: ["ignore", "ignore", "pipe"] });
  execFileSync("tar", ["-xf", tar, "-C", out], { stdio: ["ignore", "ignore", "pipe"] });
  const removed = [];
  for (const p of HANDOFF_REMOVE) { const f = path.join(out, p); if (fs.existsSync(f)) { fs.rmSync(f, { recursive: true, force: true }); removed.push(p); } }
  const plan = fs.existsSync(path.join(root, "plan.md")) ? fs.readFileSync(path.join(root, "plan.md"), "utf8") : "";
  fs.writeFileSync(path.join(out, "HANDOFF.md"), handoffNote(plan));
  execFileSync("git", ["init", "-q"], { cwd: out });
  execFileSync("git", ["add", "-A"], { cwd: out });
  execFileSync("git", ["-c", "user.name=web-brain", "-c", "user.email=web-brain@localhost", "commit", "-qm", "Site handoff"], { cwd: out });
  return { out, removed, kept: fs.readdirSync(out).filter((x) => x !== ".git").sort() };
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (invokedDirectly) {
  try {
    const dir = process.argv[2];
    if (!dir || dir.startsWith("--")) throw new Error("usage: node tools/handoff-export.mjs <out-dir outside this project>");
    const r = exportSite(process.cwd(), dir);
    console.log([`handoff export → ${r.out} (new repo, one commit)`, `removed: ${r.removed.join(", ") || "nothing"}`, `kept (review): ${r.kept.join(", ")}`, `Next: node tools/preship-scrub.mjs --handoff ${dir}`].join("\n"));
  } catch (e) { console.error(`handoff-export: ${String(e.message || e).split("\n")[0]}`); process.exitCode = 1; }
}
