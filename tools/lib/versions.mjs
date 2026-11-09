// Version floors from security advisories (tools/security-floor.json).
import fs from "node:fs";
import path from "node:path";

export function parseVersion(v) {
  const m = String(v || "").trim().replace(/^[~^=v\s]+/, "").match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?/);
  if (!m) return null;
  return { major: +m[1], minor: +m[2], patch: +m[3], pre: m[4] || null };
}

export function compareVersions(a, b) {
  const x = typeof a === "string" ? parseVersion(a) : a;
  const y = typeof b === "string" ? parseVersion(b) : b;
  if (!x || !y) return NaN;
  for (const k of ["major", "minor", "patch"]) if (x[k] !== y[k]) return x[k] < y[k] ? -1 : 1;
  if (x.pre && !y.pre) return -1; // a prerelease is lower than its release
  if (!x.pre && y.pre) return 1;
  return 0;
}

/** Installed versions from package-lock.json (v2/v3) or pnpm-lock.yaml, else package.json ranges. */
export function installedVersions(root) {
  const out = {};
  const lock = path.join(root, "package-lock.json");
  if (fs.existsSync(lock)) {
    try {
      const json = JSON.parse(fs.readFileSync(lock, "utf8"));
      for (const [key, meta] of Object.entries(json.packages || {})) {
        if (!key.startsWith("node_modules/") || !meta || !meta.version) continue;
        const name = key.slice("node_modules/".length);
        if (name.includes("/node_modules/")) continue; // nested copies: top level decides
        out[name] = { version: meta.version, source: "package-lock.json" };
      }
    } catch { /* unreadable lock: fall through */ }
  }
  const pnpm = path.join(root, "pnpm-lock.yaml");
  if (fs.existsSync(pnpm)) {
    const text = fs.readFileSync(pnpm, "utf8");
    for (const m of text.matchAll(/^\s{2}\/?((?:@[^/\s]+\/)?[^@\s/]+)@(\d+\.\d+\.\d+[^:\s(]*)/gm)) {
      if (!out[m[1]]) out[m[1]] = { version: m[2], source: "pnpm-lock.yaml" };
    }
  }
  const pkg = path.join(root, "package.json");
  if (fs.existsSync(pkg)) {
    try {
      const json = JSON.parse(fs.readFileSync(pkg, "utf8"));
      for (const field of ["dependencies", "devDependencies"]) {
        for (const [name, range] of Object.entries(json[field] || {})) {
          if (!out[name]) out[name] = { version: String(range), source: "package.json range (no lockfile)" };
        }
      }
    } catch { /* ignore */ }
  }
  return out;
}

/** Check installed versions against the floor file. Returns findings. */
export function checkFloor(root, floorFile) {
  const floor = JSON.parse(fs.readFileSync(floorFile, "utf8"));
  const installed = installedVersions(root);
  const findings = [];
  for (const [name, rules] of Object.entries(floor.packages || {})) {
    const got = installed[name];
    if (!got) continue;
    const v = parseVersion(got.version);
    if (!v) {
      findings.push({ severity: "high", package: name, detail: `cannot read version "${got.version}" (${got.source}) — pin an exact version` });
      continue;
    }
    const rule = rules.find((r) => r.major === v.major && r.minor === v.minor)
      || rules.find((r) => r.major === v.major && r.minor == null);
    if (!rule) {
      findings.push({ severity: "blocker", package: name, detail: `${got.version} is on an unsupported major line; floor file lists ${rules.map((r) => r.min).join(" / ")}` });
      continue;
    }
    if (compareVersions(v, rule.min) < 0) {
      findings.push({ severity: "blocker", package: name, detail: `${got.version} < ${rule.min} (${floor.source})` });
    }
  }
  const ageDays = Math.floor((Date.now() - Date.parse(floor.updated)) / 86400000);
  if (Number.isFinite(ageDays) && ageDays > 30) {
    findings.push({ severity: "high", package: "security-floor.json", detail: `floor is ${ageDays} days old — check the Next.js and React advisories and update it` });
  }
  return { findings, floor };
}
