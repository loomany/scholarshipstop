# Stage 2 ES/FR Visual Parity Implementation

Date: 2026-05-18

## Executive Summary

The Spanish and French pilot pages no longer render as generic pilot/article pages. The localized route renderer now dispatches Stage 2 pages by page type:

- Homepage: localized production-style homepage shell.
- Scholarships hub: localized catalog-style shell.
- Essays hub: localized essay command center shell.
- Providers hub: localized provider directory shell.
- Compare hub: localized compare hub shell.
- Resources hub: localized resource hub shell.
- Trust pages: `TrustPageTemplate`.
- Essay guides: `StaticEssayGuidePage`.
- Compare guides: `StaticCompareGuidePage`.

English URLs remain unchanged. No new locales were launched. No `/en` route was created. No scholarship/provider long-tail translations were added. No OpenAI, translation API, Supabase writes, or migrations were used.

## What Was Wrong

Before this pass, most localized Stage 2 routes used `components/i18n/LocalizedPilotPage.tsx` as a generic renderer. That protected the SEO pilot but made `/es` and `/fr` feel visually separate from production English pages:

- Trust pages did not use the production trust template.
- Essay guide pages did not use the production static essay guide template.
- Compare guide pages did not use the production static compare guide template.
- Hubs shared a simplified localized landing layout rather than page-type shells.

## Implementation

### Generic Renderer Replacement

`LocalizedPilotPageView` now routes localized pages into page-type renderers instead of one generic layout:

| Page type | Renderer now used |
|---|---|
| `home` | localized homepage production-style shell |
| `hub:/scholarships` | localized catalog-style shell |
| `hub:/essays` | localized essay command center shell |
| `hub:/providers` | localized provider directory shell |
| `hub:/compare` | localized compare hub shell |
| `hub:/resources` | localized resources hub shell |
| `trust` | `TrustPageTemplate` |
| `essay` | `StaticEssayGuidePage` |
| `compare` | `StaticCompareGuidePage` |

The generic fallback remains available only for safety, not as the main Stage 2 rendering path.

### Production Templates Made Locale-Aware

The following production templates now accept optional localized copy/link helpers while preserving English defaults:

- `components/trust/TrustPageTemplate.tsx`
- `components/essays/StaticEssayGuidePage.tsx`
- `components/compare/StaticCompareGuidePage.tsx`

This keeps English behavior stable while allowing ES/FR routes to reuse the same visual structure, cards, spacing, schema shape, CTA placement, FAQ layout, and article/guide rhythm.

### Localized Links

Localized pages now map internal Stage 2 pilot paths through locale-aware helpers. If a localized target exists, links stay inside `/es/...` or `/fr/...`. If a target is outside the pilot scope, the page does not invent a translated URL.

## Files Changed In This Pass

- `components/i18n/LocalizedPilotPage.tsx`
- `components/trust/TrustPageTemplate.tsx`
- `components/essays/StaticEssayGuidePage.tsx`
- `components/compare/StaticCompareGuidePage.tsx`
- `reports/seo/i18n-stage2-visual-parity-audit-2026-05-18.md`
- `reports/seo/i18n-stage2-visual-parity-implementation-2026-05-18.md`
- `reports/seo/screenshots/i18n-stage2-visual-parity/*`

Note: the broader working tree also contains earlier Stage 1/Stage 2 i18n files and reports from the existing multilingual pilot work.

## Pages Checked

Reference English pages:

- `/`
- `/scholarships`
- `/essays`
- `/providers`
- `/compare`
- `/resources`
- `/essays/examples`
- `/compare/scholarship-vs-grant`

Localized pages:

- `/es`, `/fr`
- `/es/scholarships`, `/fr/scholarships`
- `/es/essays`, `/fr/essays`
- `/es/providers`, `/fr/providers`
- `/es/compare`, `/fr/compare`
- `/es/resources`, `/fr/resources`
- `/es/essays/examples`, `/fr/essays/examples`
- `/es/compare/scholarship-vs-grant`, `/fr/compare/scholarship-vs-grant`

## SEO Rules Preserved

Production smoke check against `http://127.0.0.1:3002` passed:

