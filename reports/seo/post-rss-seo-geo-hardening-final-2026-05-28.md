# Post-RSS SEO/GEO/AI Visibility Hardening - Final Report - 2026-05-28

## Executive summary

- RSS Stage 1 production smoke: pass.
- RSS discovery signals: implemented locally, ready for deploy.
- Sitemap/canonical/noindex P0: localized static essay sitemap 404/noindex mismatch fixed locally.
- Thin-page audit: completed; thin long-tail scholarship SEO pages should remain excluded from RSS and need route-policy cleanup.
- Structured data audit: completed; sampled JSON-LD parses cleanly with no new spam schema added.
- Internal linking audit: completed; strongest issue is thin page depth, not global linking.
- llms.txt AI visibility hardening: RSS feed map added.
- Build: pass.
- Push: not performed in this task.
- Commit: pending at report creation.

## What was checked

- Production RSS endpoints and crawler user-agent access.
- Production sitemap index and all child sitemap documents.
- Representative public page families: homepage, resources, essays, compare, categories, providers, scholarship details, cross-country GEO, long-tail scholarship SEO, localized essay pages.
- HTML signals: status, canonical, robots, title, meta description, H1, SSR text length, internal links.
- Structured data: JSON-LD script count, parsed schema types, parse errors.
- `robots.txt`, `llms.txt`, RSS route output, and local discovery signals.

## What changed

| Area | Files |
|---|---|
| RSS discovery in HTML | `app/layout.tsx` |
| RSS references in robots | `app/robots.ts` |
| Localized static essay sitemap mismatch | `app/[locale]/essays/[slug]/page.tsx` |
| AI/GEO discovery docs | `public/llms.txt`, `public/llms-full.txt` |
| Reports | `reports/seo/post-rss-*.md`, `reports/seo/rss-*.md`, `reports/seo/sitemap-*.md`, `reports/seo/thin-*.md`, `reports/seo/structured-*.md`, `reports/seo/internal-*.md`, `reports/seo/llms-*.md` |

## What was not changed

- No auth changes.
- No payment, pricing, checkout, billing, or Lemon Squeezy changes.
- No onboarding changes.
- No Supabase RLS, schema, migrations, or DB changes.
- No private account/dashboard/profile route changes.
- No private user essay page changes.
- No private API endpoint changes.
- No mass generation of new SEO pages.
- No broad SEO policy rewrite.
- No Cloudflare/env changes.
- No RSS Stage 2 implementation for scholarships/providers/GEO.

## RSS production status

Production RSS feeds:

| Feed | Status | Content-Type | Live items | Duplicate links/GUIDs | Forbidden URLs |
|---|---:|---|---:|---:|---:|
| `/rss.xml` | 200 | `application/rss+xml; charset=utf-8` | 500 | 0 | 0 |
| `/rss/resources.xml` | 200 | `application/rss+xml; charset=utf-8` | 926 | 0 | 0 |
| `/rss/essays.xml` | 200 | `application/rss+xml; charset=utf-8` | 2269 | 0 | 0 |
| `/rss/compare.xml` | 200 | `application/rss+xml; charset=utf-8` | 5 | 0 | 0 |
| `/rss/categories.xml` | 200 | `application/rss+xml; charset=utf-8` | 11 | 0 | 0 |

Crawler user agents tested against `/rss.xml`: CCBot, GPTBot, Googlebot, and Bingbot all returned 200.

## Sitemap/canonical/noindex findings

- Sitemap index: 200.
- Child sitemaps: 71 documents checked, all returned 200.
- P0 issue found: localized static essay sitemap URLs were present but returned 404/noindex on production.
- Fix applied: `app/[locale]/essays/[slug]/page.tsx` now serves localized static pilot essay pages when the slug exists.
- Local validation after fix: `/es/essays/examples`, `/fr/essays/checklist`, `/es/essays/no-essay-scholarships`, and `/fr/essays/no-essay-scholarships` return 200 with clean localized canonicals and real H1s.

## Thin page findings

Strong:

- Homepage, resources, essays, compare, categories, provider pages, scholarship details, and approved cross-country pages.

Weak:

- `/scholarships/california`: 268 text chars, 1 internal link.
- `/scholarships/no-essay`: 603 text chars, 9 internal links.
- `/scholarships/connecticut/high-school/nursing`: 294 text chars, 1 internal link.
- `/scholarships/texas/high-school/arts`: 285 text chars, 1 internal link.

Decision:

- Do not include these long-tail pages in RSS.
- Handle with a later route-policy cleanup: noindex/remove from sitemap until useful content and links exist, or improve the reusable template with real data.

## Structured data findings

- Sampled JSON-LD parse errors: 0.
- Global Organization/WebSite schema is present.
- BreadcrumbList is present on sampled public hubs and detail pages.
- Article schema exists on static essay and compare detail guides.
- Category pages expose WebPage, ItemList, FAQPage, and breadcrumbs.
- Provider pages expose Organization-style data, breadcrumbs, and FAQ.
- No new structured data was added because existing coverage is already broad and safe.

## Internal linking findings

- Strong link graph: homepage, resources hub/articles, essays hub, categories, rich provider pages.
- Medium: compare detail pages, generated essay guides, scholarship detail sample, cross-country pages.
- Weak: thin long-tail scholarship SEO pages.
- No footer link clouds or mass links were added.

## llms.txt / AI visibility changes

- `llms.txt` now maps the five RSS feeds and states they are public, indexable discovery surfaces only.
- `llms-full.txt` now includes RSS in the SEO coordination model.
- Private/account/API/checkout/dashboard/user-specific routes remain explicitly excluded.

## Remaining risks

- Existing resource article descriptions in live RSS still include some older verification-first phrasing. This is content-source cleanup, not RSS infrastructure breakage.
- Thin long-tail scholarship SEO routes remain indexable until a route-quality policy is implemented.
- Large localized scholarship detail sitemap groups need a separate sampled QA pass.
- Empty essay sitemap shards return 200; this is not a P0 crawl break but could be cleaned later.

## Next recommended stages

1. Post-deploy smoke for RSS alternates, robots RSS references, llms RSS section, and localized essay URL fixes.
2. Thin scholarship SEO route policy: noindex/remove from sitemap or improve real content for weak long-tail routes.
3. Content-source cleanup for old verification-first resource descriptions now exposed through RSS.
4. RSS Stage 2 candidate validator for scholarships/providers/GEO.
5. Structured data rich-results QA on top URLs.
6. Cloudflare/Railway log review for CCBot/GPTBot/RSS hits.

## Validation summary

- `npm run build`: pass.
- Local production server checks: pass.
- RSS Stage 1 validator against local production server: pass.
- RSS Stage 1 validator against production: pass.
- `git diff --check`: pass.
- `npm run lint`: blocked by existing Next.js interactive ESLint setup prompt; no ESLint config was created.

## Commit and push status

- Commit hash: pending.
- Push status: not pushed.
