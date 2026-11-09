# DESIGN.md — Ali Hisa

Art direction + token rationale. Synced with `plan.md` (Medium animation, Alternating rhythm, Mike Schaap Builders reference).

**Layer:** cms (`plan.md`)

---

## The business

| | |
|---|---|
| What it is | Architecture and construction practice in Struga, North Macedonia, since 1997 |
| Who visits | Albanian-speaking clients seeking design or build partners |
| The one action | Get in touch (call or email) |
| **The characteristic thing** | [[PENDING: what the design should express]] — craft shown through real project photography, not decoration |
| Does NOT want to look like | Generic template; peer brand (Mike Schaap); “Bauhaus” directory naming |

---

## Direction: Quiet craft

Photo-led builder site: generous whitespace, uppercase display type, calm neutrals warmed for masonry and shoreline light. Motion stays editorial (scroll reveals, one carousel signature on home) — not luxury scroll theatre.

| Axis | Position | Why |
|---|---|---|
| editorial ↔ corporate | editorial-leaning | Project stories and studio facts lead |
| warm ↔ cool | warm-neutral | Stone, timber, Struga light — not cold tech |
| dense ↔ airy | airy | Peer gutters and section height preserved |
| geometric ↔ organic | geometric type, organic photos | Display caps + real build imagery |
| understated ↔ bold | understated structure, bold photography | Ali Hisa has no logo mark yet |

---

## Principles

1. **Photography is the brand** until a logo exists — never stock as “the business”.
2. **One CTA grammar** sitewide: sentence-case intent in plan, uppercase display links in UI (peer grammar).
3. **No invented services or projects** — `ImageSlot` and `PendingText` until client content.
4. **Nav is a solid black inline navbar** at every width — no drawer, no full-screen menu (see Site chrome below).

---

## Signature element

**What:** Full-bleed project hero into a measured 2-col intro (home band 2 grammar).  
**Why it belongs:** States craft immediately without a logo.  
**Where:** Home once (signature moment #1 in Motion contract).

---

## Site chrome — navigation

**Intentional override** (Mike Schaap uses a near full-screen mobile panel — we do not clone that interaction).

| Behaviour | Spec |
|---|---|
| Layout | Sticky header, solid `--header-bg` (black); logo (`h-14`) + name left, links inline right at `md+` |
| Mobile | Logo row, then the links wrap on a second row; no hamburger, no drawer |
| Links | Uppercase display, 70% on-accent; hover and active full on-accent; active has an underline + `aria-current` |
| Build | `src/components/chrome/site-header.tsx` |

---

## Imagery direction

| | |
|---|---|
| Photo subjects + mood | Completed builds, structural detail, Struga / lake context; honest daylight |
| What imagery must avoid | Peer luxury lakeshore comps in client previews; people without licence |
| Product role | none (services practice) |
| Peer comps in use → replace with | Client / licensed photos before any external preview |

---

## Token rationale

| Group | Decision | Why |
|---|---|---|
| Color anchor | Warm neutral surface + near-black text | Peer rgb roles → OKLCH, slightly warmed for Ali Hisa |
| Neutral temperature | Warm stone accent `oklch(42% 0.04 55)` | Subtle construction accent without copying peer black/white only |
| Display / body type | League Spartan + Schibsted Grotesk | Stand-ins for Futura PT + Freight Sans (`font-stand-ins.md`) |
| Type scale / tracking | 17px body, 35–56px display, wide display tracking | Peer computed sizes → tokens |
| Spacing / section rhythm | 17–106px scale · Alternating | Matches plan + peer measures |
| Radius / elevation | Minimal radius · subtle shadow | Peer uses flat cards; light shadow on hover only |
| Motion signature | ScrollReveal | Medium budget; scrub simplified |
| Header | `--header-bg` solid black | User-requested inline navbar |

---

## Contrast

| Foreground | Background | WCAG | Pass | APCA Lc |
|---|---|---|---|---|
| on-surface | surface | 16.8:1 | yes | ~95 |
| on-accent | accent | 7.2:1 | yes | ~65 |
| on-surface-muted | surface | 5.1:1 | yes | ~55 |

---

## Layout plan

| Peer band | Spacing token | Max-width token | Type roles | Notes |
|---|---|---|---|---|
| home 1 | `--hero-min-height` · overlay | full bleed | display hero on photo | Preview hero in `design/sample-home-band-2.html` |
| home 2 | `--space-10` y · `--space-8` gap | `--content-max` | display h2 · body p | Same file — intro band + palette swatches |
| project 1–2 | full-bleed hero + gallery stack | `--content-max` | title · gallery | Fits Agreed case archetype |

- [x] Agreed structure confirmed in `plan.md`
- [x] Peer grammar logged in Decisions
- [x] Measured px mapped to tokens
- [ ] band-check sheets at build
- [x] Clone exceptions: header 111px · type stand-ins

---

## Motion plan

Default: **Scroll appear** (`--motion-reveal-*`). Peer scrub → reveal (logged in Motion map).

| Moment # | Rationale | Reduced motion |
|---|---|---|
| 1 | Header hide — quick, does not block reading | fixed header |
| 2 | Home carousel / project strip — optional snap | static row |
| 3 | Section reveals — bulk Medium budget | final state immediate |

---

## Decisions log

| Date | Considered | Rejected because |
|---|---|---|
| 2026-11-09 | Cool blue tech palette | No brand signal; not construction-warm |
| 2026-11-09 | Copy peer black/white only | Need distinct Ali Hisa accent for CTAs |
| 2026-11-09 | Peer full-screen mobile menu | User chose right slide-out drawer + overlay |

**Clone exceptions:**

- `Clone exception: Header — peer measured 111px — sitewide`
- `Clone exception: Type — Futura PT → League Spartan; Freight Sans Pro → Schibsted Grotesk — sitewide`

**Clone overrides:** Uppercase display nav/CTA tracking (peer grammar).

---

## Design preview (approval)

Open **`design/sample-home-band-2.html`** in a browser (from the `design/` folder so `tokens.css` resolves). This is the visual direction for approval — not a wireframe.

- **`design/tokens.css`** defines tokens on **`:root`** for the static preview and duplicates them in **`@theme`** for Tailwind at `/scaffold`. Earlier previews looked unstyled because browsers do not apply `@theme` alone.
- Hero and photo areas use **CSS placeholders** (warm stone gradients) — not client or peer photography. Real images arrive via `ImageSlot` + client media later.
- Copy in *italic pending* lines is intentionally unset; typography, colour, spacing and hierarchy are what you approve.
