# /qa — design QA, accessibility, SEO

Gate: `node tools/check-project.mjs --stage qa`. Read: skills `design-qa` + `seo-site`.

1. `npm run build`, then `node tools/check-site.mjs --serve out --qa --pages <all routes>` → open the screenshots; one verdict line per page and width.
2. `node tools/a11y.mjs --serve out --pages <all routes>` (same build; axe ships with the tools).
3. Clone QA (every in-scope route), then `seo-site` audit.
4. Show every BLOCKER and HIGH (≤ 12 lines). Fix after "ok" with `/fix`; re-run until clean → qa row in `PROGRESS.md`, commit.

Last line: `Next: /launch — pre-launch gates.`
