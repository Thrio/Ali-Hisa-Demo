# /fix <issue> — fix protocol

1. **Restate** what / where / breakpoint / must-not-change (1 line).
2. **Reproduce**: a command, screenshot or check-site finding that shows it. None → ask once.
3. **Root cause**, not symptom (1–2 lines).
4. **Every occurrence**: grep the pattern; list every related error from `npm run verify` and `node tools/check-site.mjs`. Nothing is skipped as "unrelated" without being listed.
5. **Fix** surgically (M4, M5).
6. **Verify**: the reproduction again + `npm run verify` + check-site on the affected pages + band-check if layout. Paste the result lines.
7. **Loop check**: check-site loop detector clean; `useEffect` dependencies and no setState during render; no scroll/resize listener setting state on every event without a guard; no redirect loop; no recursive import; build < 5 minutes.
8. Report with the response contract. Never "fixed" without step 6 output.
9. Three failed attempts → revert your own last change, log it in `PROGRESS.md`, ask with 2 options.

Last line: `Next: <the step that was interrupted>`.
