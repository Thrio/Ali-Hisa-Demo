// How hard a reference will be to clone well, from what the capture saw. Advisory, never a gate.
export function cloneability({ tokens = {}, behaviors = {}, warnings = [], overlays = [], bandCount = 0 } = {}) {
  let score = 100;
  const reasons = [];
  const take = (n, why) => { score -= n; reasons.push(why); };
  const lib = tokens.libraries || {};
  if (lib.three || (lib.canvas || 0) >= 2) take(30, "WebGL or canvas scenes");
  if (lib.gsap || lib.scrollTrigger) take(15, "GSAP or ScrollTrigger choreography");
  if (lib.lenis || lib.locomotive) take(10, "smooth-scroll library");
  if (lib.lottie) take(8, "Lottie animations");
  const roles = Object.values(behaviors).flatMap((b) => Object.values((b && b.bands) || {})).map((v) => v && v.role);
  const heavy = roles.filter((r) => r === "scrub/parallax" || r === "sticky/pin").length;
  if (heavy) take(Math.min(20, heavy * 4), `${heavy} scroll-scrubbed or pinned sections`);
  if (warnings.some((w) => /smooth-scroll container|did not scroll/.test(w))) take(15, "page scrolls inside a container");
  const late = warnings.filter((w) => /one colour/.test(w)).length;
  if (late) take(Math.min(15, late * 5), `${late} sections paint late or on canvas`);
  if (overlays.some((o) => /preloader|curtain/.test((o && o.why) || ""))) take(5, "preloader or curtain");
  if (bandCount > 14) take(5, "very long page");
  score = Math.max(0, score);
  return { rating: score >= 75 ? "easy" : score >= 50 ? "medium" : "hard", score, reasons: reasons.length ? reasons : ["static layout on a standard stack"] };
}
