# plan.md — Ali Hisa · cms

| | |
|---|---|
| Template | **3.3** — client facts, decisions and the clone index (process lives in `.cursor/`) |
| Updated | 2026-11-09 |
| Document status | ✅ Confirmed → ⬜ In build → ⬜ Pre-ship → ⬜ Launched |

`[REQUIRED]` blocks the next stage. `(default)` = keep unless overridden. `⚠️ CONFIRM WITH CLIENT` = assumed. Missing facts → `[[PENDING: what is needed]]`, never invented.

Commands: `/kickoff` → `/refs` → `/design` → `/scaffold` → `/build` → `/qa` → `/launch` · unsure → `/next` (`AGENTS.md`).

## Project Overview

| Field | Value |
|---|---|
| Layer | cms |
| Client | Ali Hisa (Bauhaus / Bau-Haus appear only on external listings — not the public brand) |
| Industry (slug in `references/industries/`) | construction-industrial |
| Primary goal (one action) | Get in touch |
| Target audience | Albanian-speaking market |
| Languages (ISO codes) · main | sq · main sq |
| Animation level | Medium |
| One-line summary | Architecture and construction practice in Struga, North Macedonia, since 1997. |
| Characteristic thing this design should express | [[PENDING: what the design should express]] |

## Conversion

At least one channel on. List only the channels that are on. A channel without its data is hidden; a form without an inbox is built but disabled.

| Channel | Detail |
|---|---|
| Phone | +389 71 890 243 (main call link) · +389 70 362 763 |
| Email | Info@alihisa.com |

WhatsApp off. Store visit off until a street exists. Contact form off (no inbox channel).

| Field | Value |
|---|---|
| Primary CTA label | Get in touch · Albanian UI label [[PENDING: sq button label]] |
| Form destination | N/A |

## Regulated products and business customers

| Field | Value |
|---|---|
| Regulated products | none |
| Age gate · legal age | N/A — not regulated |
| Delivery countries · regulated allowed? | N/A — no product delivery |
| Business customers (B2B) | no |

## Sitemap & Routes

Layer defaults: landing = Home, Privacy, 404 · multipage/cms = chosen pages + Contact + Privacy + 404 · shop = Home, Shop (grid), Product, Cart, Checkout, Contact, Shipping & returns, Privacy, Terms, 404. Status: `live` · `hidden` · `deferred`.

Kickoff-approved sitemap. No shop, blog, or product catalogue.

| Page | Type | Route | Status | Content source | Visitor action |
|---|---|---|---|---|---|
| Home | Static | `/` | live | Sanity `page` | Get in touch |
| Projects | Collection | `/projects` | live | Sanity `project` | Open a project |
| Project | Detail | `/projects/[slug]` | live | Sanity `project` | Get in touch |
| Services | Static | `/services` | live | Sanity `page` | Get in touch |
| About | Static | `/about` | live | Sanity `page` | Read the studio facts |
| Contact | Static | `/contact` | live | Sanity `page` | Call or email |
| Privacy | Static | `/privacy` | live | Sanity `page` | Read the policy |
| 404 | code-only | — | live | — | Match direction |

## Agreed structure

The page layouts agreed with the client. The reference restyles inside them but never changes an archetype. Conflict → ask once: "Reference uses X, plan agreed Y. Keep Y [default] or switch to X?" and log it in Decisions. Filled at kickoff, confirmed at `/design`.

| Page | Agreed archetype (e.g. "product grid, 3 col desktop / 2 col mobile") | Confirmed at /design |
|---|---|---|
| Home | Hero, short intro, selected projects, contact strip | ✅ |
| Projects | Project grid, 3 col desktop / 1 col mobile | ✅ |
| Project | Case page: title, summary, gallery | ✅ |
| Services | One service list, no prices | ✅ |
| About | Studio facts: Struga, since 1997 | ✅ |
| Contact | NAP, both phones, email; no form | ✅ |
| Privacy | Legal text page | ✅ |

## Collection index UX

Project grid · no filters or sort · no pagination until the list needs it · empty state is PendingText · card shows cover, title, and location when those exist. No project entries yet: [[PENDING: project entries]].

## Content model

