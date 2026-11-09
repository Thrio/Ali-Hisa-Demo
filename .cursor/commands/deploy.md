# /deploy — Cloudflare (coordinator's go-ahead only)

Gate: the "deploy go-ahead" row in `PROGRESS.md` is filled by the coordinator, `/launch` is clean, `public/_peer/` is gone. Otherwise stop. Read: skill `deploy-cloudflare`.

Follow `deploy-cloudflare` (preview URL first, then domain, smoke test, Lighthouse on production). Never in tests. Never push code — the coordinator pushes.

Last line: `Next: handoff — node tools/handoff-export.mjs <dir>, then preship-scrub --handoff.`
