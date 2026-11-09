// Pure image maths for tools/cutout.mjs — near-uniform background removal by edge flood fill (no AI model).
// rgba = Uint8Array/Buffer of width*height*4.

export function toLab(r, g, b) {
  const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const R = lin(r), G = lin(g), B = lin(b);
  const X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047, Y = R * 0.2126 + G * 0.7152 + B * 0.0722, Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
}
export const deltaE = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
export function parseHex(hex) {
  const m = String(hex).trim().match(/^#?([0-9a-f]{6})$/i);
  if (!m) throw new Error(`--on needs a hex colour like 1b1b1b — without the #, which the shell reads as a comment (got ${hex})`);
  return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
}

/** Colour statistics of the outer ring: mean Lab and the 95th-percentile ΔE from the mean. */
export function borderStats(rgba, w, h, ring = 6) {
  const labs = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (x >= ring && y >= ring && x < w - ring && y < h - ring) continue;
    const i = (y * w + x) * 4;
    if (rgba[i + 3] < 128) continue;
    labs.push(toLab(rgba[i], rgba[i + 1], rgba[i + 2]));
  }
  if (!labs.length) return { mean: [100, 0, 0], spread: 0, transparent: true };
  const mean = [0, 1, 2].map((k) => labs.reduce((s, l) => s + l[k], 0) / labs.length);
  const ds = labs.map((l) => deltaE(l, mean)).sort((a, b) => a - b);
  return { mean, spread: ds[Math.floor(ds.length * 0.95)] };
}

/** Background mask: pixels connected to the border whose colour is within tol (ΔE) of the border mean. */
export function floodMask(rgba, w, h, mean, tol = 18) {
  const mask = new Uint8Array(w * h);
  const stack = [];
  const ok = (p) => { const i = p * 4; return rgba[i + 3] < 16 || deltaE(toLab(rgba[i], rgba[i + 1], rgba[i + 2]), mean) <= tol; };
  for (let x = 0; x < w; x++) { stack.push(x, (h - 1) * w + x); }
  for (let y = 0; y < h; y++) { stack.push(y * w, y * w + w - 1); }
  while (stack.length) {
    const p = stack.pop();
    if (mask[p] || !ok(p)) continue;
    mask[p] = 1;
    const x = p % w, y = (p - x) / w;
    if (x > 0) stack.push(p - 1); if (x < w - 1) stack.push(p + 1); if (y > 0) stack.push(p - w); if (y < h - 1) stack.push(p + w);
  }
  return mask;
}

/** Apply the mask: background transparent, a 1px feathered edge with the background colour unblended. */
export function applyMask(rgba, w, h, mask, bgRgb) {
  const out = Buffer.from(rgba);
  for (let p = 0; p < w * h; p++) {
    const i = p * 4;
    if (mask[p]) { out[i + 3] = 0; continue; }
    const x = p % w, y = (p - x) / w;
    const edge = (x > 0 && mask[p - 1]) || (x < w - 1 && mask[p + 1]) || (y > 0 && mask[p - w]) || (y < h - 1 && mask[p + w]);
    if (!edge) continue;
    const a = 0.6;
    for (let k = 0; k < 3; k++) out[i + k] = Math.max(0, Math.min(255, Math.round((rgba[i + k] - (1 - a) * bgRgb[k]) / a)));
    out[i + 3] = Math.round(255 * a);
  }
  return out;
}

export function trimBox(rgba, w, h) {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (rgba[(y * w + x) * 4 + 3] > 0) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/** Full decision: refuse when the background is not uniform or the result is implausible. */
export function cutout(rgba, w, h, { tolerance = 18, maxSpread = 12 } = {}) {
  const stats = borderStats(rgba, w, h);
  if (stats.transparent) return { ok: false, reason: "already transparent — use the file as is" };
  if (stats.spread > maxSpread) return { ok: false, reason: `background not uniform (ΔE spread ${stats.spread.toFixed(1)} > ${maxSpread}) — ask the client for a transparent PNG or use a plate` };
  const mask = floodMask(rgba, w, h, stats.mean, tolerance);
  const removed = mask.reduce((s, v) => s + v, 0) / (w * h);
  if (removed < 0.08) return { ok: false, reason: `only ${(removed * 100).toFixed(0)}% would be removed — not a plain background` };
  if (removed > 0.92) return { ok: false, reason: `${(removed * 100).toFixed(0)}% would be removed — the product blends into the background` };
  const i = 0; // sample one border pixel for the unblend colour
  const bg = [rgba[i], rgba[i + 1], rgba[i + 2]];
  return { ok: true, rgba: applyMask(rgba, w, h, mask, bg), removed, spread: stats.spread };
}

export function composite(rgba, w, h, onRgb) {
  const out = Buffer.alloc(w * h * 4);
  for (let p = 0; p < w * h; p++) { const i = p * 4; const a = rgba[i + 3] / 255; for (let k = 0; k < 3; k++) out[i + k] = Math.round(rgba[i + k] * a + onRgb[k] * (1 - a)); out[i + 3] = 255; }
  return out;
}
