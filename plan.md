# plan.md — [REQUIRED: CLIENT NAME] · cms

| | |
|---|---|
| Template | **3.3** — client facts, decisions and the clone index (process lives in `.cursor/`) |
| Updated | 2026-10-27 |
| Document status | ⬜ Draft → ⬜ Confirmed → ⬜ In build → ⬜ Pre-ship → ⬜ Launched |

`[REQUIRED]` blocks the next stage. `(default)` = keep unless overridden. `⚠️ CONFIRM WITH CLIENT` = assumed. Missing facts → `[[PENDING: what is needed]]`, never invented.

Commands: `/kickoff` → `/refs` → `/design` → `/scaffold` → `/build` → `/qa` → `/launch` · unsure → `/next` (`AGENTS.md`).

## Project Overview

| Field | Value |
|---|---|
| Layer | cms |
| Client | [REQUIRED] |
| Industry (slug in `references/industries/`) | [REQUIRED] |
| Primary goal (one action) | [REQUIRED] |
| Target audience | [REQUIRED] |
| Languages (ISO codes) · main | [REQUIRED: e.g. sq, en · main sq] |
| Animation level | [REQUIRED: Low / Medium / High — budget in Motion contract] |
| One-line summary | [REQUIRED] |
| Characteristic thing this design should express | [REQUIRED] |

## Conversion

At least one channel on. List only the channels that are on. A channel without its data is hidden; a form without an inbox is built but disabled.

| Channel | Detail |
|---|---|
| [REQUIRED: phone / WhatsApp (own number or same as phone) / email / booking URL / form / store visit] | |

| Field | Value |
|---|---|
| Primary CTA label | [REQUIRED — sentence case] |
| Form destination | [REQUIRED if form — never Sanity — else N/A] |

## Regulated products and business customers

| Field | Value |
|---|---|
| Regulated products | [REQUIRED: none / alcohol / tobacco or vapes / medicines or supplements / other] |
| Age gate · legal age | [REQUIRED if regulated: yes/no · 18] |
| Delivery countries · regulated allowed? | [REQUIRED if delivery: e.g. XK yes · AL [[PENDING: client confirms]]] |
| Business customers (B2B) | [REQUIRED: no / same prices / separate prices — shown how: on request / login / public · minimum order] |

## Sitemap & Routes

Layer defaults: landing = Home, Privacy, 404 · multipage/cms = chosen pages + Contact + Privacy + 404 · shop = Home, Shop (grid), Product, Cart, Checkout, Contact, Shipping & returns, Privacy, Terms, 404. Status: `live` · `hidden` · `deferred`.

| Page | Type | Route | Status | Content source | Visitor action |
|---|---|---|---|---|---|
| [REQUIRED: Home] | Static | `/` | [REQUIRED] | [`src/content/home.ts` / Sanity `page`] | [REQUIRED] |
| [REQUIRED: add rows] | | | | | |
| 404 | code-only | — | live | — | Match direction |

## Agreed structure

The page layouts agreed with the client. The reference restyles inside them but never changes an archetype. Conflict → ask once: "Reference uses X, plan agreed Y. Keep Y [default] or switch to X?" and log it in Decisions. Filled at kickoff, confirmed at `/design`.

| Page | Agreed archetype (e.g. "product grid, 3 col desktop / 2 col mobile") | Confirmed at /design |
|---|---|---|
| [REQUIRED] | | ⬜ |

## Collection index UX

Only if the sitemap has collections, else N/A: index layout · filters/sort · pagination · empty-state copy · card → detail fields — [REQUIRED if collections]

## Content model

landing / multipage: typed modules in `src/content/*.ts` (`site.ts` = name, NAP, channels, nav, default SEO; one module per page). cms / shop: Sanity — `page.sections[]` (one block per Blueprint band archetype) + `siteSettings` + `seo` object; confirm before schema code.

| Type / module | Purpose | Key fields |
|---|---|---|
| [REQUIRED] | | |

## Design System

Expanded by `/design` into `DESIGN.md` + `design/tokens.css` (`@theme`; copied into `src/app/globals.css` at `/scaffold`). A logo gives palette + mark only.

- Brand / logo on hand: [REQUIRED] · Style (3–5 adjectives): [REQUIRED or TBD after /refs] · Must not look like: [— or answer]
- Section rhythm: [REQUIRED: Alternating (default) / Uniform]
- Tokens: primary/accent · surface/text/border · display + body fonts (max 2; Inter/Poppins/Roboto only as a logged clone exception) · radius/shadow — [TBD until /design]

