// Path safety. Every file the tools write lands inside a known root.
// A hostile value (page title, URL path, asset name) can never write to
// ~/.ssh, ~/.zshrc, or outside the project.
import fs from "node:fs";
import path from "node:path";

export const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export function assertSlug(value, label = "slug") {
  if (typeof value !== "string" || !SLUG_RE.test(value)) {
    throw new Error(`${label} must be 1-63 lowercase letters, digits or dashes (got ${JSON.stringify(value)})`);
  }
  return value;
}

export function slugify(value, max = 60) {
  const s = String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max)
    .replace(/-+$/g, "");
  return s || "item";
}

/** "/" → "home", "/about-us/" → "about-us", "/a/b.html" → "a-b". */
export function pageSlug(pathname) {
  const clean = String(pathname || "/").split(/[?#]/)[0].replace(/\.(html?|php|aspx?)$/i, "");
  if (clean === "/" || clean === "") return "home";
  return slugify(clean.replace(/^\/+|\/+$/g, "").replace(/\//g, "-"));
}

function isInside(base, target) {
  const rel = path.relative(base, target);
  return rel === "" || (!rel.startsWith(".." + path.sep) && rel !== ".." && !path.isAbsolute(rel));
}

/** Resolve parts under root. Throws when the result escapes root. */
export function resolveInside(root, ...parts) {
  const base = path.resolve(root);
  const target = path.resolve(base, ...parts.map(String));
  if (!isInside(base, target)) throw new Error(`path escapes ${base}: ${target}`);
  return target;
}

/** Resolve symlinks on the nearest existing ancestor and confirm it stays inside root. */
export function assertRealInside(root, target) {
  const realRoot = fs.realpathSync(path.resolve(root));
  let probe = path.resolve(target);
  while (!fs.existsSync(probe)) {
    const parent = path.dirname(probe);
    if (parent === probe) break;
    probe = parent;
  }
  const realProbe = fs.realpathSync(probe);
  if (!isInside(realRoot, realProbe)) throw new Error(`symlink escape: ${target} resolves outside ${realRoot}`);
}

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** Write a file under root. Refuses traversal, symlinked targets, and executable modes. */
export function writeInside(root, rel, data) {
  const target = resolveInside(root, rel);
  ensureDir(path.dirname(target));
  assertRealInside(root, path.dirname(target));
  try {
    if (fs.lstatSync(target).isSymbolicLink()) throw new Error(`refusing to write through a symlink: ${target}`);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  fs.writeFileSync(target, data, { mode: 0o644 });
  return target;
}

export function writeJsonInside(root, rel, value) {
  return writeInside(root, rel, JSON.stringify(value, null, 2) + "\n");
}

/** Walk files under dir (no symlink following). */
export function walkFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) walkFiles(full, out);
    else if (entry.isFile()) out.push(full);
  }
  return out;
}