landing / multipage: typed modules in `src/content/*.ts` (`site.ts` = name, NAP, channels, nav, default SEO; one module per page). cms / shop: Sanity — `page.sections[]` (one block per Blueprint band archetype) + `siteSettings` + `seo` object; confirm before schema code.

| Type / module | Purpose | Key fields |
|---|---|---|
| siteSettings | Identity, NAP, channels, nav, default SEO | name, city Struga, country North Macedonia, street [[PENDING: street address]], hours [[PENDING: opening hours]], both phones, email, Facebook https://www.facebook.com/Bauhaus.Struga/, nav, seo |
| page | Home, Services, About, Contact, Privacy | sections[] (one block per band archetype), seo. Service names are [[PENDING: service list]] — do not invent them |
| project | Project cases | title, slug, summary, location, year, cover, gallery |
| seo | Shared metadata | title, description |

## Design System

Expanded by `/design` into `DESIGN.md` + `design/tokens.css` (`@theme`; copied into `src/app/globals.css` at `/scaffold`). A logo gives palette + mark only.

- Brand / logo on hand: no file — text identity **Ali Hisa** until a mark exists. Facebook profile photo is a building shot, not a logo; do not use it as the mark. Style (3–5 adjectives): photo-led, calm, precise, lakeshore craft (from peer, restyled for Ali Hisa) · Must not look like: —
- Section rhythm: Alternating (default)
- Tokens: primary/accent · surface/text/border · display + body fonts (max 2; Inter/Poppins/Roboto only as a logged clone exception) · radius/shadow — TBD until /design

### Asset brief

Single source; `DESIGN.md` explains, never lists. Reference media = internal stand-ins, replaced before any client preview. Missing client photos never block: empty `ImageSlot` + `[[PENDING: photo — <slot>]]`.

- Clone target (name + URL): Mike Schaap Builders · https://mikeschaapbuilders.com/ (cloneability **medium** 69/100)
- Reference grammar kept: 1800px content box with outer gutters (~58px @1440) · full-bleed hero/video bands · alternating 2-col image+text · horizontal project sliders (Swiper) · `/collection` 4-col card grid → **build as 3-col per Agreed structure** · sticky header hides on scroll · photo-led builder tone
- Stand-ins (role → `public/_peer/` file → source URL): fetch per slot at `/design`/`/build` via `fetch-asset.mjs` — none pre-fetched
- Icons / cutouts / shapes / illustrations: Lucide icons · decorative shapes from reference non-mark SVGs or Haikei · no peer logos · project photos = `ImageSlot` until client media

### Clone exceptions log

A hard lock that yields to a measured reference value. Log here **and** in `DESIGN.md` Decisions, or the lock applies.

| Lock | Reference measured value | Band / page | Date |
|---|---|---|---|
| Header | 111px bar @1440 | sitewide header | 2026-11-09 |
| Type | Futura PT display caps + Freight Sans body (free stand-ins) | sitewide | 2026-11-09 |

### Clone Blueprint

`#` = the capture's band number for that page (never renumber; dropped bands stay as `dropped`; an approved new band = `<n>a`). Build roots carry `data-band="<#>"`. Pages map reference ↔ build in `research/page-map.json`. Required fields: `clone-fidelity.mdc`.

