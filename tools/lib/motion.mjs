// Motion classification from ONE top-to-bottom scroll sweep.
// A sample: { scrollY, band: { top, h }, kids: [{ top, h, opacity, eff, transform, clip }] }
// - positions are viewport px; child movement is read RELATIVE to its band, so a
//   layout shift above the band (late images, banners) is not mistaken for motion
// - eff = opacity multiplied up to the band, so a fading parent is seen on its children
// - zero-height (hidden) elements never count as "pinned"
const round = (v) => Math.round(v * 100) / 100;
const shown = (k) => Boolean(k) && k.h > 0;

export function classifyMotion(samples, vh) {
  const s = (samples || []).filter((x) => x && x.band);
  if (s.length < 2) return { role: "unknown", evidence: "not enough samples while the band was on screen" };
  for (let i = 1; i < s.length; i++) {
    const dS = s[i].scrollY - s[i - 1].scrollY;
    const b = s[i].band;
    if (dS >= 200 && Math.abs(b.top - s[i - 1].band.top) < 6 && b.top < vh && b.top + b.h > 0) {
      return { role: "sticky/pin", evidence: `band held at ${b.top}px while the page scrolled ${dS}px` };
    }
  }
  const n = Math.min(...s.map((x) => (x.kids || []).length));
  for (let k = 0; k < n; k++) {
    for (let i = 1; i < s.length; i++) {
      const a = s[i - 1].kids[k]; const b = s[i].kids[k]; const dS = s[i].scrollY - s[i - 1].scrollY;
      if (shown(a) && shown(b) && dS >= 200 && Math.abs(b.top - a.top) < 6 && b.top < vh && b.top + b.h > 0) {
        return { role: "sticky/pin", evidence: `child ${k} held at ${b.top}px while the page scrolled ${dS}px` };
      }
    }
  }
  let reveal = null; let scrub = null;
  for (let k = 0; k < n; k++) {
    const series = s.map((x) => x.kids[k]);
    if (!series.some(shown)) continue;
    const op = series.map((x) => (x.eff ?? x.opacity));
    if (op[0] < 0.5 && op[op.length - 1] >= 0.9) reveal = reveal || `child ${k}: opacity ${round(op[0])} → ${round(op[op.length - 1])}`;
    const drift = [];
    for (let i = 1; i < s.length; i++) {
      if (shown(series[i]) && shown(series[i - 1])) drift.push((series[i].top - s[i].band.top) - (series[i - 1].top - s[i - 1].band.top));
    }
    const moving = drift.filter((d) => Math.abs(d) > 6);
    if (moving.length >= 2 && moving.every((d) => Math.sign(d) === Math.sign(moving[0]))) scrub = scrub || `child ${k}: moves ${moving.map((d) => Math.round(d)).join(", ")}px inside the band while scrolling`;
    else if (moving.length === 1) reveal = reveal || `child ${k}: shifts ${Math.round(moving[0])}px once while entering`;
    if (!reveal && series[0].transform !== series[series.length - 1].transform && op[0] < 0.95) reveal = `child ${k}: transform changes while entering`;
    if (!reveal && series[0].clip !== series[series.length - 1].clip) reveal = `child ${k}: clip-path changes while entering`;
  }
  if (scrub) return { role: "scrub/parallax", evidence: scrub };
  if (reveal) return { role: "reveal", evidence: reveal };
  return { role: "none", evidence: "no opacity, transform, clip or position change while scrolling" };
}
