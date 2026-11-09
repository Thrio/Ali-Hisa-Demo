---
name: build-page
description: >-
  Builds one Clone Blueprint band at a time for /build — checks it against the
  Agreed structure and the motion budget, builds it with tokens, PendingText and
  ImageSlot for missing content, then proves it with band-check (overlay sheets at
  375 and 1440, measure diff, check-site in the band) before showing it.
---

# Build page (`/build`)

Gate: `node tools/check-project.mjs --stage build`. Read first: `clone-fidelity.mdc`, `design.mdc` (`code-conventions.mdc` attaches with the code files). L1–L13 one-liners: plan.md → Clone lessons; full text `.cursor/skills/build-page/references/clone-lessons.md` only for a lesson that band-check names. Detail on mistakes: `references/agent-mistakes.md` (M1–M18). Motion: `references/motion-patterns.md`. Sniper extracts: `peer-extract.md`.

Order: shell (header, footer, skip link, language switch) → home bands → other pages → collections → `/qa`. One band per pass; every in-scope route (L11, M3).

## One band

0. User named a fix → one-line restatement (what / where / breakpoint / must-not-change) first (M14), then `/fix`.
1. Open the reference band PNGs (375 + 1440) and its `states/`; read the Blueprint row, **Do not invent**, Motion map row, `behaviors.md`.
2. **Agreed structure check:** the band's archetype matches plan.md Agreed structure for this page. Different → ask once ("Reference uses X, plan agreed Y. Keep Y [default] or switch to X?"), log it, build the answer.
3. **Measures** from `research/peers/<ref>/measures/<page>/band-<#>.md` (placement, paint, padding model, copy budget). Live reference wins (L7). Map px → tokens in `design/tokens.css`; never raw px in markup.
4. **Build:** root `data-band="<#>"` (the capture's number). Interaction model + motion driver from the Motion map within the animation budget; in-view entrances = `ScrollReveal`; never wrap the first screen. Copy from the Copy lock; missing copy → `<PendingText lines={n}>` with `n` from the copy budget; missing photo → reference stand-in while building (`fetch-asset --to-public`), `ImageSlot` before any client preview. Product photo clashing with the section → `node tools/cutout.mjs` (client photos only), open the preview.
5. **Prove it:** with `npm run dev` running (or `--serve out` after `npm run build`), `node tools/band-check.mjs --peer-slug <ref> --page <name> --band <#>` (band 1: also `--first-screen`). `--page` = the page name in page-map.json and in PROGRESS.md Bands. Open **both sheets**; write `375: aligned | off: <what>` and `1440: …`.
   - FIX → fix structure / placement / paint first (L1–L13), not assets (L9); re-run. Max 3 rounds or 45 minutes → commit, `needs review` + reason in `PROGRESS.md`, move on.
   - REVIEW + sheets read → show the band.
6. Re-check earlier bands' motion and sticky behaviour after any shared change (M5). Commit after "ok" and add the band row to `PROGRESS.md`.

Never: several routes in one pass · raw px/hex · reference DOM/CSS/JS pasted · invented chrome or sections (L12) · static when the band moves within budget (L13) · re-fetching when checksums match (L9) · showing a band without both sheets opened (M1).

## Show the band (≤ 10 lines)

```
**Done:** <page> band <#> "<name>" · round <n>
**Evidence:** sheets research/build/overlay-<page>-band-<#>-{1440,375}-sheet.png · band-check REVIEW
**375:** aligned | off: <what>   **1440:** aligned | off: <what>
**Intended differences:** our colours / copy / logo · <logged exceptions or PendingText/ImageSlot>
**Needs you:** 1. Band ok? [ok]
**Next:** /build — <next band> (or /qa after the last band).
```
