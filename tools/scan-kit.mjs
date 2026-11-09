#!/usr/bin/env node
// Scan the kit's instruction files for the "rules file backdoor" and supply-chain traps:
// hidden Unicode, chat-template tokens, hidden HTML comments, encoded blobs,
// pipe-to-shell commands, and unpinned or non-isolated MCP servers.
//   node tools/scan-kit.mjs [--root .]
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { walkFiles } from "./lib/paths.mjs";

const INVISIBLE = /[\u00AD\u034F\u061C\u115F\u1160\u17B4\u17B5\u180B-\u180F\u200B-\u200F\u202A-\u202E\u2060-\u206F\u3164\uFEFF\uFFA0\uFE00-\uFE0E]|[\u{E0000}-\u{E007F}]|[\u{E0100}-\u{E01EF}]/u;
const PATTERNS = [
  ["chat-template tokens", /<\|?(im_start|im_end|endoftext)\|?>|\[\/?INST\]|<<\/?SYS>>/i, "high"],
  ["pipe-to-shell command", /\b(curl|wget|iwr|irm|invoke-webrequest)\b[^\n|]{0,200}\|\s*(sudo\s+)?(sh|bash|zsh|iex|python3?|node)\b/i, "high"],
  ["encoded command", /\b(base64\s+(-d|--decode)|frombase64string|powershell\s+-e(nc|ncodedcommand)?\s)/i, "high"],
  ["long encoded blob", /[A-Za-z0-9+/]{200,}={0,2}/, "high"],
];

export function scanText(text, file) {
  const out = [];
  const lines = text.split("\n");
  lines.forEach((line, i) => {
    for (const ch of line.matchAll(new RegExp(INVISIBLE.source, "gu"))) {
      out.push({ severity: "high", file, line: i + 1, issue: `invisible character U+${ch[0].codePointAt(0).toString(16).toUpperCase().padStart(4, "0")}` });
    }
    for (const m of line.matchAll(/\uFE0F/g)) {
      const prev = line.slice(0, m.index).codePointAt(Math.max(0, m.index - 1));
      if (!(prev >= 0x2190 && prev <= 0x2BFF) && !(prev >= 0x1F000)) out.push({ severity: "high", file, line: i + 1, issue: "variation selector outside an emoji" });
    }
    for (const [label, re, severity] of PATTERNS) if (re.test(line)) out.push({ severity, file, line: i + 1, issue: label });
  });
  if (/\.(md|mdc)$/i.test(file)) {
    for (const m of text.matchAll(/<!--([\s\S]*?)-->/g)) {
      if (m[1].trim().length >= 20) out.push({ severity: "warn", file, line: text.slice(0, m.index).split("\n").length, issue: "HTML comment hidden from the rendered view — read it" });
    }
  }
  return out;
}

export function scanMcp(json, file) {
  const out = [];
  let cfg;
  try { cfg = JSON.parse(json); } catch { return [{ severity: "high", file, line: 1, issue: "not valid JSON" }]; }
  for (const [name, s] of Object.entries(cfg.mcpServers || {})) {
    if (s.url) { if (!/^https:\/\//.test(s.url)) out.push({ severity: "high", file, line: 1, issue: `${name}: remote server is not https` }); continue; }
    const args = (s.args || []).map(String);
    const cmd = String(s.command || "").split(/[\\/]/).pop();
    const launcherArgs = cmd === "pnpm" || cmd === "yarn" ? (args[0] === "dlx" ? args.slice(1) : null) : ["npx", "bunx", "uvx", "pipx"].includes(cmd) ? args : null;
    const pkg = (launcherArgs || args).find((x) => !x.startsWith("-") && /[a-z]/i.test(x) && !x.includes("/tools/") && !x.endsWith(".json") && x !== "run" && x !== "dlx");
    if (launcherArgs && (!pkg || !/(@|==)\d+\.\d+\.\d+/.test(pkg.replace(/^@/, "")))) out.push({ severity: "high", file, line: 1, issue: `${name}: ${cmd} package not pinned to an exact version (${pkg || "none"})` });
    if (cmd === "docker") { const img = args.slice(args.indexOf("run") + 1).find((x) => !x.startsWith("-") && /[a-z]/.test(x) && !/=/.test(x)); if (!img || !(/@sha256:[0-9a-f]{64}$/.test(img) || /:[\w.-]+$/.test(img) && !/:latest$/.test(img))) out.push({ severity: "high", file, line: 1, issue: `${name}: docker image not pinned (${img || "none"}) — use a version tag or digest` }); }
    if (args.some((x) => /@latest\b/.test(x))) out.push({ severity: "high", file, line: 1, issue: `${name}: uses @latest` });
    if (args.some((x) => /^--(cdp-endpoint|extension)/.test(x))) out.push({ severity: "high", file, line: 1, issue: `${name}: connects to an existing browser (your real profile)` });
    if (/playwright|chrome-devtools/i.test(pkg || "") && !args.includes("--isolated")) out.push({ severity: "high", file, line: 1, issue: `${name}: browser profile not isolated (add --isolated)` });
  }
  return out;
}

export function scanKit(root) {
  const targets = [
    ...walkFiles(path.join(root, ".cursor")).filter((f) => /\.(md|mdc|json)$/i.test(f)),
    ...fs.readdirSync(root).filter((f) => /\.md$/i.test(f)).map((f) => path.join(root, f)),
    ...walkFiles(path.join(root, "docs")).filter((f) => /\.md$/i.test(f)),
    ...walkFiles(path.join(root, "brief")).filter((f) => /\.md$/i.test(f)),
    ...walkFiles(path.join(root, "references")).filter((f) => /\.md$/i.test(f)),
  ];
  const findings = [];
  for (const f of [...new Set(targets)]) {
    const text = fs.readFileSync(f, "utf8");
    const rel = path.relative(root, f);
    findings.push(...scanText(text, rel));
    if (path.basename(f) === "mcp.json") findings.push(...scanMcp(text, rel));
  }
  return { files: targets.length, findings };
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (invokedDirectly) {
  const argv = process.argv.slice(2);
  const root = path.resolve(argv[argv.indexOf("--root") + 1] && argv.includes("--root") ? argv[argv.indexOf("--root") + 1] : ".");
  const { files, findings } = scanKit(root);
  const shown = argv.includes("--verbose") ? findings : findings.slice(0, 12);
  for (const f of shown) console.log(`${f.severity.toUpperCase().padEnd(5)} ${f.file}:${f.line} — ${f.issue}`);
  if (shown.length < findings.length) console.log(`… ${findings.length - shown.length} more (--verbose)`);
  const high = findings.filter((f) => f.severity === "high").length;
  console.log(`scan-kit: ${files} files, ${high} high, ${findings.length - high} warn`);
  console.log(`Next: ${high ? "fix every HIGH (hidden characters, unpinned servers, pipe-to-shell), then re-run" : "continue — no HIGH findings"}`);
  process.exitCode = high ? 1 : 0;
}
