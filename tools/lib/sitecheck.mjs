// Pure checks for tools/check-site.mjs — testable without a browser.
// The in-page collector (pageQaFacts) gathers raw facts; these functions judge them.

export const area = (r) => Math.max(0, r.width) * Math.max(0, r.height);
export function intersection(a, b) {
  const w = Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left);
  const h = Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top);
  return w > 0 && h > 0 ? w * h : 0;
}

/** Text boxes overlapping by more than `share` of the smaller box (ancestors already excluded by the collector). */
export function overlaps(boxes, share = 0.2) {
  const out = [];
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i], b = boxes[j];
    if (a.related && a.related.includes(b.id)) continue;
    const ov = intersection(a, b);
    const small = Math.min(area(a), area(b));
    if (small > 0 && ov / small > share) out.push({ a: a.sel, b: b.sel, pct: Math.round((ov / small) * 100) });
  }
  return out;
}

/** A centred block whose left and right gaps differ by more than tol px. */
export function asymmetric({ leftGap, rightGap }, tol = 4) {
  return Math.abs(leftGap - rightGap) > tol;
}

/** Values (px) that are neither a multiple of the base spacing nor within 1px of a named token. */
export function offScale(values, base = 4, named = [], tol = 1) {
  return values.filter((v) => {
    if (!Number.isFinite(v) || v === 0) return false;
    const a = Math.abs(v);
    const m = a / base;
    if (Math.abs(m - Math.round(m)) * base <= 0.5) return false; // sub-pixel rounding only
    return !named.some((n) => Math.abs(a - n) <= tol);
  });
}

/** Gaps between siblings of one repeated group; returns { axis, gaps, spread } or null. */
export function siblingGaps(rects, tol = 2) {
  if (rects.length < 3) return null;
  const sameTop = rects.every((r) => Math.abs(r.top - rects[0].top) <= tol);
  const sameLeft = rects.every((r) => Math.abs(r.left - rects[0].left) <= tol);
  let gaps = [], axis;
  if (sameTop) { axis = "horizontal"; const s = [...rects].sort((a, b) => a.left - b.left); for (let i = 1; i < s.length; i++) gaps.push(s[i].left - (s[i - 1].left + s[i - 1].width)); }
  else if (sameLeft) { axis = "vertical"; const s = [...rects].sort((a, b) => a.top - b.top); for (let i = 1; i < s.length; i++) gaps.push(s[i].top - (s[i - 1].top + s[i - 1].height)); }
  else {
    axis = "grid";
    const rows = [];
    for (const r of [...rects].sort((a, b) => a.top - b.top || a.left - b.left)) { const row = rows.find((x) => Math.abs(x[0].top - r.top) <= tol); if (row) row.push(r); else rows.push([r]); }
    for (const row of rows) { row.sort((a, b) => a.left - b.left); for (let i = 1; i < row.length; i++) gaps.push(row[i].left - (row[i - 1].left + row[i - 1].width)); }
    for (let i = 1; i < rows.length; i++) gaps.push(Math.min(...rows[i].map((r) => r.top)) - Math.max(...rows[i - 1].map((r) => r.top + r.height)));
  }
  gaps = gaps.map((g) => Math.round(g));
  if (!gaps.length) return null;
  return { axis, gaps, spread: Math.max(...gaps) - Math.min(...gaps) };
}

/** Loop detector over a 3 s window. Attribute/style changes are not counted (animations never trip it). */
export function loopSuspect({ mutations, requests, longTaskMs, windowMs = 3000 }) {
  const reasons = [];
  if (mutations / (windowMs / 1000) > 50) reasons.push(`${mutations} DOM node/text changes in ${windowMs / 1000}s`);
  if (requests > 10) reasons.push(`${requests} new requests in ${windowMs / 1000}s`);
  if (longTaskMs > windowMs * 0.5) reasons.push(`main thread busy ${Math.round(longTaskMs)}ms of ${windowMs}ms`);
  return reasons;
}

/** data-band order on the page vs the Blueprint order (dropped bands excluded). */
export function bandOrder(actual, expected) {
  if (!expected.length) return null;
  const missing = expected.filter((b) => !actual.includes(b));
  const seen = actual.filter((b) => expected.includes(b));
  const extra = actual.filter((b) => !expected.includes(b) && !/^\d+a$/.test(b));
  const ordered = seen.join(",") === expected.filter((b) => seen.includes(b)).join(",");
  if (!missing.length && ordered && !extra.length) return null;
  return `data-band order ${actual.join(",") || "none"} ≠ Blueprint ${expected.join(",")}${missing.length ? ` (missing ${missing.join(",")})` : ""}${extra.length ? ` (not in Blueprint: ${extra.join(",")})` : ""}`;
}

