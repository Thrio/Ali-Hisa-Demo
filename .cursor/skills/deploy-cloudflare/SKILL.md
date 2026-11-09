---
name: deploy-cloudflare
description: >-
  Runs /deploy — only with the coordinator's go-ahead — static export on
  Cloudflare Workers assets (+ the form Worker), env and secrets, preview URL,
  custom domain, publish → deploy hook (cms), production smoke test incl. CSP,
  Lighthouse on production, then the client handoff export.
---

# Deploy to Cloudflare (`/deploy`)

## Gate (all, or stop)

1. The coordinator's go-ahead is in `PROGRESS.md` (deploy row) — never in tests or pilot arms.
2. `/launch` is clean: `preship-scrub --audit --launch` no BLOCKER, `copy-check` clean, `scan-kit` no HIGH, `check-site --serve out --launch` no BLOCKER.
3. **`public/_peer/` is deleted and every stand-in replaced.** No exception: shipping reference media needs a written license from the rights holder, logged in plan.md Ops — client acceptance is not a license.
4. plan.md Ops: domain, repo and Host set to live (CMS too on cms/shop).

Never put secrets in `wrangler` config or git. Never push code — the coordinator pushes; Workers Builds deploys from the repo.

## Steps

1. Check current Cloudflare docs (Cloudflare Docs MCP) — Workers static assets, Workers Builds, deploy hooks. Not from memory.
2. `npm run verify` locally; `out/` written.
3. Variables and secrets in Cloudflare: build-time public values (site URL, Turnstile site key, Sanity project/dataset for cms); Worker secrets (Turnstile secret, provider key if any); `send_email` binding to the verified address; rate-limit binding. Names match `.env.example`.
4. First deploy to the **preview URL**. Check `/`, every key page, a collection item, `sitemap.xml`, `robots.txt`, the 404, and that `public/_headers` arrives (response headers).
5. Custom domain + DNS: apex and `www` behaviour decided once, HTTPS enforced, `metadataBase` = the live host.
6. cms: create the Workers Builds deploy hook, add it as the Sanity webhook (the URL is a secret, kept only there); publish a test edit and time the rebuild. Record it in plan.md Decisions.
7. Analytics: Cloudflare Web Analytics (cookieless) unless plan.md says otherwise; its hosts are in the CSP.
8. **Production smoke test:** conversion paths (call / WhatsApp / form end to end to the test inbox), spam traps, 404, mobile nav, age gate (if any), reduced motion. `check-site` runs on loopback only, so on production open the browser console instead: **no CSP violations, no errors**.
9. Lighthouse on production, mobile, median of 3 (Chrome DevTools MCP); floor by animation level (`design.mdc`). Failing → cut in the `design.mdc` order or log the waiver.
10. Update plan.md (Ops live URL, image path, Pre-ship rows, status Launched) and `PROGRESS.md`.

## Handoff

`node tools/handoff-export.mjs <dir>` → a new repo with the site only (+ `HANDOFF.md`: accounts, env names, how to edit) → `node tools/preship-scrub.mjs --handoff <dir>` → no BLOCKER → the client gets that repo. Never `research/`, `references/` (it lists other clients), `brief/` or kit files.

## Report (≤ 10 lines)

```
**Done:** live at <url> · preview <url> · adapter: Workers static assets (+ form Worker)
**Evidence:** smoke test ✓ (conversion · forms · 404 · nav · age gate · reduced motion) · console: no CSP errors
**Lighthouse (prod, mobile, median 3):** P <n> · A <n> · BP <n> · SEO <n> · LCP · CLS · INP
**cms:** deploy hook → rebuild in <n> min · **Handoff:** export checked, no BLOCKER
**Needs you:** 1. Send the handoff repo and HANDOFF.md to the client [ok]
**Next:** handoff to the client.
```
