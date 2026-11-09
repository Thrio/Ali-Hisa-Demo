# Clone build lessons (L1–L13)

Full text of the 13 clone failure patterns. `plan.md` keeps one line per lesson; this file is the detail. Every one is a **Blocker**: scan before coding a band, re-check before showing it. When the user says "it doesn't match", diagnose with these first (structure / paint / placement / motion), not by re-fetching assets or inventing a new layout. Coverage: every in-scope route, not only home. Soft-pass ban: `clone-fidelity.mdc`.

## L1 · Chrome offset stacked on peer pad

**Phenomenon:** The site’s own chrome spacer (e.g. padding-top / margin on main to clear a fixed header) is applied in addition to the peer section’s own top padding. The band’s inner box can match peer width/height while the whole band sits too low (or too high) on the page.

**Symptoms:** Overlay shows structure aligned inside the band but the band is shifted vs peer; everything below the band is shifted the same amount; inner W×H measures “pass.”

**Detect:** Compare `element.getBoundingClientRect().top` (band/section) on peer vs build at the same viewport width. Also note whether the peer section starts at y ≈ 0 under a fixed nav (peer pad creates clearance) or starts below chrome.

**Rule:** Count chrome clearance once. If the peer section begins under fixed chrome and uses padding for clearance, use negative margin / pull-up equal to the site spacer or reduce site pad so total from viewport top equals peer — never site spacer + full peer pad.

## L2 · Opaque section fill kills page wash

**Phenomenon:** Peer sections are transparent (or lightly washed) so a page-level background shows through (body gradient, image, tint, noise). The build paints an opaque section background (solid token) and flattens that wash. Tokens can be “correct” while the page still looks wrong.

**Symptoms:** Peer center vs edge (or wash stops) differ; build is one flat color; cards/FAQ/panels that rely on wash reading as “white on tint” look muddy or too strong; user reports “bg color isn’t the same.”

**Detect:** On peer, `getComputedStyle(section).backgroundColor` / `backgroundImage` — if transparent/none, the visible color is from an ancestor (usually body / page wrapper). Sample pixels at center and edge of a quiet area.

**Rule:** If the peer section is transparent, keep the build section transparent. Put the wash on body / page wrapper to match peer. Never assume a semantic “background” token on every `<section>` unless peer sections are opaque.

## L3 · Border grammar swapped

**Phenomenon:** Items “have lines” on both sites, but the grammar differs: full box outline vs bottom-only divider; gap between separate boxes vs continuous stacked rules; radius vs sharp; border color/alpha.

**Symptoms:** Peer reads as cards/tiles; build reads as a single list with underlines (or the reverse); spacing between items looks wrong even when vertical padding on the row matches.

**Detect:** Per item on peer: border-width on all four sides, border-radius, margin-bottom / parent gap, horizontal padding on the bordered box.

**Rule:** Match border sides, radius, and inter-item gap exactly. Do not translate “separated rows” into `border-b` only (or the reverse). Update measures when live styles disagree with notes.

## L4 · Gutter eats measured max-width

**Phenomenon:** A token or class sets max-width to the peer’s measured content width, then horizontal padding/gutter on the same element shrinks the usable width. Build content is systematically narrower than peer.

**Symptoms:** Overlay shows horizontal drift that increases across a row; columns/cards don’t line up with peer; measured child widths are smaller than peer though “max-width” matches on paper.

**Detect:** Compare the bordered/content box width on peer vs build. If build ≈ peerMax − (gutter×2), this is the cause.

**Rule:** Peer measured width = the content box. Apply gutters outside that box, or only below the breakpoint where peer also insets. Do not put desktop page gutter on the same node as the peer max-width wrap.

## L5 · Layout model invented instead of peer’s

**Phenomenon:** Build uses a different height/alignment driver than peer (e.g. fixed height + flex centering vs padding-top/bottom + in-flow stack). Also: a11y min touch sizes (`min-height` on links) that change the measured row height where peer stays text-tight.

**Symptoms:** Title/crumb/icon vertical registration off in overlay; band height a few–tens of px off; “almost” matching after many tweaks.

**Detect:** On peer, record padding, whether height is content-driven or fixed, and flex/grid alignment. Measure sub-element tops relative to the band. Check whether interactive elements’ min sizes expand the peer’s measured box.

**Rule:** Implement the peer’s model first (pad stack vs fixed height vs flex). On breakpoints where peer metrics are tight, keep layout height peer-accurate; enlarge hit area without growing the box (e.g. pseudo/overlay), or only apply large min-height where peer is loose (usually small screens).

## L6 · Content blows a fixed peer box

**Phenomenon:** Peer cells/cards have a fixed (or tightly constrained) box. Build lets height grow with longer localization, extra lines, or a global button/CTA size larger than that band’s peer CTA.

**Symptoms:** Cards taller than peer; background plate (cover / 100% 100%) looks stretched or wrong; CTAs sit lower; grid rhythm breaks on the second row.

**Detect:** Compare card/row height and CTA height/padding to peer. If build height > peer and content is taller (line count, button metrics), this is the cause.

**Rule:** Lock the peer box size for that band. Fit copy (clamp, shorten, or peer-like line count). Size the CTA from that band’s peer anatomy, not a sitewide button height token, when they conflict.

## L7 · Stale or wrong measure notes