| Page | # | Band | Archetype | Element map | Type roles | CTA anatomy | Interaction | Motion | Measures (375/1440) | Screenshots | Client content / dropped | Do not invent |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| home | 1 | Full-bleed hero (image/video) | bg full · media center | display hero · body — | — | static · load | none | `research/peers/mikeschaapbuilders/measures/home/band-1.md` | `pages/home/band-1-*.png` | hero media [[PENDING]] | yes |
| home | 2 | Intro: copy + dual CTAs | L text · R media | body · label links | text links + buttons | scroll | reveal | `…/home/band-2.md` | `pages/home/band-2-*.png` | copy [[PENDING]] | yes |
| home | 3 | Split feature (image + copy) | L/R 2-col | body · small heading | inline links | scroll | reveal | `…/home/band-3.md` | `pages/home/band-3-*.png` | copy [[PENDING]] | yes |
| home | 4 | Horizontal card strip (8) | row carousel | card title · thumb | card links | click · scroll | none (ref static band) | `…/home/band-4.md` | `pages/home/band-4-*.png` | projects [[PENDING]] | yes |
| home | 5 | Featured project spotlight | L/R 2-col · large image | display · body | primary CTA | scroll | reveal | `…/home/band-5.md` | `pages/home/band-5-*.png` | project [[PENDING]] | yes |
| home | 6 | Project carousel | swiper row | card image · label | card links | click | reveal (simplified) | `…/home/band-6.md` | `pages/home/band-6-*.png` | selected work [[PENDING]] | yes |
| home | 7 | Closing strip / pre-footer | single col | body · CTA | Get in touch | scroll | reveal | `…/home/band-7.md` | `pages/home/band-7-*.png` | CTA label [[PENDING]] | yes |
| about | 1 | Page hero image + headline | full-width media · text overlay | display · body | — | static | none | `…/about-us/band-1.md` | `pages/about-us/band-1-*.png` | studio facts Struga/1997 | yes |
| about | 2 | Two-col story block | L/R | body | — | scroll | reveal | `…/about-us/band-2.md` | `pages/about-us/band-2-*.png` | [[PENDING]] | yes |
| about | 3 | Long-form editorial + gallery | single col stack | body · captions | — | scroll | reveal | `…/about-us/band-3.md` | `pages/about-us/band-3-*.png` | [[PENDING]] | yes |
| about | 4 | Image parallax band | bg image · foreground copy | display | — | scroll | reveal (ref scrub — simplified) | `…/about-us/band-4.md` | `pages/about-us/band-4-*.png` | photos [[PENDING]] | yes |
| services | 1 | Services page hero | full-bleed image | display · body | — | static | none | `…/services/band-1.md` | `pages/services/band-1-*.png` | — | yes |
| services | 2 | Service row (image + text) | L/R | body · h3 | link | scroll | reveal | `…/services/band-2.md` | `pages/services/band-2-*.png` | **list rows** [[PENDING: service list]] | yes |
| services | 3 | Service row | L/R | body · h3 | link | scroll | reveal | `…/services/band-3.md` | `pages/services/band-3-*.png` | same | yes |
| services | 4 | Service row (taller) | L/R | body · h3 | link | scroll | reveal | `…/services/band-4.md` | `pages/services/band-4-*.png` | same | yes |
| services | 5 | Service row + parallax image | L/R · bg | body | link | scroll | reveal (ref scrub) | `…/services/band-5.md` | `pages/services/band-5-*.png` | same | yes |
| services | 6 | Service row | L/R | body | link | scroll | reveal (ref scrub) | `…/services/band-6.md` | `pages/services/band-6-*.png` | same | yes |
| services | 7 | Closing service / CTA band | single col | body | Get in touch | scroll | reveal (ref scrub) | `…/services/band-7.md` | `pages/services/band-7-*.png` | same | yes |
| contact | 1 | Page title strip | single col | display | — | static | none | `…/contact/band-1.md` | `pages/contact/band-1-*.png` | — | yes |
| contact | 2 | Intro copy | single col | body | — | static | none | `…/contact/band-2.md` | `pages/contact/band-2-*.png` | [[PENDING]] | yes |
| contact | 3 | **dropped** — reference contact form | 2-col form + map | — | form fields | — | dropped | `…/contact/band-3.md` | `pages/contact/band-3-*.png` | **dropped** (plan: NAP phones/email, no form) | yes |
| contact | 3a | NAP + map strip (Agreed) | 2-col phones · email · optional map link | body · tel/mailto | call + email | click | none | — | — | NAP from Conversion | yes |
| projects | 1 | Collection hero / header zone | full-bleed | display | — | static | none | `…/collection/band-1.md` | `pages/collection/band-1-*.png` | title [[PENDING]] | yes |
| projects | 2 | Project card grid | 4-col ref → **3-col build** | card image · h3 | card → detail | click | none | `…/collection/band-2.md` | `pages/collection/band-2-*.png` | projects [[PENDING]] | yes |
| project | 1 | case-hero | Full-bleed cover (tall band) | bg · media full-bleed | display title · — | Get in touch | static | none | `…/custom-homes-lake-michigan-estate/band-1.md` | `pages/custom-homes-lake-michigan-estate/band-1-*.png` | title · summary · cover [[PENDING]] | yes |
| project | 2 | case-gallery | Stacked gallery (10 images) | single col | body · captions | — | scroll | reveal | `…/custom-homes-lake-michigan-estate/band-2.md` | `pages/custom-homes-lake-michigan-estate/band-2-*.png` | gallery [[PENDING]]; add title/summary block per Agreed structure | yes |
| privacy | — | Legal text | — | — | — | — | — | — | — | not on reference · template at launch | yes |

