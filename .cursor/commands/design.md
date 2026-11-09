# /design — design system

Gate: `node tools/check-project.mjs --stage design`. Read: `design.mdc`, `clone-fidelity.mdc`, skill `design-system`. L1–L13 one-liners: plan.md → Clone lessons (full text `.cursor/skills/build-page/references/clone-lessons.md` only when a lesson is named).

1. Re-read `references/industries/<industry>.md` and the reference evidence; confirm each **Agreed structure** row (✅).
2. Map the client's brand onto the reference's colour roles; keep free reference fonts or pick stand-ins (`design-system/references/font-stand-ins.md`); max 2 families.
3. Write `design/tokens.css` (`@theme`, incl. `--motion-reveal-*`, `--hero-min-height`, `--header-height`) — the one token source — and fill `DESIGN.md`. Nothing in `src/` yet.
4. Show palette, type pairing, contrast and one sample band (≤ 12 lines + images). On "ok": design row in `PROGRESS.md`, commit.

Last line: `Next: /scaffold — create the app with these tokens.`
