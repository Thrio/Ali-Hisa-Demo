# /build [page] [band] — one band at a time

Gate: `node tools/check-project.mjs --stage build`. Read: `clone-fidelity.mdc`, `design.mdc`, skill `build-page` (`code-conventions.mdc` attaches with the code files). L1–L13 one-liners are in plan.md → Clone lessons; open `.cursor/skills/build-page/references/clone-lessons.md` only for a lesson that band-check or measure-diff names (L<n>).

Next band = first Blueprint band without `ok` in `PROGRESS.md` (or the one named).
1. Open the reference band PNGs (375 + 1440), measures, states; check the band against Agreed structure and the motion budget.
2. Build it: root `data-band="<#>"`, tokens only, `PendingText` / `ImageSlot` for missing content.
3. With `npm run dev` running: `node tools/band-check.mjs --peer-slug <ref> --page <name> --band <#>` (no dev server → `npm run build`, then add `--serve out`) → open both sheets → one verdict line per width. FIX → fix (max 3 rounds), else show.
4. Band 1: also `--first-screen`. Show the band with its sheets; wait for "ok" → `PROGRESS.md` row, commit.

Last line: `Next: /build — <next band>` or, after the last band, `Next: /qa`.
