// Image comparison for the overlay gate.
// Three views of the same pair:
//   difference  — same idea as the old mix-blend-mode overlay: near-black = aligned
//   structure   — edges only, so a colour swap is not a mismatch:
//                 grey = shared edge, red = only in the reference, cyan = only in our build
//   drift       — best vertical/horizontal shift; a large one means placement
//                 is off (lessons 1 and 8), not the inner layout
// Numbers are diagnostics. Reading the images is still the gate (lesson 10).

const MAX_YIQ = 35215;

export function yiqDelta(r1, g1, b1, r2, g2, b2) {
  const y = (r1 - r2) * 0.29889531 + (g1 - g2) * 0.58662247 + (b1 - b2) * 0.11448223;
  const i = (r1 - r2) * 0.59597799 - (g1 - g2) * 0.2741761 - (b1 - b2) * 0.32180189;
  const q = (r1 - r2) * 0.21147017 - (g1 - g2) * 0.52261711 + (b1 - b2) * 0.31114694;
  return 0.5053 * y * y + 0.299 * i * i + 0.1957 * q * q;
}

export function differenceBlend(a, b) {
  const width = Math.max(a.width, b.width);
  const height = Math.max(a.height, b.height);
  const data = Buffer.alloc(width * height * 4);
  const A = a.data; const B = b.data;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4;
      if (x < a.width && y < a.height && x < b.width && y < b.height) {
        const ia = (y * a.width + x) * 4; const ib = (y * b.width + x) * 4;
        data[o] = Math.abs(A[ia] - B[ib]); data[o + 1] = Math.abs(A[ia + 1] - B[ib + 1]); data[o + 2] = Math.abs(A[ia + 2] - B[ib + 2]);
      } else { data[o] = 255; data[o + 1] = 0; data[o + 2] = 255; } // magenta = one image is smaller
      data[o + 3] = 255;
    }
  }
  return { width, height, data };
}

export function pixelMismatch(a, b, threshold = 0.1) {
  const width = Math.max(a.width, b.width);
  const height = Math.max(a.height, b.height);
  const limit = MAX_YIQ * threshold * threshold;
  const rows = new Float32Array(height);
  const A = a.data; const B = b.data;
  let mismatched = 0;
  for (let y = 0; y < height; y++) {
    let rowBad = 0;
    for (let x = 0; x < width; x++) {
      if (!(x < a.width && y < a.height && x < b.width && y < b.height)) { rowBad++; continue; }
      const ia = (y * a.width + x) * 4; const ib = (y * b.width + x) * 4;
      if (yiqDelta(A[ia], A[ia + 1], A[ia + 2], B[ib], B[ib + 1], B[ib + 2]) > limit) rowBad++;
    }
    rows[y] = rowBad / width;
    mismatched += rowBad;
  }
  return { mismatched, total: width * height, pct: (100 * mismatched) / (width * height), rows, width, height };
}

/** Luminance on a white background, 0..255. */
export function toGray(img) {
  const gray = new Float32Array(img.width * img.height);
  for (let i = 0, p = 0; i < gray.length; i++, p += 4) {
    const alpha = img.data[p + 3] / 255;
    const r = img.data[p] * alpha + 255 * (1 - alpha);
    const g = img.data[p + 1] * alpha + 255 * (1 - alpha);
    const b = img.data[p + 2] * alpha + 255 * (1 - alpha);
    gray[i] = 0.299 * r + 0.587 * g + 0.114 * b;
  }
  return gray;
}

export function edges(gray, width, height, threshold = 80) {
  const out = new Uint8Array(width * height);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const tl = gray[i - width - 1]; const t = gray[i - width]; const tr = gray[i - width + 1];
      const l = gray[i - 1]; const r = gray[i + 1];
      const bl = gray[i + width - 1]; const bm = gray[i + width]; const br = gray[i + width + 1];
      const gx = tr + 2 * r + br - (tl + 2 * l + bl);
      const gy = bl + 2 * bm + br - (tl + 2 * t + tr);
      if (Math.abs(gx) + Math.abs(gy) > threshold) out[i] = 1;
    }
  }
  return out;
}

