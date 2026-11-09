// Hashing for evidence packs and for proving peer files never ship.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { walkFiles } from "./paths.mjs";

export function sha256(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

export function sha256File(file) {
  return sha256(fs.readFileSync(file));
}

/** Map of sha256 → relative path for every file under dir. */
export function hashTree(dir, { skip = () => false } = {}) {
  const map = new Map();
  for (const file of walkFiles(dir)) {
    const rel = path.relative(dir, file);
    if (skip(rel)) continue;
    map.set(sha256File(file), rel);
  }
  return map;
}
