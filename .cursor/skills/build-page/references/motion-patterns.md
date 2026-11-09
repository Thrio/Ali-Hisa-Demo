# Motion patterns (rewritten for `motion`)

Map each band's role in `research/peers/<peer>/behaviors.md` to one pattern, then confirm against the `states/` PNGs (L13). Stay inside the plan's **Animation level** budget (`design.mdc` → Motion budget). Values come from `src/lib/motion-tokens.ts`, **generated** from `design/tokens.css` by `node tools/check-project.mjs --sync-motion-tokens` — never hard-code durations or easings. Every pattern honours reduced motion, and the static HTML always shows the content.

| Capture says | Pattern |
|---|---|
| reveal | 1 · Scroll appear (`ScrollReveal`; a staggered group = one unit) |
| sticky/pin with stacking cards | 2 · Sticky stack (Medium+) |
| time-driven marquee or ticker | 3 · Marquee |
| header pinned / hides on scroll down / background change | 4 · Header on scroll |
| mobile menu opens a panel | 5 · Menu panel |
| scrub/parallax | 6 · Scroll-linked transform — High only, as a Motion contract signature moment |

## 1 · Scroll appear — `src/components/motion/scroll-reveal.tsx`

The server HTML renders `initial` values, so `initial={{ opacity: 0 }}` would ship hidden content. This component renders **visible** on the server and on first paint; after mount it arms the reveal only for elements still below the viewport, and never when reduced motion is on. The first screen is never wrapped.

```tsx
"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { reveal } from "@/lib/motion-tokens";

export function ScrollReveal({ children, index = 0, className }: { children: ReactNode; index?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const [armed, setArmed] = useState(false); // false on the server → visible HTML
  useEffect(() => {
    if (reduce || !ref.current) return;
    if (ref.current.getBoundingClientRect().top > window.innerHeight) setArmed(true); // only below the fold
  }, [reduce]);
  const show = !armed || inView;
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={false}
      animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: reveal.distance }}
      transition={show ? { duration: reveal.duration, ease: reveal.ease, delay: index * reveal.stagger } : { duration: 0 }}
    >
      {children}
    </motion.div>
  );
}
```

A staggered group: wrap each item, `index={i}`. Count the group as one unit in the budget.

## 2 · Sticky stack

```tsx
"use client";
import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "motion/react";

export function StickyCard({ index, total, children }: { index: number; total: number; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1 - (total - index) * 0.03]);
  const reduce = useReducedMotion();
  return (
    <div ref={ref} className="sticky top-[var(--header-height)] h-[var(--sticky-card-height)]">
      <motion.div style={reduce ? undefined : { scale }} className="h-full origin-top">{children}</motion.div>
    </div>
  );
}
```

Count the header clearance once (L1): the sticky `top` uses `--header-height`, so the section itself gets no extra top padding for the header. `--sticky-card-height` is a token in `design/tokens.css`.

## 3 · Marquee (CSS only)

```css
@keyframes marquee { to { transform: translateX(-50%); } }
.marquee-track { display: flex; width: max-content; animation: marquee var(--motion-marquee-duration) linear infinite; }
.marquee:hover .marquee-track { animation-play-state: paused; }
@media (prefers-reduced-motion: reduce) { .marquee-track { animation: none; } }
```

Render the content twice inside the track; mark the second copy `aria-hidden="true"`.

## 4 · Header on scroll

```tsx
"use client";
import { useState } from "react";
import { useScroll, useMotionValueEvent } from "motion/react";

export function useHeaderState(threshold = 80) {
  const { scrollY } = useScroll();
  const [state, setState] = useState({ scrolled: false, hidden: false });
  useMotionValueEvent(scrollY, "change", (y) => {
    const previous = scrollY.getPrevious() ?? 0;
    setState({ scrolled: y > threshold, hidden: y > previous && y > threshold * 3 });
  });
  return state;
}
```

Set `data-scrolled` / `data-hidden` on `<header>` and transition only `transform`, `background-color` and `box-shadow` with tokens. Build only what the capture saw: pinned, hides on scroll down, comes back on scroll up, background change.

## 5 · Menu panel

```tsx
"use client";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { panel } from "@/lib/motion-tokens";

export function MenuPanel({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  const reduce = useReducedMotion();
  const closed = reduce ? { opacity: 0 } : { clipPath: "inset(0 0 100% 0)" };
  return (
    <AnimatePresence>
      {open && (
        <motion.div role="dialog" aria-modal="true" aria-label="Menu" initial={closed} animate={reduce ? { opacity: 1 } : { clipPath: "inset(0 0 0% 0)" }} exit={closed}
          transition={{ duration: panel.duration, ease: panel.ease }} className="fixed inset-0 z-50 bg-surface"
          onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}>
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

Match the capture's menu note (cover %, clip-path or slide, backdrop). Trap focus inside, return focus to the toggle, lock body scroll, and keep `aria-expanded` on the toggle in sync.

## 6 · Scroll-linked transform (signature moment only)

```tsx
const ref = useRef<HTMLDivElement>(null);
const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
const y = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]);
return <motion.div ref={ref} style={{ y }} />;
```

High animation level only, when the Motion contract lists it as a signature moment, and Lighthouse still meets the High floor on production.