export function dilate(mask, width, height, radius = 2) {
  if (radius <= 0) return mask.slice();
  const tmp = new Uint8Array(mask.length);
  const out = new Uint8Array(mask.length);
  for (let y = 0; y < height; y++) {
    let run = -Infinity;
    for (let x = 0; x < width; x++) { if (mask[y * width + x]) run = x; if (x - run <= radius) tmp[y * width + x] = 1; }
    run = Infinity;
    for (let x = width - 1; x >= 0; x--) { if (mask[y * width + x]) run = x; if (run - x <= radius) tmp[y * width + x] = 1; }
  }
  for (let x = 0; x < width; x++) {
    let run = -Infinity;
    for (let y = 0; y < height; y++) { if (tmp[y * width + x]) run = y; if (y - run <= radius) out[y * width + x] = 1; }
    run = Infinity;
    for (let y = height - 1; y >= 0; y--) { if (tmp[y * width + x]) run = y; if (run - y <= radius) out[y * width + x] = 1; }
  }
  return out;
}

function padGray(gray, w, h, width, height) {
  if (w === width && h === height) return gray;
  const out = new Float32Array(width * height).fill(255);
  for (let y = 0; y < h; y++) out.set(gray.subarray(y * w, y * w + w), y * width);
  return out;
}

export function structuralDiff(a, b, { threshold = 80, tolerance = 2 } = {}) {
  const width = Math.max(a.width, b.width);
  const height = Math.max(a.height, b.height);
  const ea = edges(padGray(toGray(a), a.width, a.height, width, height), width, height, threshold);
  const eb = edges(padGray(toGray(b), b.width, b.height, width, height), width, height, threshold);
  const da = dilate(ea, width, height, tolerance);
  const db = dilate(eb, width, height, tolerance);
  const data = Buffer.alloc(width * height * 4);
  let peerOnly = 0; let buildOnly = 0; let shared = 0; let total = 0;
  for (let i = 0, p = 0; i < width * height; i++, p += 4) {
    let c = [22, 22, 26];
    if (ea[i] || eb[i]) total++;
    if (ea[i] && db[i]) { shared++; c = [150, 150, 155]; }
    else if (ea[i]) { peerOnly++; c = [255, 64, 64]; }
    else if (eb[i] && !da[i]) { buildOnly++; c = [40, 200, 255]; }
    else if (eb[i]) { c = [150, 150, 155]; }
    data[p] = c[0]; data[p + 1] = c[1]; data[p + 2] = c[2]; data[p + 3] = 255;
  }
  return {
    image: { width, height, data },
    peerOnly, buildOnly, shared,
    pct: total ? (100 * (peerOnly + buildOnly)) / total : 0,
  };
}

function downsample(gray, width, height, scale) {
  const w = Math.max(1, Math.floor(width / scale));
  const h = Math.max(1, Math.floor(height / scale));
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) sum += gray[(y * scale + dy) * width + x * scale + dx];
      out[y * w + x] = sum / (scale * scale);
    }
  }
  return { gray: out, width: w, height: h };
}

function meanAbs(A, B, dx, dy) {
  const x0 = Math.max(0, -dx); const x1 = Math.min(A.width, B.width - dx);
  const y0 = Math.max(0, -dy); const y1 = Math.min(A.height, B.height - dy);
  if (x1 - x0 < A.width * 0.5 || y1 - y0 < A.height * 0.5) return Infinity;
  let sum = 0; let n = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x += 2) {
      sum += Math.abs(A.gray[y * A.width + x] - B.gray[(y + dy) * B.width + (x + dx)]);
      n++;
    }
  }
  return n ? sum / n : Infinity;
}

