# web-brain tools

Run from the client project root. Node 22. Tools print a short summary (≤ 15 lines); the workflow tools (check-project, band-check, check-site, preship-scrub, a11y) end with a `Next:` line. Add `--verbose` to capture, measure-diff and scan-kit for the full output.

```sh
cd tools && npm ci --ignore-scripts && npx playwright install chromium && npm run self-test
```

| Command | What it does |
|---|---|
| `node tools/check-project.mjs [--stage s] [--json] [--brief] [--sync-motion-tokens]` | Stage, missing items, tooling (Node, npm, Chromium, self-test, pnpm when needed, security floor, edited kit files) and `Next:` |
| `node tools/capture.mjs <url> --slug <ref> [--pages auto\|/,/about] [--filmstrip] [--qa] [--fast]` | Reference evidence pack → `research/peers/<ref>/` (nested scroll containers, footer check) |
| `node tools/capture.mjs --serve out --pages /,/about --fast` | Our static build → `research/build/site/` (or `http://localhost:3000 --local`) |
| `node tools/band-check.mjs --peer-slug <ref> --page <name> --band <n> [--first-screen] [--base URL \| --serve out]` (default base http://localhost:3000 — run `npm run dev` first) | One band: capture + overlay sheets at 1440 and 375 + measure diff + check-site → REVIEW / FIX / NEEDS-REVIEW |
| `node tools/check-site.mjs [--serve out] --pages /,/about [--qa] [--launch] [--band n]` | Screenshots + overflow, off-centre, spacing scale, uneven gaps, overlaps, tap targets, console/CSP errors, loop detector, Blueprint order |
| `node tools/overlay.mjs --peer-slug <ref> --page home --band 3 --width 1440` | Overlay images, one review sheet, hints (pages mapped by `research/page-map.json`) |
| `node tools/measure-diff.mjs --peer-slug <ref> --page home --band 3` | Property differences with the lesson (L1–L13) they usually mean |
| `node tools/fetch-asset.mjs <url> --peer <ref> [--to-public]` · `--refetch <ref>` | One stand-in, checked and logged · re-download every logged stand-in on a fresh clone |
| `node tools/cutout.mjs <photo> --name <slug> --on <hex> --no-people` | Client product photo with a plain background → transparent PNG + preview |
| `node tools/card-to-md.mjs` | Filled `brief/client-questions.docx` → `brief/client-card.md` with a `## Parsed` block |
| `node tools/preship-scrub.mjs [--audit] [--launch]` · `--handoff <dir>` | Launch gate · checks the client export |
| `node tools/handoff-export.mjs <dir>` | The client's new repo: the site only |
| `node tools/copy-check.mjs` | Shared text or identical files vs the references |
| `node tools/scan-kit.mjs` | Hidden instructions in rule files; unpinned MCP launchers |
| `node tools/a11y.mjs --serve out --pages /,/about` (after `npm run build`; or a URL) | axe from the pinned local copy |
| `cd tools && npm test` | Unit tests (expect `fail 0`) |

**Safety defaults:** Chromium sandbox on · downloads off · service workers and websockets blocked · private network blocked (requests, responses, DNS at connect time) · popups closed, dialogs dismissed · robots.txt respected (server errors count as disallow) · at least 1.5 s between reference pages · honest user-agent token · stops at bot protection · cookie banners hidden, never accepted.

| Symptom | Fix |
|---|---|
| "channel chrome did not start" | Fine — bundled Chromium is used. `CAPTURE_CHANNEL=chromium` skips the attempt |
| Chromium sandbox error on Linux | Enable unprivileged user namespaces, or use the container in `SECURITY.md` (`--unsafe-no-sandbox` works only there, also for `npm run self-test -- --unsafe-no-sandbox`) |
| robots.txt disallows · bot protection | Pick another reference (owner permission: `--owner-permission "<who, date>"`) |
| Wrong band split | `bands.json` (see the `capture-reference` skill) |
| A band shot is one colour | Pre-reveal state or canvas — use the full-page shot and `states/` |
| Report says **Bands: incomplete** | Footer not reached — nested scrolling or lazy content; check before filling the Blueprint |