### Motion map

Every Blueprint band, `none` if static, within the Animation level budget (beyond it → simplified, written here as an intended difference).

| Route | # | Motion (Medium rebuild) | What moves (reference) | Trigger | Rebuild (tokens) | State PNGs |
|---|---|---|---|---|---|---|
| `/` | 1 | none | static hero | — | — | — |
| `/` | 2–3,5–7 | reveal | opacity fade-in on scroll | in-view | `--motion-reveal-*` | `states/home/band-*-1440-before/after.png` |
| `/` | 4 | none | Swiper static in capture | — | optional scroll-snap carousel (1 signature moment) | — |
| `/` | 6 | reveal | opacity on carousel section | in-view | `--motion-reveal-*` | `states/home/band-6-*` |
| `/about` | 2–3 | reveal | opacity | in-view | `--motion-reveal-*` | `states/about-us/band-2-*` … `band-3-*` |
| `/about` | 4 | reveal | ref scrub/parallax → simplified reveal | in-view | `--motion-reveal-*` (no scrub) | `states/about-us/band-4-*` |
| `/services` | 2–4,7 | reveal | opacity | in-view | `--motion-reveal-*` | `states/services/band-*` |
| `/services` | 5–7 | reveal | ref scrub → simplified reveal | in-view | `--motion-reveal-*` | `states/services/band-5-*` … `band-7-*` |
| `/contact` | 1–2 | none | static | — | — | — |
| `/contact` | 3a | none | NAP strip | — | — | — |
| `/projects` | 1–2 | none | grid | — | — | `states/collection/sweep-1440-*` |
| `/projects/[slug]` | 1 | none | hero image | — | — | — |
| `/projects/[slug]` | 2 | reveal | vertical gallery | in-view | `--motion-reveal-*` | `states/custom-homes-lake-michigan-estate/sweep-1440-*` |
| sitewide | header | hide on scroll down | header translate/hide | scroll | site-chrome | `states/*/header-1440-*.png` |
| sitewide | mobile nav | **right slide-out drawer** (intentional — not peer full-screen) | panel + dim overlay | click hamburger; close X / backdrop / Esc | `--nav-drawer-*` tokens | preview `design/sample-home-band-2.html` |

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
| `brand.name` | Ali Hisa |
| `nav.primaryCta` | [[PENDING: sq button label]] |
| `home.hero.headline` · `.subline` · `.cta` | [[PENDING: headline and subline]] · cta matches the button label |
| `footer.tagline` | — |
| `contact.form.submit` | N/A |
| `404.title` | [[PENDING: 404 title]] |
| `ageGate.question` · `.yes` · `.no` · `.blocked` | N/A |

## Motion contract

Budget by Animation level: `.cursor/rules/design.mdc` → Motion budget (single source). Write the level below; never copy the table here.

| Field | Value |
|---|---|
| Reference motion stack observed | CSS transitions · scroll-linked opacity reveals · Swiper carousels · scroll-scrub on about/services (simplified to ScrollReveal at Medium) · header hide on scroll — **no Lenis/GSAP observed** |
| Default in-view entrance | **Scroll appear** (below) — change only on the user's explicit ask |
| Reduced motion | Always: final state at once, layout intact |

**Scroll appear** — shared `ScrollReveal` (`src/components/motion/scroll-reveal.tsx`, `motion/react`): content renders **visible** in the static HTML; after mount the reveal arms only for units still below the viewport and only when reduced motion is off · initial `opacity: 0`, `y: var(--motion-reveal-distance)` (~16px) → `opacity: 1`, `y: 0` · `whileInView`, `once: true`, `amount: 0.3` · duration `--motion-reveal-duration` (~0.85s) · ease `--motion-reveal-ease` (cubic-bezier(0.22, 1, 0.36, 1)) · stagger `--motion-reveal-stagger` (~0.07s). Never wrap the first screen. JS values come from `src/lib/motion-tokens.ts`, generated from `design/tokens.css`.

