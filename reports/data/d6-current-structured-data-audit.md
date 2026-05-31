# D6 — Current Structured Data Audit

**Date:** 2026-05-31  
**Scope:** Enriched public routes + existing JSON-LD helpers

## Existing helpers / components (pre-D6)

| Location | Types | Notes |
|----------|-------|-------|
| `app/layout.tsx` | Organization, EducationalOrganization, WebSite | Global publisher graph |
| `lib/seo/homePageJsonLd.ts` | WebPage | Homepage only |
| `components/seo/HomePageJsonLd.tsx` | WebPage | Homepage renderer |
| `app/resources/[slug]/page.tsx` | BreadcrumbList, BlogPosting, FAQPage | Inline builders |
| `app/essays/[slug]/page.tsx` | BreadcrumbList, Article, FAQPage | Inline builders |
| `app/providers/[id]/page.tsx` | BreadcrumbList, WebPage, Organization, FAQPage | Conditional Organization |
| `app/compare/states/*` | BreadcrumbList, ItemList (hub), WebPage, FAQPage (detail) | Already present |
| `app/compare/universities/*` | BreadcrumbList, ItemList (hub), WebPage, FAQPage (detail) | Already present |
| `app/scholarships/scholarshipListingJsonLd.ts` | WebPage + ItemList `@graph` | Listing pages |
| `lib/scholarships/universityHubJsonLd.ts` | FAQPage only | **Gap:** missing breadcrumb/webPage/itemList |
| `app/scholarships/[[...slugPath]]/layout.tsx` | Scholarship detail graph | Detail pages only |
| `scripts/audit-jsonld-sitemap.ts` | audit tooling | Production monitor |

## Gaps identified

1. **University hub pages** — only FAQPage JSON-LD; missing BreadcrumbList, WebPage, ItemList despite visible list + FAQ.
2. **State scholarship hubs** — ItemList/WebPage present but no BreadcrumbList hierarchy.
3. **Provider pages** — Organization when official source only; no EducationalOrganization when Scorecard school match is shown in UI.
4. **Inline duplication** — resources/essays/providers repeat schema object literals; risk of undefined leaking into JSON-LD.
5. **Dataset/DataCatalog** — not implemented (audit-only per spec).

## D6 actions taken

- Added shared `lib/seo/jsonLd.ts` + `components/seo/JsonLdScript.tsx`
- Refactored resources/essays/providers to shared builders with `pruneJsonLd`
- Expanded university hub JSON-LD bundle
- Added state breadcrumb JSON-LD to state listing graph
- Added EducationalOrganization on provider pages with confident school match
- Added `scripts/seo/validate-jsonld-shapes.ts` + `npm run seo:validate-jsonld`

## Explicitly not added

- Dataset / DataCatalog JSON-LD
- Review / AggregateRating
- Product / Offer / Course / FinancialProduct
- FAQPage where no visible FAQ exists
- Changes to robots/canonical/sitemap/noindex policy