**Phenomenon:** Implementation follows `research/peers/.../measures/*.md` (or memory) that no longer matches the live peer DOM/CSS.

**Symptoms:** User or overlay disagrees with a “measured” build; one property (border, gap, font role) is consistently wrong despite “following measures.”

**Detect:** Re-run `getComputedStyle` / Playwright extract on the live peer for the contested property. Diff against the measures file.

**Rule:** Live peer computed styles win. Fix the build and correct the measures file. Never argue from an outdated note when evidence contradicts it.

## L8 · Inner metrics pass; placement fails

**Phenomenon:** Agent reports matching inner width, height, and deco positions, but the band’s position on the page (or relative to chrome) is wrong. User still sees a clear mismatch.

**Symptoms:** “All measures match” in chat; screenshots still look shifted; user says look carefully / not the same.

**Detect:** Always log both: (a) band viewport top/left, (b) inner box measures. Overlay the band in full page context at both research widths.

**Rule:** A unit does not pass on inner W×H alone. Placement in the page is part of the gate. Soft-pass ban applies to “numbers match, skip overlay.”

## L9 · Asset chase when structure is wrong

**Phenomenon:** Visual mismatch triggers re-downloading or swapping peer chrome/images though file checksums already match the peer CDN/source. The real bug is CSS layout, paint, or placement.

**Symptoms:** Repeated asset churn; no change after swap; time spent on media while overlay still shows structural bright edges.

**Detect:** Checksum or byte-compare build asset vs peer source. If identical, stop fetching.

**Rule:** Matching assets → debug structure, background paint, and placement next. Only re-fetch when discovery shows a missing layer or wrong URL.

## L10 · Soft-pass without reading overlays

**Phenomenon:** Band marked done from checklist, vibe, or partial measures without producing and reading difference-blend overlays at both research widths.

**Symptoms:** User catches mismatches the agent called done; no `overlay-*-{width}.png` (or files exist but unread); “close enough” language.

**Detect:** Overlay files missing, or bright structural edges ignored. Soft-pass phrases in the report.

**Rule:** No unit shown to the user without overlays at both research widths. Read for structure/spacing/media side. Ignore intentional brand swap only (copy, logo, palette). Soft-pass ban still applies.

## L11 · Home-only screenshots / QA

**Phenomenon:** Agent measures, screenshots, and overlay-diffs home (or one hero) and treats the site as done. Key routes (inner pages, collection indexes, contact, etc.) never get peer crops, measures, build shots, or overlays at both research widths.

**Symptoms:** Home looks close; user opens another route and it diverges; Pre-ship “key pages” gate still empty; shared chrome (inner banner, FAQ, cards) fixed on one page but broken on others.

**Detect:** Checklist of every route in the plan sitemap / Clone Blueprint Key pages. Each live route must have peer evidence + build screenshots + overlays at both research widths (full page and per band as required by clone fidelity). Missing path = not done.

**Rule:** All public pages in scope — not only home. After home bands, run the same measure → build → overlay loop for every key page and shared template (e.g. inner banner used on multiple routes). Spot-check that a shared component fix was verified on more than one URL. Do not tell the user the clone is done until every in-scope route has screenshot evidence.

## L12 · Inventing outside the design / blueprint

**Phenomenon:** Agent adds sections, UI chrome, patterns, copy blocks, motion, or “improvements” that are not in the Clone Blueprint, `DESIGN.md`, or plan. Or reinterprets a blueprint band into a different archetype. Scope creep framed as polish.

**Symptoms:** Extra home/inner bands; cards/badges/gradients/motion the peer doesn’t have; copy or layout the plan never locked; user asks where something came from.

**Detect:** Diff the build against the blueprint band list and **Do not invent** rows. Anything with no blueprint / DESIGN / plan row is an invention. “Would look better if…” without a plan/DESIGN source = invention.

**Rule:** Only what the design specifies. Build = blueprint bands only, same order and archetypes. Swap brand (colors, copy, logo) per plan; do not add elements, sections, or behaviors for taste. If something seems missing, ask once — do not invent. Agent-invented UI is forbidden unless the user explicitly overrides.

## L13 · Static clone skips peer motion

**Budget (3.3):** the reference's motion is binding *within* the plan's Animation level (`plan.md` Motion contract). Motion beyond the level is simplified and written in the Motion map as an intended difference — that is not an L13 failure.

**Phenomenon:** Overlay / structure matches, but the peer band moves (scroll reveal, sticky transform, scrub, hover motion, load entrance) and the build ships static. Agent treats motion as optional polish. Motion contract left TBD; no before→after state PNGs; `behaviors.md` says scroll-driven but code has no motion.

**Symptoms:** User says the site “feels dead” / “missing animations”; peer has clear motion on scroll or hover; build only matches the resting frame; soft-pass language (“layout first, motion later”).

**Detect:** Motion map row for the band · blueprint Motion column · state PNGs in `research/peers/<peer>/states/` when motion ≠ none · Motion contract signature moments named and implemented. Diff peer scroll/hover vs build at the same trigger.

**Rule:** Peer motion **driver + role** are binding; rebuild with our stack (`motion` default) — never paste peer animation JS. `none` only when the peer is static. Soft-pass “static is fine” = Blocker. Capture before→after at both research widths when the band moves. Honor `prefers-reduced-motion` (instant/simplified, layout intact).