### Asset brief

Single source; `DESIGN.md` explains, never lists. Reference media = internal stand-ins, replaced before any client preview. Missing client photos never block: empty `ImageSlot` + `[[PENDING: photo — <slot>]]`.

- Clone target (name + URL): [REQUIRED after pick]
- Reference grammar kept: [REQUIRED after pick / none]
- Stand-ins (role → `public/_peer/` file → source URL): [after pick / none]
- Icons / cutouts / shapes / illustrations: [REQUIRED after pick]

### Clone exceptions log

A hard lock that yields to a measured reference value. Log here **and** in `DESIGN.md` Decisions, or the lock applies.

| Lock | Reference measured value | Band / page | Date |
|---|---|---|---|
| | | | |

### Clone Blueprint

`#` = the capture's band number for that page (never renumber; dropped bands stay as `dropped`; an approved new band = `<n>a`). Build roots carry `data-band="<#>"`. Pages map reference ↔ build in `research/page-map.json`. Required fields: `clone-fidelity.mdc`.

| Page | # | Band | Archetype | Element map | Type roles | CTA anatomy | Interaction | Motion | Measures (375/1440) | Screenshots | Client content / dropped | Do not invent |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| home | 1 | [REQUIRED after pick] | | L/R/float/bg · layered media | | | scroll / click / hover / time / static | none / reveal / sticky / scrub / hover / load | `research/peers/…/measures/home/band-1.md` | `research/peers/…` | | |

### Motion map

Every Blueprint band, `none` if static, within the Animation level budget (beyond it → simplified, written here as an intended difference).

| Route | # | Motion | What moves (reference) | Trigger | Rebuild (tokens) | State PNGs |
|---|---|---|---|---|---|---|
| `/` | 1 | [REQUIRED after pick] | | | | `research/peers/…/states/` or — |

### Clone build lessons (Blockers on every band — full text: `.cursor/skills/build-page/references/clone-lessons.md`)

| # | Rule |
|---|---|
| L1 | Count header clearance once — never the site spacer plus the full reference padding |
| L2 | Transparent reference section stays transparent; put the page wash on body or wrapper |
| L3 | Match border sides, radius and gap between items exactly, not just "has lines" |
| L4 | Reference width is the content box; gutters go outside it, never on the same node |
| L5 | Copy the reference's height and alignment model; enlarge hit areas without growing the box |
| L6 | Keep a fixed reference box fixed; fit the copy and size the CTA from that band |
| L7 | Live reference computed styles beat old measure notes; fix the notes when they differ |
| L8 | Placement on the page is part of the gate, not only inner width and height |
| L9 | Matching asset checksums mean the bug is structure, paint or placement — stop re-fetching |
| L10 | No band is shown without overlays at 375 and 1440 that were opened and read |
| L11 | Every in-scope route gets measure, build and overlay — never home only |
| L12 | Build only what the Blueprint, DESIGN.md and plan specify; ask once instead of inventing |
| L13 | Rebuild the reference's motion driver within the budget; static is a Blocker when it moves |

## Copy lock

