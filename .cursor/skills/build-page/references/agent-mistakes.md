# Agent mistakes (M1–M18) — expanded

`core.mdc` keeps one line per mistake; this file is the detail. Clone essays live in `clone-lessons.md` (L1–L13). Say **M<n>** or **L<n>** — the lists are different.

**M4 · Non-surgical edits.** The user names one change (one breakpoint, one string, one image, one button). Do not also change other breakpoints, type, layout or siblings.

**M5 · Collateral breakage.** A spacing, image or copy fix must not silently drop scroll animation, sticky nav, carousel, route scroll-to-top or reduced-motion paths. Re-verify after the edit (distinct from L13, which is shipping static when the reference moves).

**M11 · Ignoring explicit user constraints.** Stack, CMS, language, CTA, "no form", workspace boundaries stay as the user locked them. Template defaults lose. No peeking at other local projects without a pasted path.

**M12 · Incomplete consistency after a global change.** Colour, CTA label, display name or icon set changed in one place → update nav, footer, inner pages and buttons in the same pass; spot-check key routes.

**M13 · Leaving dead media and unused UI.** Redesign leftovers (unused images, icons, sections, routes, copy) confuse later agents and bloat the build. Remove unreferenced assets/components; ask once if intent is unclear.

**M14 · Misreading the request.** Style vs content, section vs element, all devices vs one — a wrong target wastes turns. One-line restatement before the first edit.

**M15 · Shipping process noise.** Reference logos/copy, placeholder NAP, developer names (unless requested), research-only paths or `public/_peer/` must not ship. Scrub before Pre-ship and handoff.