/** Shift (px) that best aligns our build onto the reference. dy > 0: our band sits lower. */
export function bestOffset(a, b, { rangeY = 80, rangeX = 40, scale = 2 } = {}) {
  const A = downsample(toGray(a), a.width, a.height, scale);
  const B = downsample(toGray(b), b.width, b.height, scale);
  const base = meanAbs(A, B, 0, 0);
  let best = { dx: 0, dy: 0, score: base };
  for (let dy = -Math.round(rangeY / scale); dy <= Math.round(rangeY / scale); dy++) {
    const s = meanAbs(A, B, 0, dy);
    if (s < best.score) best = { dx: 0, dy, score: s };
  }
  for (let dx = -Math.round(rangeX / scale); dx <= Math.round(rangeX / scale); dx++) {
    const s = meanAbs(A, B, dx, best.dy);
    if (s < best.score) best = { ...best, dx, score: s };
  }
  const improvement = Number.isFinite(base) && base > 0 ? (100 * (base - best.score)) / base : 0;
  return { dx: best.dx * scale, dy: best.dy * scale, baseline: base, best: best.score, improvementPct: improvement };
}

/** Vertical ranges where many pixels disagree — "look here" hints. */
export function mismatchRanges(rows, { threshold = 0.25, minRun = 6, gap = 4, limit = 5 } = {}) {
  const ranges = [];
  let start = -1; let peak = 0; let lastBad = -1;
  for (let y = 0; y <= rows.length; y++) {
    const bad = y < rows.length && rows[y] > threshold;
    if (bad) {
      if (start < 0 || y - lastBad > gap) {
        if (start >= 0 && lastBad - start + 1 >= minRun) ranges.push({ y0: start, y1: lastBad, peak });
        start = y; peak = 0;
      }
      peak = Math.max(peak, rows[y]);
      lastBad = y;
    }
  }
  if (start >= 0 && lastBad - start + 1 >= minRun) ranges.push({ y0: start, y1: lastBad, peak });
  return ranges
    .map((r) => ({ ...r, area: (r.y1 - r.y0 + 1) * r.peak }))
    .sort((p, q) => q.area - p.area)
    .slice(0, limit)
    .sort((p, q) => p.y0 - q.y0)
    .map(({ y0, y1, peak }) => ({ y0, y1, peakPct: Math.round(peak * 100) }));
}

export function sideBySide(images, gap = 8) {
  const width = images.reduce((s, i) => s + i.width, 0) + gap * (images.length - 1);
  const height = Math.max(...images.map((i) => i.height));
  const data = Buffer.alloc(width * height * 4);
  for (let p = 0; p < data.length; p += 4) { data[p] = 255; data[p + 1] = 0; data[p + 2] = 255; data[p + 3] = 255; }
  let x0 = 0;
  for (const img of images) {
    for (let y = 0; y < height; y++) {
      const dst = (y * width + x0) * 4;
      if (y < img.height) img.data.copy(data, dst, y * img.width * 4, (y + 1) * img.width * 4);
      else data.fill(235, dst, dst + img.width * 4);
    }
    x0 += img.width + gap;
  }
  return { width, height, data };
}

export function analyze(peer, build, opts = {}) {
  const pixels = pixelMismatch(peer, build, opts.threshold ?? 0.1);
  const structure = structuralDiff(peer, build, opts);
  const drift = bestOffset(peer, build, opts);
  return {
    size: { peer: [peer.width, peer.height], build: [build.width, build.height], sameWidth: peer.width === build.width, heightDelta: build.height - peer.height },
    pixelMismatchPct: Math.round(pixels.pct * 10) / 10,
    structureMismatchPct: Math.round(structure.pct * 10) / 10,
    edges: { shared: structure.shared, onlyInReference: structure.peerOnly, onlyInBuild: structure.buildOnly },
    drift: { dx: drift.dx, dy: drift.dy, improvementPct: Math.round(drift.improvementPct) },
    lookHere: mismatchRanges(pixels.rows),
    images: { difference: differenceBlend(peer, build), structure: structure.image },
  };
}