- English URLs unchanged.
- `/en` returns 404.
- Unsupported locales return 404: `/de`, `/pt`, `/ar`, `/zh-Hans`, `/hi`, `/id`, `/vi`, `/ru`.
- ES/FR pages have self-canonical URLs.
- Hreflang includes only `en`, `es`, `fr`, and `x-default`.
- Localized query pages remain `noindex, follow`.
- `/sitemap.xml` includes only Stage 2 ES/FR locale sitemap documents.
- No translated scholarship long-tail sitemap was added.
- No translated provider detail sitemap was added.

Query checks passed:

| URL | Expected | Result |
|---|---|---|
| `/es/essays?page=2` | `noindex, follow`, canonical `/es/essays` | pass |
| `/fr/essays?page=2` | `noindex, follow`, canonical `/fr/essays` | pass |
| `/es/providers?page=2` | `noindex, follow`, canonical `/es/providers` | pass |
| `/fr/providers?page=2` | `noindex, follow`, canonical `/fr/providers` | pass |
| `/es/compare?page=2` | `noindex, follow`, canonical `/es/compare` | pass |
| `/fr/compare?page=2` | `noindex, follow`, canonical `/fr/compare` | pass |

## Visual QA

Screenshots were saved to:

`reports/seo/screenshots/i18n-stage2-visual-parity/`

Total screenshots: 48

Captured pairs:

- `/`, `/es`, `/fr`
- `/scholarships`, `/es/scholarships`, `/fr/scholarships`
- `/essays`, `/es/essays`, `/fr/essays`
- `/providers`, `/es/providers`, `/fr/providers`
- `/compare`, `/es/compare`, `/fr/compare`
- `/resources`, `/es/resources`, `/fr/resources`
- `/essays/examples`, `/es/essays/examples`, `/fr/essays/examples`
- `/compare/scholarship-vs-grant`, `/es/compare/scholarship-vs-grant`, `/fr/compare/scholarship-vs-grant`

Viewport guard results:

- ES/FR routes checked at 375, 768, 1280, 1366, and 1440 widths.
- English reference routes checked at 375 and 1366 widths.
- No horizontal overflow detected.
- No `/en` links detected.
- No links to unsupported locales detected.
- `lang` attributes are correct for ES/FR.
- `dir` remains `ltr` for ES/FR.

Browser spot check:

- `/es/compare/scholarship-vs-grant` loaded with `lang=es`, `dir=ltr`.
- H1: `Beca vs subvencion` in the page snapshot.
- Compare guide sections were localized.
- No horizontal overflow.
- No `/en` links.

## Mixed-Language Check

Visible ES/FR body text was scanned for common leftover English UI labels such as:

- `Back to home`
- `Find scholarships`
- `Short answer`
- `Quick comparison`
- `Decision checklist`
- `Read disclaimer`
- `In one sentence`
- `Related ScholarshipTop pages`

Result: pass for the checked ES/FR pages.

## Checks

| Check | Result |
|---|---|
| `npx tsx --test lib/i18n/__tests__/*.test.ts` | pass, 32/32 |
| `npx tsc --noEmit` | pass |
| `npm run build` | pass |
| ES/FR viewport overflow guard | pass |
| English reference viewport guard | pass |
| Production SEO smoke | pass |
| `/en` and unsupported locale 404 checks | pass |
| Localized query noindex checks | pass |
| Localized sitemap scope | pass |

## Not Touched

- No auth changes.
- No payment, subscription, Lemon, RLS, or onboarding changes.
- No `app/api/essay/*` or `lib/essay/*` changes.
- No Supabase writes.
- No migrations.
- No OpenAI scripts.
- No translation APIs.
- No new locales.
- No `/en` route.
- No translated scholarship/provider long-tail rollout.

## Remaining After Stage 2

The localized hub pages now use production-style shells and localized UI/explanatory content. They intentionally do not launch translated scholarship/provider long-tail pages or full DB-backed translated listing surfaces. Live scholarship/provider names and factual values can remain in their original form where surfaced, but UI labels and explanatory copy are localized.

Stage 3 should wait until deployment and GSC validation confirm:

- ES/FR canonical selection.
- Hreflang cluster health.
- Locale sitemap discovery.
- First impressions and crawl behavior.
- No unexpected indexing of query or unsupported locale routes.
