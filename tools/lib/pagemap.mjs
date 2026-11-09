// research/page-map.json — reference page ↔ build route (written at /refs).
// {"pages":[{"name":"home","peer":"home","build":"/"},{"name":"about","peer":"en-about","build":"/about"}]}
import fs from "node:fs";
import path from "node:path";
import { assertSlug, pageSlug } from "./paths.mjs";

export function readPageMap(root) {
  const f = path.join(root, "research", "page-map.json");
  if (!fs.existsSync(f)) return [];
  try { const j = JSON.parse(fs.readFileSync(f, "utf8")); return Array.isArray(j.pages) ? j.pages : []; }
  catch { throw new Error("research/page-map.json is not valid JSON"); }
}

/** name → { name, peer (reference page folder), route (build URL path), build (build page folder) } */
export function resolvePage(root, name) {
  assertSlug(name, "--page");
  const hit = readPageMap(root).find((p) => p && p.name === name);
  const route = hit && typeof hit.build === "string" ? hit.build : name === "home" ? "/" : `/${name}`;
  const peer = hit && typeof hit.peer === "string" ? hit.peer : name;
  assertSlug(peer, "page-map peer");
  return { name, peer, route, build: pageSlug(route), mapped: Boolean(hit) };
}
