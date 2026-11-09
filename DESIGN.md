# DESIGN.md — [CLIENT NAME]

Art direction + token rationale. Fill after kickoff / design gate. Keep in sync with `plan.md` locks (Section rhythm, Copy lock, Motion contract / Motion map, Clone Blueprint). Band tables and signature-moment rows live in `plan.md` — don’t copy them here.

**Layer:** from `plan.md` (`stack.mdc`).

---

## The business

| | |
|---|---|
| What it is | |
| Who visits | |
| The one action | |
| **The characteristic thing** | |
| Does NOT want to look like | |

---

## Direction: [name]

One paragraph: what this is, and why it belongs to this business.

| Axis | Position | Why |
|---|---|---|
| editorial ↔ corporate | | |
| warm ↔ cool | | |
| dense ↔ airy | | |
| geometric ↔ organic | | |
| understated ↔ bold | | |

---

## Principles

Decision rules — each must reject a future choice.

1.
2.
3.

---

## Signature element

**What:** (prefer peer move restyled)  
**Why it belongs:**  
**Where:** (once)

---

## Imagery direction

The asset list lives in `plan.md` **Asset brief** (single source). Here: what the images should *say*.

| | |
|---|---|
| Photo subjects + mood | |
| What imagery must avoid | |
| Product role (box/pack · cutout · portrait · none) | |
| Peer comps in use → replace with | |

---

## Token rationale

| Group | Decision | Why |
|---|---|---|
| Color anchor | | |
| Neutral temperature | | |
| Display / body type | | license: |
| Type scale / tracking | | |
| Spacing / section rhythm | | must match plan Alternating / Uniform |
| Radius / elevation | | |
| Motion signature | | |

---

## Contrast

WCAG 4.5:1 body · 3:1 large/UI · APCA sanity check.

| Foreground | Background | WCAG | Pass | APCA Lc |
|---|---|---|---|---|
| on-surface | surface | | | |
| on-accent | accent | | | |
| accent | surface | | | |

---

## Layout plan

The band table lives in `plan.md` **Clone Blueprint** — don't copy it here or the two will drift. This section records only the token mapping per band.

| Peer band | Spacing token | Max-width token | Type roles (tokens) | Notes |
|---|---|---|---|---|
| | | | | |

- [ ] Band order matches the blueprint · Do not invent respected
- [ ] Peer grammar logged in Decisions
- [ ] Measured px mapped to tokens (no raw px in markup)
- [ ] band-check sheets (375 + 1440) per band (`clone-fidelity.mdc`)
- [ ] Agreed structure respected · hero + header satisfy `design.mdc` or a clone exception is logged in **both** Decisions and `plan.md` Clone exceptions log
- [ ] L1–L13 respected — no invention outside Blueprint / DESIGN / plan
- [ ] Motion map + signature moments locked · rebuilt with our stack (L13)

---

## Motion plan

The signature-moment **table** and **Scroll appear** recipe live in `plan.md` **Motion contract** — don’t duplicate them here. Record only token / feel rationale.

**Default scroll animation:** Scroll appear (`ScrollReveal` + `--motion-reveal-*` tokens). Change only if the user asks.

| Moment # (from plan) | Duration / easing rationale | Reduced-motion behavior |
|---|---|---|
| 1 | default reveal tokens unless noted | instant final state |
| 2 | | |
| 3 | | |

- [ ] Plan Motion map + contract locked · within the Animation level budget (`plan.md` Motion contract)
- [ ] `design/tokens.css` has `--motion-reveal-distance` · `--motion-reveal-duration` · `--motion-reveal-ease` · `--motion-reveal-stagger` (JS copy: `src/lib/motion-tokens.ts`, generated)
- [ ] Shared `ScrollReveal` wrapper used for in-view entrances (no one-off fade recipes)
- [ ] Rebuild with our stack (`motion` default) — no peer animation JS (`clone-fidelity.mdc`)
- [ ] `prefers-reduced-motion` verified

---

## Decisions log

| Date | Considered | Rejected because |
|---|---|---|
| | | |

**Clone overrides** (peer grammar kept): e.g. pill CTAs, badges, wave dividers.

**Clone exceptions** (hard lock yields to a measured peer value — required in **both** `DESIGN.md` Decisions and `plan.md` Clone exceptions log):

`Clone exception: <lock> — peer measured <value> — band <n>`
