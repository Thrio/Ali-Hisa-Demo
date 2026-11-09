# Reference library

A **second source** for `industry-refs`, after live industry peers. 278 sites across 26 industries, ported from cursor-brain-web.

Most entries come from award galleries (Awwwards and similar), which lean towards experimental, motion-heavy sites — the hardest kind to clone. So:

- Prefer live peers in the client's industry and market. Use this library to widen the top 5, not to replace research.
- Capture a candidate before recommending it: `report.md` rates its **cloneability** (easy / medium / hard, with reasons). Favour easy and medium for fixed-price work.
- Log the pick with `node scripts/brain.mjs log-reference …` in the kit repo, so the next project sees it in `used-references.md`.

Files: `industries/<industry>.md` (one table per industry), `reference-list.md` (everything), `used-references.md` (cross-client log, warning only).