/** Console/network noise from the Next dev server that the hardened browser causes (live reload is blocked). */
export const DEV_NOISE = /webpack-hmr|_next\/webpack|hot-update|\[HMR\]|\[Fast Refresh\]|turbopack-hmr|__nextjs_original-stack-frame|WebSocket connection to .* failed|Download the React DevTools/i;

/** Blueprint bands per page from plan.md (same rules as check-project). */
export function blueprintOrder(plan, pageName) {
  const lines = plan.split("\n");
  const i = lines.findIndex((l) => /^#{2,4} Clone Blueprint/.test(l));
  if (i < 0) return [];
  const out = [];
  for (let j = i + 1; j < lines.length && !/^#{1,6} /.test(lines[j]); j++) {
    if (!/^\|/.test(lines[j])) continue;
    const c = lines[j].trim().slice(1, -1).split("|").map((x) => x.trim());
    if (c[0] === pageName && /^\d+[a-z]?$/.test(c[1] || "") && !c.some((x) => /^dropped\b/i.test(x) || /\[REQUIRED/.test(x))) out.push(c[1]);
  }
  return out;
}

export function verdict(findings) {
  const n = { BLOCKER: 0, HIGH: 0, WARN: 0 };
  for (const f of findings) n[f.severity] = (n[f.severity] || 0) + 1;
  return n;
}

// ---------- in-page collector (runs in the browser; must be self-contained) ----------
export function pageQaFacts(args) {
  const band = args && args.band ? document.querySelector(`[data-band="${args.band}"]`) : null;
  const scope = band || document.body;
  const vw = document.documentElement.clientWidth, de = document.documentElement;
  const idOf = new WeakMap(); let nextId = 1;
  const id = (el) => { if (!idOf.has(el)) idOf.set(el, nextId++); return idOf.get(el); };
  const sel = (el) => { let s = el.tagName.toLowerCase(); if (el.id) s += "#" + el.id; else if (el.classList && el.classList[0]) s += "." + el.classList[0]; const b = el.closest("[data-band]"); return (b ? `[band ${b.getAttribute("data-band")}] ` : "") + s; };
  const shown = (el) => { for (let e = el; e && e !== document.documentElement; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) === 0 || e.getAttribute("aria-hidden") === "true") return false; } const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const rectOf = (el) => { const r = el.getBoundingClientRect(); return { top: Math.round(r.top + scrollY), left: Math.round(r.left), width: Math.round(r.width), height: Math.round(r.height) }; };
  const px = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };
  const clipped = (el) => { for (let e = el.parentElement; e && e !== document.body; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.overflowX !== "visible" || cs.overflow !== "visible") return true; } return false; };
  const all = [...scope.querySelectorAll("*")].slice(0, 6000);

  const outside = [];
  for (const el of all) {
    if (outside.length >= 8) break;
    if (!shown(el) || clipped(el)) continue;
    const r = el.getBoundingClientRect();
    if (!(r.right > vw + 1 || r.left < -1)) continue;
    // Fully off-screen absolute/fixed elements are intentional (skip links, screen-reader text) and cause no overflow.
    if (/absolute|fixed/.test(getComputedStyle(el).position) && (r.right <= 0 || r.left >= vw)) continue;
    outside.push(`${sel(el)} (${Math.round(r.left)}→${Math.round(r.right)} of ${vw})`);
  }

  const texts = [];
  for (const el of all) {
    if (texts.length >= 400) break;
    if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1)) continue;
    const cs = getComputedStyle(el); if (cs.pointerEvents === "none" || !shown(el)) continue;
    texts.push({ el, id: id(el), sel: sel(el), ...rectOf(el) });
  }
  for (const t of texts) t.related = texts.filter((o) => o !== t && (o.el.contains(t.el) || t.el.contains(o.el))).map((o) => o.id);
  for (const t of texts) delete t.el;

  const centred = [];
  for (const el of scope.querySelectorAll("form, [data-align=center]")) {
    if (!shown(el)) continue;
    const p = el.parentElement; if (!p) continue;
    const pr = p.getBoundingClientRect(), r = el.getBoundingClientRect(), pcs = getComputedStyle(p);
    const inner = { left: pr.left + px(pcs.paddingLeft) + px(pcs.borderLeftWidth), right: pr.right - px(pcs.paddingRight) - px(pcs.borderRightWidth) };
    if (r.width >= inner.right - inner.left - 8) continue; // full width: nothing to centre
    const siblings = [...p.children].filter((k) => k !== el && shown(k) && Math.abs(k.getBoundingClientRect().top - r.top) < r.height / 2);
    if (siblings.length && !el.matches("[data-align=center]")) continue; // part of a row, not meant to be centred
    centred.push({ sel: sel(el), leftGap: Math.round(r.left - inner.left), rightGap: Math.round(inner.right - r.right) });
  }

  const spacing = [];
  const roots = band ? [band] : [...document.querySelectorAll("[data-band]")];
  for (const root of roots) for (const el of [root, ...root.children]) {
    if (!shown(el)) continue;
    const cs = getComputedStyle(el);
    const vals = ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "marginTop", "marginBottom", "rowGap", "columnGap"].map((k) => [k, px(cs[k])]).filter(([, v]) => v);
    spacing.push({ sel: sel(el), vals });
  }
  let base = 4; const named = [];
  const rawBase = getComputedStyle(de).getPropertyValue("--spacing").trim();
  if (rawBase) base = /rem$/.test(rawBase) ? px(rawBase) * px(getComputedStyle(de).fontSize) : px(rawBase) || 4;
  try { for (const sh of document.styleSheets) for (const rule of sh.cssRules || []) for (const m of (rule.cssText || "").matchAll(/--(?:spacing|space)-[\w-]+\s*:\s*([\d.]+)(px|rem)/g)) named.push(m[2] === "rem" ? Number(m[1]) * 16 : Number(m[1])); } catch (e) { /* cross-origin sheet */ }

  const groups = [];
  for (const p of (band ? [band, ...band.querySelectorAll("*")] : roots.flatMap((r) => [r, ...r.querySelectorAll("*")])).slice(0, 3000)) {
    const kids = [...p.children].filter(shown);
    if (kids.length < 3) continue;
    const sig = (k) => k.tagName + "." + ((k.classList && k.classList[0]) || "");
    const s0 = sig(kids[0]);
    if (!kids.every((k) => sig(k) === s0)) continue;
    groups.push({ sel: sel(p), rects: kids.map(rectOf) });
    if (groups.length >= 60) break;
  }

  const taps = [];
  if (innerWidth <= 480) for (const el of scope.querySelectorAll("a, button, input, select, textarea, summary, [role=button]")) {
    if (taps.length >= 10) break;
    if (!shown(el) || el.hasAttribute("data-hit-area") || el.type === "hidden") continue;
    if (el.tagName === "A" && getComputedStyle(el).display === "inline" && el.parentElement && /^(P|LI|SPAN|DD|TD|BLOCKQUOTE)$/.test(el.parentElement.tagName)) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 44 || r.height < 44) taps.push(`${sel(el)} ${Math.round(r.width)}×${Math.round(r.height)}`);
  }

  const imgs = [...scope.querySelectorAll("img")].filter((i) => i.getBoundingClientRect().width > 0);
  const text = (scope.innerText || "");
  const peerRefs = [...document.querySelectorAll("img, source, video, [style*='_peer']")].map((e) => (e.currentSrc || e.src || e.srcset || e.getAttribute("style") || "")).filter((s) => /\/_peer\//.test(s)).length;
  return {
    overflow: { scrollWidth: de.scrollWidth, clientWidth: de.clientWidth },
    viewportMeta: Boolean(document.querySelector('meta[name="viewport"]')),
    h1: document.querySelectorAll("h1").length,
    bands: [...document.querySelectorAll("[data-band]")].map((e) => e.getAttribute("data-band")),
    outside, texts, centred, spacing, base, named, groups, taps,
    brokenImages: imgs.filter((i) => i.complete && i.naturalWidth === 0).map((i) => (i.getAttribute("src") || "").slice(0, 80)),
    heavyImages: imgs.filter((i) => i.naturalWidth > 2.5 * i.getBoundingClientRect().width * (devicePixelRatio || 1)).map((i) => `${(i.getAttribute("src") || "").slice(0, 60)} ${i.naturalWidth}px shown at ${Math.round(i.getBoundingClientRect().width)}px`).slice(0, 6),
    noAlt: imgs.filter((i) => !i.hasAttribute("alt")).map((i) => (i.getAttribute("src") || "").slice(0, 60)).slice(0, 6),
    imageSlots: [...scope.querySelectorAll("[data-image-slot]")].map(sel).slice(0, 12),
    pending: (text.match(/\[\[PENDING[^\]]*\]\]/g) || []).slice(0, 6),
    peerRefs,
  };
}
