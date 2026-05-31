# D6 — Structured Data Cleanup Report

**Date:** 2026-05-31  
**Suggested commit:** `feat(seo): add structured data for enriched pages`

## New shared layer

| File | Purpose |
|------|---------|
| `lib/seo/jsonLd.ts` | Builders: BreadcrumbList, WebPage, Article/BlogPosting, FAQPage, Organization, EducationalOrganization, ItemList; `pruneJsonLd`, `validateJsonLdShape` |
| `components/seo/JsonLdScript.tsx` | Server JSON-LD renderer with null-safe block filtering |
| `scripts/seo/validate-jsonld-shapes.ts` | Local shape validation for representative pages |
| `lib/seo/__tests__/jsonLd.test.ts` | Unit tests for prune/build helpers |

## Route changes

| Route | Schema added/improved |
|-------|----------------------|
| `/resources/[slug]` | Refactored to shared Article/Breadcrumb/FAQ builders |
| `/essays/[slug]` | Refactored to shared Article/Breadcrumb/FAQ builders |
| `/providers/[id]` | Shared builders + **EducationalOrganization** when Scorecard school match |
| `/scholarships/[state]` | **BreadcrumbList** added to listing `@graph` |
| `/scholarships/[state]/[university]` | **BreadcrumbList, WebPage, ItemList** added alongside visible FAQ |

## Unchanged (already compliant)

- Compare hubs/detail pages (BreadcrumbList / ItemList / WebPage / conditional FAQPage)
- Global layout Organization/WebSite graph
- Scholarship detail layout JSON-LD
- robots/canonical/sitemap/noindex policy

## Skipped by design

- Dataset / DataCatalog JSON-LD
- Review / AggregateRating
- Product / Offer / Course schema
- FAQPage on pages without visible FAQ
- Localized route duplicates (English routes prioritized in D6 scope)

## npm script

```bash
npm run seo:validate-jsonld
```
