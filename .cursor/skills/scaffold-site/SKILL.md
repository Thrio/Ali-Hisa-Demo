---
name: scaffold-site
description: >-
  Runs /scaffold after kickoff, refs and design are approved — Next.js App Router
  + TypeScript static export, Tailwind v4 with the approved tokens, scripts
  (dev, build, lint, typecheck, verify), security headers, standalone Sanity Studio
  for cms only, Cloudflare Workers assets config. Produces a running empty shell.
---

# Scaffold (`/scaffold`)

Gate: `node tools/check-project.mjs --stage scaffold` (kickoff, refs and design approved). Rules: `stack.mdc`, `security.mdc`. Facts that move (Next, Cloudflare, Sanity): check current docs (Context7 / Cloudflare docs MCP) — never scaffold from memory.

## Steps

1. **App in a temp folder.** `create-next-app` refuses a folder that already has files (plan.md, tools/, brief/ …): generate it in `$TMPDIR/<slug>` (TypeScript, App Router, Tailwind, ESLint, `src/`, no git), then copy it into the project **without overwriting any existing file**. Turn off defaults that need a server (e.g. Cache Components) — the site is `output: "export"`.
2. **Exact installs only:** `npm install <name>@<version> --save-exact` (never hand-edit versions). `next` and React Server Components packages at or above `tools/security-floor.json`; eslint on the major `eslint-config-next` supports. `motion`, `lucide-react`, `clsx`, `tailwind-merge`, `class-variance-authority` as needed.
3. **Scripts** in `package.json`: `dev`, `build`, `lint`, `typecheck` (`tsc --noEmit`), `verify` (`npm run lint && npm run typecheck && npm run build`). Never a deploy or push script.
4. **`next.config`**: `output: "export"`; landing/multipage `images: { unoptimized: true }` (use files sized for their slot — check-site warns on oversized images); cms: the Sanity CDN loader. Never `dangerouslyAllowSVG`.
5. **Tokens:** copy `design/tokens.css` into `src/app/globals.css` unchanged, then `node tools/check-project.mjs --sync-motion-tokens` → `src/lib/motion-tokens.ts`.
6. **Folders:** `src/components/{blocks,ui,motion}`, `src/content/` (landing/multipage: `site.ts` + one module per page), `research/{peers,build}`. Stubs: `ScrollReveal`, `PendingText`, `ImageSlot` (specs in `code-conventions.mdc`); `AgeGate` only when plan Regulated = yes (`site-chrome.mdc`). Forms → `src/worker.ts`.
7. **Security headers** — `public/_headers` (static export ignores `next.config` headers; `_headers` covers static assets, not Worker responses — set the same headers in `src/worker.ts` responses):
   ```
   /*
     Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'<TS><CF>; style-src 'self' 'unsafe-inline'; img-src 'self' data:<SANITY>; font-src 'self'; connect-src 'self'<CFC>; frame-src <TS_FRAME>'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'
     Strict-Transport-Security: max-age=31536000; includeSubDomains
     X-Content-Type-Options: nosniff
     Referrer-Policy: strict-origin-when-cross-origin
     Permissions-Policy: camera=(), microphone=(), geolocation=()
   ```
   Add only the hosts in use: Turnstile `<TS>` = ` https://challenges.cloudflare.com` and `frame-src https://challenges.cloudflare.com`; Web Analytics `<CF>` = ` https://static.cloudflareinsights.com`, `<CFC>` = ` https://cloudflareinsights.com`; cms `<SANITY>` = ` https://cdn.sanity.io`. `'unsafe-inline'` is needed because a static export ships inline scripts and nonces need a server.
8. **SEO shell** (`seo-site`): `metadataBase`, default metadata from the content source, `src/app/sitemap.ts`, `src/app/robots.ts`.
9. **Cloudflare:** `wrangler.jsonc` with `assets.directory = "./out"`; with a form: `main = "src/worker.ts"` and `assets.run_worker_first = ["/api/*"]`. Secrets never in this file. OpenNext only when plan.md Decisions logs a server need. Do not deploy.
10. **cms only — Sanity:** `studio/` with the Sanity CLI, schemas from the confirmed content model (one block per Blueprint band archetype), `CONTENT_SOURCE=mock` fixtures in `src/sanity/mock/` (`layer-cms.mdc`). Create the real project only after the content model is confirmed.
11. **`.env.example`** — names only, for this layer (see the comments in the file); real values in `.env.local` (git-ignored) and Cloudflare.
12. **Verify:** `npm run verify` clean; `npm run dev` serves `/`; `out/` written; `npm ci` passes on a clean copy of `package.json` + `package-lock.json`; `node tools/preship-scrub.mjs` no BLOCKER; cms: `cd studio && npm exec sanity -- schema validate` (the Studio's own pinned `sanity`, never `npx sanity`).
13. **Commit. Never push** — the coordinator pushes.

## Report (≤ 10 lines)

```
**Done:** scaffold · Next <v> · Tailwind <v> · motion <v> · <layer extras>
**Evidence:** npm run verify ✓ · out/ ✓ · npm ci clean copy ✓ · preship no BLOCKER
**Tokens:** src/app/globals.css ← design/tokens.css · src/lib/motion-tokens.ts generated
**Needs you:** nothing
**Next:** /build — home band 1.
```
