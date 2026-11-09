---
name: seo-site
description: >-
  Professional launch SEO for every layer (content modules or Sanity, Cloudflare) — metadata,
  sitemap/robots, JSON-LD, crawl/index hygiene, and Pre-ship SEO audit. Use when
  implementing SEO, reviewing meta/schema, or before Pre-ship / launch SEO checks.
---

# SEO site

Launch-ready technical + on-page SEO for **this** stack. Not ongoing SEO marketing (see Out of Scope).

Hard locks: `seo.mdc`. Perf floor: `design.mdc`. Forms/NAP chrome: `site-chrome.mdc`.

## When

- Scaffold / shell: wire `metadataBase`, default metadata, `sitemap.ts`, `robots.ts`
- After the content model is confirmed: page `seo` + site default (`src/content/site.ts` or Sanity `siteSettings.defaultSeo`) → `generateMetadata`
- Before Pre-ship (after `design-qa`, or with it if user asks)
- User asks for SEO, meta tags, schema, sitemap, or “is this indexable?”

## Gate

1. Real client project — not the source kit.
2. No blocking `[REQUIRED]` for routes under review (or note TBD URLs).
3. Prefer production / preview URL for final audit; localhost OK for wiring checks.
4. Languages / NAP / primary goal from `plan.md`.

Report Blockers for failed gates. Fix only after approval unless user said “implement SEO.”

## Scope

In: metadata, canonical, OG/Twitter · sitemap + robots · JSON-LD (allowed types) · crawl/index hygiene · image alt + heading order · hreflang when multi-language. Out unless the user expands: content strategy, link building, blogging, paid search, programmatic location pages.

## Implement (build-time)

Items 1, 3, and 4 are wired by `scaffold-site`; verify rather than duplicate. Order with the `build-page` shell when possible:

1. **`metadataBase`** + root defaults from `src/content/site.ts` (landing/multipage) or `siteSettings.defaultSeo` (cms/shop).
2. **Per-route `generateMetadata`** — page/collection `seo` with fallbacks; unique title/description.
3. **`src/app/sitemap.ts`** — all indexable routes (static routes + Sanity slugs on cms).
4. **`src/app/robots.ts`** — allow public; disallow preview paths if any (the Studio is not on the site).
5. **JSON-LD** — Organization or LocalBusiness + WebSite; BreadcrumbList on nested routes. JSON-LD only.
6. **Canonical** absolute URLs; `noIndex` honored when set.
7. **Multi-language** → hreflang + matching sitemap locales per `plan.md`.

## Audit (Pre-ship)

Home + each key page + one collection item. Checks (each is Blocker when missing on a public host):

- Crawl / index: sitemap lists indexable URLs only · robots allows public, blocks preview paths · canonical absolute · no accidental noindex · drafts noindex.
- On-page: unique title (~60) + description (~155) per URL · one h1, sensible heading order · primary CTA linked · real alt (empty when decorative).
- Social / schema: OG title, description, image resolve · JSON-LD valid, NAP matches `site.ts` / `siteSettings` · no FAQPage / HowTo on commercial pages.
- Stack: `metadataBase` = production host (or noted deferred) · LCP / CLS / INP shared with design-qa · no orphan indexable routes.

## Report

Triage: **Blocker / High / Medium / Nit**. Evidence = URL + element/field. Don’t soft-pass missing sitemap on a public host.

Report (≤ 10 lines):

```markdown
**Done:** SEO review of <URL> · Blockers <n> · High <n>
**Issues:** <one line each: severity · URL · element/field>
**Schema:** <types present>
**Gaps:** <missing meta or copy-lock gaps, or "none">
Next: <fix the first Blocker | tick the Pre-ship SEO gate>
```

## Done when

Zero Blockers on crawl/index, metadata and required JSON-LD · High items fixed or waived in `plan.md` · Pre-ship SEO row ticked (or the defer noted under Ops).
