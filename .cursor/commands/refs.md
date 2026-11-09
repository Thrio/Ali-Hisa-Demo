# /refs — reference pick, capture, Blueprint

Gate: `node tools/check-project.mjs --stage refs`. Read: `clone-fidelity.mdc`, skills `industry-refs` + `capture-reference`. L1–L13 one-liners: plan.md → Clone lessons (full text `.cursor/skills/build-page/references/clone-lessons.md` only when a lesson is named).

1. Top 5: the client's reference (if any) is #1, plus up to 4 from live research and `references/industries/<industry>.md` (favour easy/medium cloneability). Check `references/used-references.md`; ask "Is it a direct competitor in the client's market?". Wait for the pick.
2. `node tools/capture.mjs <url> --slug <ref> --pages <one per page type> --filmstrip`. Report says incomplete / STOP → stop and tell the user.
3. Open report.md, band PNGs, states. Write `research/page-map.json` (reference page ↔ build route).
4. Fill Clone Blueprint (# = capture band number; no client content → `dropped`), Motion map (within the animation budget), asset brief. Reference vs Agreed structure → ask once (default: keep the plan).
5. Log the pick in plan.md Decisions; the coordinator runs `node scripts/brain.mjs log-reference …` in the kit.
6. Show the band table (page · # · archetype · client content or dropped · motion). On "ok": refs row in `PROGRESS.md`, commit.

Last line: `Next: /design — palette, type and one sample band.`
