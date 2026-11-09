---
name: design-qa
description: >-
  Runs the visual and accessibility part of /qa on the production build —
  check-site (overflow, off-centre, spacing, overlaps, console errors, loops,
  CSP) at 375/768/1440, clone QA on every in-scope route, axe from the pinned
  local copy, critique against DESIGN.md. Use near the end of the build or before
  launch; not a substitute for band-by-band band-check.
---

# Design QA (`/qa`)

Gate: `node tools/check-project.mjs --stage qa` — every Blueprint band is `ok` or `needs review` in `PROGRESS.md`.

## Steps

1. `npm run build`, then `node tools/check-site.mjs --serve out --qa --pages <all routes>`. Open every screenshot in `research/build/site-check/`; one verdict line per page and width (`/about @375: ok | off: <what>`).
2. **Clone QA** — every in-scope route, not only home (L11, M3): Blueprint order (check-site checks `data-band` order), Do not invent, Agreed structure, motion within budget and visible without JS, layered media, section paint, placement (L1–L13). Shared components verified on more than one URL.
3. **A11y:** `npm run build` then `node tools/a11y.mjs --serve out --pages <all routes>` (axe ships pinned with the tools). Report `id · impact · nodes` from `research/build/a11y-<page>-<width>.json`; serious/critical = Blocker. Plus keyboard path through nav and forms, visible focus, labels and errors, reduced motion, touch targets ≥ 44×44.
4. **Critique** against `DESIGN.md`, `design.mdc`, `site-chrome.mdc`: global CTA/brand consistency (M12), dead assets (M13), `[[PENDING]]` and empty `ImageSlot`s listed for the client email.
5. Performance indication on localhost only; the floor is measured on production in `/deploy`.
6. Triage **Blocker / High / Medium / Nit**. Interactive run: fix after the user's "ok" with `/fix`. Overnight run: fix within the limits, log every fix in `PROGRESS.md`.

## Report (≤ 10 lines)

```
**Done:** QA on <n> routes × 375/768/1440 · check-site BLOCKER <n> · HIGH <n> · axe serious/critical <n>
**Evidence:** research/build/site-check.json · a11y-*.json · screenshots research/build/site-check/
**Blockers:** <top 3, each with route@width>
**High:** <top 3>
**Needs you:** 1. Fix all Blockers and Highs now? [ok]
**Next:** /fix each item, re-run check-site, then seo-site → /launch.
```
