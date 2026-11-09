# /launch — pre-launch gates (no deploy)

Gate: `node tools/check-project.mjs --stage launch`.

1. `npm run build` · `node tools/capture.mjs --serve out --local --pages <all routes> --fast`.
2. `node tools/preship-scrub.mjs --audit --launch` · `node tools/copy-check.mjs` · `node tools/scan-kit.mjs` · `node tools/check-site.mjs --serve out --launch --pages <all routes>`.
3. Show every BLOCKER and HIGH and what you changed. Stand-ins, `[[PENDING]]` and a missing domain are BLOCKERs only the client can clear (photos, copy, domain): list them with what is needed; never strip, hide or invent content to pass. An item the client accepts as-is becomes plain copy in their words, logged in plan.md Decisions.

Never deploy here. Last line: `Next: /deploy — after the coordinator writes the go-ahead in PROGRESS.md.`