Missing copy renders as `<PendingText lines={n}>` (n from the capture's copy budget) — never lorem, never invented.

| Key | Locked copy |
|---|---|
| `brand.name` | [REQUIRED] |
| `nav.primaryCta` | [REQUIRED — matches Conversion] |
| `home.hero.headline` · `.subline` · `.cta` | [REQUIRED or [[PENDING]]] |
| `footer.tagline` | [REQUIRED or —] |
| `contact.form.submit` | [REQUIRED if form / N/A] |
| `404.title` | [REQUIRED or [[PENDING]]] |
| `ageGate.question` · `.yes` · `.no` · `.blocked` | [REQUIRED if age gate / N/A] |

## Motion contract

Budget by Animation level: `.cursor/rules/design.mdc` → Motion budget (single source). Write the level below; never copy the table here.

| Field | Value |
|---|---|
| Reference motion stack observed | [REQUIRED after pick: none / CSS / IntersectionObserver / GSAP / Lenis — note only] |
| Default in-view entrance | **Scroll appear** (below) — change only on the user's explicit ask |
| Reduced motion | Always: final state at once, layout intact |

**Scroll appear** — shared `ScrollReveal` (`src/components/motion/scroll-reveal.tsx`, `motion/react`): content renders **visible** in the static HTML; after mount the reveal arms only for units still below the viewport and only when reduced motion is off · initial `opacity: 0`, `y: var(--motion-reveal-distance)` (~16px) → `opacity: 1`, `y: 0` · `whileInView`, `once: true`, `amount: 0.3` · duration `--motion-reveal-duration` (~0.85s) · ease `--motion-reveal-ease` (cubic-bezier(0.22, 1, 0.36, 1)) · stagger `--motion-reveal-stagger` (~0.07s). Never wrap the first screen. JS values come from `src/lib/motion-tokens.ts`, generated from `design/tokens.css`.

| # | Band / route | What moves | Trigger | Tokens | Evidence (state PNGs) |
|---|---|---|---|---|---|
| 1 | [REQUIRED after pick, per budget] | | scroll into view / scrub / sticky / hover / load | `--motion-reveal-*` | `research/peers/…/states/…` |

## Content checklist

Status: Pending / Requested / Received / Entered / Approved

| Asset | Who | Status |
|---|---|---|
| Logo (SVG or transparent PNG) | Client | Pending |
| NAP, hours, social, WhatsApp | Client | Pending |
| Home + page copy | [REQUIRED] | Pending |
| Photos (replace stand-ins; product photos plain or transparent background) | Client | Pending |
| Legal (Privacy; Terms for shop) | Client / lawyer | Pending |
| Image + font licenses | Client / Me | Pending |

## Features

Sticky header + mobile menu always on. Form / call / booking = Conversion.

| Feature | On? | Notes |
|---|---|---|
| Multi-level nav · collection pagination · anchors | [REQUIRED: ✅/❌ each] | |
| Age gate | from Regulated products | |
| Search · draft preview | ❌ default | preview needs the OpenNext path |
| Cookie banner | ❌ unless cookie tracking is added | Cloudflare Web Analytics is cookieless |

## Ops

| Field | Value |
|---|---|
| Domain · GitHub repo | [REQUIRED] |
| Host (Cloudflare) · CMS (Sanity, cms/shop only) | [REQUIRED: live / deferred · CMS: N/A for landing/multipage] |
| Sanity project ID · live URL | [REQUIRED when created / live] |
| Form backend | [REQUIRED or N/A — default Cloudflare `send_email` binding] |
| Image path | [landing/multipage: `images.unoptimized` + sized files · cms: Sanity CDN loader] |
| Analytics | (default: Cloudflare Web Analytics) |
| Reference media in production | ❌ never — only with a written license from the rights holder, logged here (client acceptance is not a license) |
| Lighthouse (prod, mobile, median of 3) | [after /deploy] |

## Decisions

Every choice made without a lock: clone pick, competitor check, clone exceptions, reference conflicts, server needs (OpenNext), deploy go-ahead, waivers, cutouts.

| Date | Decision | Why | Who |
|---|---|---|---|
| | | | |

## Pre-ship gate

- [ ] `node tools/preship-scrub.mjs --audit --launch`, `node tools/copy-check.mjs` → no BLOCKER · `node tools/scan-kit.mjs` → no HIGH · `node tools/check-site.mjs --serve out --launch --pages <all>` → no BLOCKER

| Gate | Done? |
|---|---|
| Every in-scope band: band-check + sheets at 375 and 1440 + "ok" in `PROGRESS.md` | ⬜ |
| L1–L13 and M1–M18 — no open Blockers | ⬜ |
| Motion within budget · reduced motion OK · content visible without JS | ⬜ |
| Copy lock / CTA / NAP consistent sitewide · no `[[PENDING` left (or accepted in writing) | ⬜ |
| Stand-ins replaced · `public/_peer/` deleted · empty `ImageSlot`s accepted | ⬜ |
| Clone exceptions logged in both places | ⬜ |
| Conversion paths and forms tested on production | ⬜ |
| A11y: no serious/critical axe violations | ⬜ |
| Lighthouse floor for the animation level met / waiver logged | ⬜ |
| SEO launch checklist (`seo-site`) | ⬜ |
| Handoff export checked (`preship-scrub --handoff`) | ⬜ |

## Handoff & ownership

The client gets a **new repo** from `node tools/handoff-export.mjs <dir>`: the site only, plus `HANDOFF.md` (accounts, env names, how to edit). Never `research/`, `references/`, `brief/`, kit files or internal notes.

| Asset | Owner after launch | Dev access kept? |
|---|---|---|
| Domain · Cloudflare · GitHub · Sanity · form/analytics | [REQUIRED] | [REQUIRED] |

## Out of scope

Unless you expand it: types beyond the Content model · languages beyond Overview · migrating an existing site · search (unless Features) · pro copy/photo/logo · SEO after launch · dark mode · paid typefaces (unless bought).
