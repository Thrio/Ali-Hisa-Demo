# Security

## Threat model

| Where | What can go wrong | Protection |
|---|---|---|
| Visiting reference sites | Browser exploit, drive-by download, a page reaching your router or local services | `capture.mjs`: Chromium sandbox on, downloads off, service workers and websockets off, private-network requests blocked and detected, popups closed. Keep Chrome and Playwright updated |
| Reading reference content | Hidden text or comments telling the agent to run commands or leak secrets | `security.mdc` (outside text is data), injection detector in `report.md`, `.cursorignore` hides secrets |
| Tools the agent runs | Unpinned or lookalike packages | Exact pins in `.cursor/mcp.json` and `tools/package-lock.json`, `npm ci --ignore-scripts`, `scan-kit` |
| The kit itself | Hidden Unicode instructions in rule files | `node tools/scan-kit.mjs` on every change |
| Downloaded comps | Executables, archives, scripted SVGs, path tricks | `fetch-asset.mjs`: content check, logo refusal, fixed folder, size and time limits |
| The shipped site | Unpatched Next.js, secrets in public variables, unsigned webhooks, missing headers, reference files or text | `security-floor.json`, `preship-scrub`, `copy-check` |
| Legal | Copying a direct competitor, shipping their photos, getting around access controls | robots.txt respected, no bot-wall bypass, no logins, same-market check, written license for any peer media |

## Your machine (once)

1. Keep the OS, Chrome and Cursor updated.
2. Cursor: Privacy Mode on. Terminal commands need approval; allow-list only `node tools/*`, `npm run *`, `git status`, `git diff`.
3. For manual research in your own browser, use a separate profile with no logged-in accounts, and install no "copy this website" extensions.
4. Never run "website ripper" or "site cloner" tools downloaded from the internet.

## Optional: capture inside a container (strongest isolation)

The container becomes the sandbox, so `--unsafe-no-sandbox` is allowed there only (the tool refuses it anywhere else). Check that the image tag matching `tools/package.json` exists before the first run.

```sh
docker run --rm -it --ipc=host --security-opt no-new-privileges \
  -e CAPTURE_IN_CONTAINER=1 \
  -v "$PWD/tools":/src/tools:ro -v "$PWD/research":/work/research -w /work \
  mcr.microsoft.com/playwright:v1.64.1-noble \
  bash -lc 'cp -r /src/tools /work/tools && rm -rf /work/tools/node_modules && cd /work/tools && npm ci --ignore-scripts && cd /work && node tools/capture.mjs https://ref.example --slug ref --channel chromium --unsafe-no-sandbox'
```

Only `tools/` (read-only) and `research/` are mounted, so the container never sees `.env.local` or your home folder.

## Monthly (one named owner)

| Task | How |
|---|---|
| Security floor | Read the Next.js and React security advisories; update `tools/security-floor.json` and its date |
| Playwright | Bump `tools/package.json` to a release at least two weeks old, `npm install --save-exact`, commit the lockfile, `npm run self-test` |
| MCP pins | Same rule for the versions in `.cursor/mcp.json` |
| Kit scan | `node tools/scan-kit.mjs` |

## If something looks wrong

1. Stop the agent. Don't run anything it proposed.
2. Tell the team; keep that capture's `report.md` and `security.json`.
3. Delete the capture folder for that site and don't reuse the reference.
4. If a secret may have been exposed, rotate it (Sanity, Cloudflare, GitHub) and check git history.
5. Run `node tools/scan-kit.mjs` and `node tools/preship-scrub.mjs`.

This kit reduces legal risk; it is not legal advice. Have a lawyer review the cloning model before scaling it.