| # | Band / route | What moves | Trigger | Tokens | Evidence (state PNGs) |
|---|---|---|---|---|---|
| 1 | Header hide on scroll | bar hides | scroll down | site-chrome | `states/home/header-1440-*.png` |
| 2 | Home band 6 carousel | cards | in-view reveal + optional snap | `--motion-reveal-*` | `states/home/band-6-*` |
| 3 | Section reveals (bulk) | titles · images · rows | in-view | `--motion-reveal-*` | per-band `states/*` |

## Content checklist

Status: Pending / Requested / Received / Entered / Approved

| Asset | Who | Status |
|---|---|---|
| Logo mark (SVG or transparent PNG) | [[PENDING: who delivers logo — client file vs design deliverable]] | Pending |
| Branding system (beyond site tokens) | [[PENDING: brand guidelines / full identity scope]] | Pending |
| NAP (street, hours), social | Client | Partial — phones, email, Facebook URL known; street and hours [[PENDING]] |
| Home + page copy | [[PENDING: copy owner — not confirmed from blank questionnaire]] | Pending |
| Photos (replace stand-ins) | [[PENDING: photo owner — not confirmed from blank questionnaire]] | Pending |
| Legal (Privacy; Terms for shop) | Client / lawyer | Pending |
| Image + font licenses | Client / Me | Pending |

Blank `client-questions.docx`: only unchecked template defaults were read — not treated as client decisions.

## Features

Sticky header + mobile menu always on. Form / call / booking = Conversion.

| Feature | On? | Notes |
|---|---|---|
| Multi-level nav · collection pagination · anchors | ❌ · ❌ · ❌ | Single-level nav. Paginate projects only when the list needs it |
| Age gate | no | |
| Search · draft preview | ❌ default | preview needs the OpenNext path |
| Cookie banner | ❌ unless cookie tracking is added | Cloudflare Web Analytics is cookieless |

## Ops

| Field | Value |
|---|---|
| Domain · GitHub repo | alihisa.com (existing site did not load — not a clone reference) · GitHub [[PENDING: repository name]] |
| Host (Cloudflare) · CMS (Sanity, cms/shop only) | deferred · CMS: Sanity, project not created |
| Sanity project ID · live URL | [REQUIRED when created / live] |
| Form backend | N/A |
| Image path | cms: Sanity CDN loader |
| Analytics | (default: Cloudflare Web Analytics) |
| Reference media in production | ❌ never — only with a written license from the rights holder, logged here (client acceptance is not a license) |
| Lighthouse (prod, mobile, median of 3) | [after /deploy] |

## Decisions

Every choice made without a lock: clone pick, competitor check, clone exceptions, reference conflicts, server needs (OpenNext), deploy go-ahead, waivers, cutouts.

