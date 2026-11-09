// Key-page discovery for a reference site (English and Albanian keywords).
import { cleanLine } from "./sanitize.mjs";

export const BUCKETS = [
  ["about", /about|rreth|who-we-are|company|our-story|story|team|ekipi/],
  ["services", /services?|sherbim|what-we-do|solutions|offer|capabilit|expertise/],
  ["work", /work|projects?|projekt|portfolio|case-stud|cases|showcase|clients/],
  ["contact", /contact|kontakt|get-in-touch|book|reserv|appointment|termin/],
  ["pricing", /pricing|prices|plans|cmim|tarif/],
  ["menu", /menu|meny|food|drinks/],
  ["shop", /shop|store|collections?|catalog|products?|produkt/],
  ["blog", /blog|news|journal|insights|articles|lajme/],
  ["faq", /faq|questions|pyetje/],
];
export const SKIP_PATH = /\.(pdf|jpe?g|png|gif|webp|svg|zip|docx?|xlsx?|mp4|mp3)$|\/(cart|basket|checkout|account|login|signin|sign-in|register|wp-admin|admin|search|tag|category|author|feed|privacy|terms|cookies?|legal|imprint|impressum)(\/|$)/i;

export function pickRoutes(links, sitemapPaths, homePath, max) {
  const candidates = [...links.map((l) => ({ ...l, from: l.zone })), ...sitemapPaths.map((p) => ({ path: p, text: "", zone: "sitemap", from: "sitemap" }))]
    .filter((l) => l.path && l.path !== homePath && l.path !== "/" && !SKIP_PATH.test(l.path) && l.path.split("/").filter(Boolean).length <= 2);
  const chosen = [];
  for (const [bucket, re] of BUCKETS) {
    if (chosen.length >= max - 1) break;
    const hit = candidates
      .filter((c) => re.test(`${c.path} ${c.text}`.toLowerCase()) && !chosen.some((x) => x.path === c.path))
      .sort((a, b) => (a.zone === "nav" ? 0 : a.zone === "main" ? 1 : 2) - (b.zone === "nav" ? 0 : b.zone === "main" ? 1 : 2) || a.path.length - b.path.length)[0];
    if (hit) chosen.push({ path: hit.path, type: bucket, reason: `${hit.from} link "${cleanLine(hit.text || hit.path, 40)}"` });
  }
  return [{ path: homePath, type: "home", reason: "start URL" }, ...chosen];
}

/** Put any discovered or listed path onto the reference origin. Never returns another origin. */
export function normalizeTarget(p, origin) {
  try {
    const u = new URL("/" + String(p || "/").replace(/^[\s/\\]+/, ""), origin);
    return u.origin === origin ? u : null;
  } catch {
    return null;
  }
}
