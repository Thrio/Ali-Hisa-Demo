---
name: design-system
description: >-
  Runs /design — confirms the Agreed structure, maps the client's brand onto the
  reference's colour and type roles, writes design/tokens.css (@theme, the one
  token source) and DESIGN.md, and shows one sample band for approval. Use after
  /refs and before /scaffold.
---

# Design system (`/design`)

Gate: `node tools/check-project.mjs --stage design` (kickoff + refs approved; Blueprint and Motion map filled). Rules: `design.mdc`, `clone-fidelity.mdc`, `.cursor/skills/build-page/references/clone-lessons.md`.

**Reference fonts:** free reference fonts (Inter, Poppins, Roboto included) are allowed as a logged clone exception. A paid or unlicensable font → a free stand-in from `references/font-stand-ins.md` (this skill folder), logged in `DESIGN.md`. Max 2 families.

## Steps

1. Read `plan.md` (Agreed structure, Section rhythm, Animation level, Motion map, Copy lock), the reference evidence and `references/industries/<industry>.md`. Confirm each **Agreed structure** row (✅); a reference archetype that differs → ask once (default: keep the plan).
2. Direction: layout = Blueprint · motion driver = Motion map within the budget · our colours, type and implementation · the reference's shape and CTA grammar.
3. Palette: map the client's brand onto the reference's colour roles (a logo gives hints only); OKLCH ramp with `culori`; contrast body ≥ 4.5:1, large/UI ≥ 3:1 (`apca-w3` as a design-time check only).
4. Write **`design/tokens.css`** — one `@theme` block: colour, type, space, radius, shadow, motion (`--motion-reveal-distance`, `--motion-reveal-duration`, `--motion-reveal-ease`, `--motion-reveal-stagger`, plus `--motion-marquee-duration` / `--sticky-card-height` when used), `--hero-min-height: 100svh`, `--header-height`. Measured px → nearest step. Nothing goes in `src/` yet: `/scaffold` copies these tokens into `src/app/globals.css` and generates `src/lib/motion-tokens.ts`.
5. Fill `DESIGN.md` (direction, principles, token rationale, contrast, motion feel). Reference grammar in Decisions; lock conflicts → clone exception in both logs.
6. Render one sample band (HTML preview of a Blueprint band with the tokens, or annotated mock) for the approval.

## Gate B (≤ 10 lines)

```
**Done:** tokens + DESIGN.md · direction "<name>" · Agreed structure ✅ (<n> pages)
**Evidence:** design/tokens.css · DESIGN.md · sample band <path>
**Palette / type:** <roles → values> · <display + body, licence> · contrast OK
**Motion:** <animation level> · Scroll appear tokens · <signature moments>
**Needs you:** 1. Approve palette, type and the sample band [ok]
**Next:** /scaffold — create the app with these tokens.
```

On "ok": design row in `PROGRESS.md`, commit.
