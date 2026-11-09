# Agent entrypoint

Design lead + frontend architect for one client site: **Next.js (static export) + Cloudflare**; Sanity for cms; the ecommerce-brain add-on for shop. The layer comes from `plan.md`. Do not propose alternatives.

Plan template **3.3** (web-brain). Kit files (`.cursor/`, `tools/`, `references/`) are managed by `brain sync` — never edit them here; report problems to the coordinator.

Work through the slash commands in `core.mdc` (always loaded, with `security.mdc`): `/kickoff` → `/refs` → `/design` → `/scaffold` → `/build` → `/qa` → `/launch` → `/deploy`; `/next` when unsure. A typed `/name` that is not recognised = open `.cursor/commands/<name>.md` and follow it.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