| Date | Decision | Why | Who |
|---|---|---|---|
| 2026-11-09 | Kickoff plan approved | CMS layer, 8 pages, conversion, languages, industry, domain — user message | User |
| 2026-11-09 | Public name Ali Hisa | Bauhaus / Bau-Haus only on external listings | User |
| 2026-11-09 | Chat briefing is the fact source | `brief/client-questions.docx` has no written answers. Parsed rows are all ⚠. No hidden instructions | User |
| 2026-11-09 | https://www.alihisa.com is not a reference | The site did not load | User |
| 2026-11-09 | Client scope includes website, CMS, logo, branding | Original client requirements — must not be dropped silently | User |
| 2026-11-09 | Web Brain logo/branding limits noted | Kit workflow: `/design` sets tokens, type, palette (logo file can inform palette only); template **Out of scope** lists pro logo unless expanded — full logo + brand-guidelines deliverable needs an explicit expansion [[PENDING: confirm deliverable vs kit default]] | User + plan template |
| 2026-11-09 | Reference **Mike Schaap Builders** https://mikeschaapbuilders.com/ | User override of industry shortlist · direct competitor **no** | User |
| 2026-11-09 | Agreed structure kept vs reference | `/collection` → `/projects` **3-col not 4** · contact **NAP only** (peer form dropped) · services = **one list page** using peer row grammar · Privacy not cloned | User plan |
| 2026-11-09 | Project detail peer | **Lake Michigan Estate** `https://mikeschaapbuilders.com/custom-homes/lake-michigan-estate` — hero + 10-image gallery; maps to `/projects/[slug]` | Capture + User |
| 2026-11-09 | Mobile nav = right slide-out drawer | User override: not peer full-screen menu — overlay, X close, backdrop dismiss, smooth transition | User |
| 2026-11-09 | Primary nav = hamburger + drawer at all breakpoints | No inline desktop links; logo left, menu right; Kontakto in drawer footer only | User |
| 2026-11-09 | Home hero photo + glass chrome | Stock construction photo (`public/images/hero/home.jpg`) until client asset; header glass over hero; wider frosted drawer | User |
| 2026-11-09 | Client logo in header + centered intro after hero | Logo from client Instagram saved to `public/images/brand/logo.jpg` (976×976); intro replaces Blueprint home band 2 archetype (L text / R media → centered logo + text + "More about us" → `/about`) | User |
| 2026-11-09 | Home image band after intro (`data-band="3"`) | Wide 21:9 photo (`public/images/home/craft.jpg`, stock until client asset) with short overlay text; replaces Blueprint home band 3 split-feature archetype; navbar tint on home raised to dark 30% for legibility over light sections | User |
| 2026-11-09 | Intro copy supplied by user is the reference's wording | "Crafting homes for discerning clients since 1986…" is Mike Schaap's text; Ali Hisa is since **1997**; site language is sq — [[PENDING: client copy / confirm year]] before launch | User (flagged) |
| 2026-11-09 | Nav = solid black inline navbar (supersedes drawer, hamburger and glass rows) | Logo `h-14` + name left, links inline right; on mobile the links wrap under the logo; no drawer, no overlay; `--header-bg` black | User |
| 2026-11-09 | Client renders for hero + image band | Hero `public/images/facebook/Ali_foto1.jpg`; band 3 full-width `Ali_foto2.jpg` with 52% dark overlay + centred text; stock `hero/home.jpg` and `home/craft.jpg` deleted | User |
| 2026-11-09 | Rich dark footer | Logo + tagline, nav, services, contact (both phones, email, Strugë), Instagram https://www.instagram.com/bauhaus_hisa/ + Facebook, © bar + Privatësia; services limited to "Arkitekturë · Ndërtim" (only facts on file — full list still [[PENDING: service list]]); street and hours still pending so not shown; footer copy in Albanian — client to proofread | User |
| 2026-11-09 | Hero uncropped at 100% width; slideshow band after the image band (`data-band="4"`) | Hero keeps the photo's own aspect so the watermark logo is never cut; slideshow = `Ali_foto3–6.jpg`, scroll-driven (user, supersedes the 1.5 s timer): stage pins below the header, ~200svh of scroll per slide and 1.8 s wipe / 1.4 s text (user: way slower), 0.4 s crossfade, image + text share one active index, then the page continues; reduced motion gets instant cuts; on white, max 60rem unframed print (square corners, no border, one soft drop shadow), 3:2 cover crop anchored bottom-left so the watermarks stay in frame, passive line indicators | User |

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
| Domain · Cloudflare · GitHub · Sanity · form/analytics | Client ⚠️ CONFIRM | until handoff ⚠️ CONFIRM |

## Client-requested scope (original brief)

| Deliverable | In this repo / workflow | Notes |
|---|---|---|
| Website | ✅ cms build path | Static export + Sanity after `/scaffold` |
| CMS | ✅ layer cms | Sanity Studio in scope for pages, projects, site settings |
| Logo | ⚠️ partial / needs decision | No file today — text **Ali Hisa** on site until a mark exists. Kit default treats **pro logo** as out of scope unless you expand the plan; a standalone logo deliverable is not a built-in slash stage |
| Branding | ⚠️ partial / needs decision | In-kit branding = `DESIGN.md` + `design/tokens.css` + reference styling at `/design`. Full identity system (guidelines PDF, stationery, etc.) is not automatic — [[PENDING: branding deliverable scope]] |

Do not shrink client-requested logo/branding without a logged plan change.

## Out of scope

Unless you expand it: types beyond the Content model · languages beyond Overview · migrating an existing site · search (unless Features) · **pro copy/photo/logo** (see Client-requested scope — client asked for logo/branding) · SEO after launch · dark mode · paid typefaces (unless bought).
