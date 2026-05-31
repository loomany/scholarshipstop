# D5 — Internal Linking Graph Report

**Date:** 2026-05-31  
**Baseline:** `c71f257`  
**Suggested commit:** `feat(seo): strengthen internal scholarship link graph`

## Architecture

```
lib/external-data/internalLinkGraph.ts
  ├── buildInternalLinkCluster(pageType, …)
  ├── finalizeInternalLinks(links, excludeHref?)
  └── internalLinkTitle(pageType)

components/internal-links/
  ├── InternalLinkCluster.tsx   → graph builder + title
  └── SmartRelatedLinks.tsx     → dedupe + RelatedContextLinks UI

components/content-hub/RelatedScholarshipContextLinks.tsx
  └── D2 resource/essay clusters → SmartRelatedLinks
```

## Files changed (D5 scope)

| File | Change |
|------|--------|
| `lib/external-data/internalLinkGraph.ts` | **New** — centralized link rules |
| `lib/external-data/contentEnrichmentLinks.ts` | Uses `finalizeInternalLinks`; state-essay adds `/scholarships` |
| `lib/external-data/index.ts` | Export graph helpers |
| `components/internal-links/InternalLinkCluster.tsx` | **New** |
| `components/internal-links/SmartRelatedLinks.tsx` | **New** |
| `components/content-hub/RelatedScholarshipContextLinks.tsx` | Wraps `SmartRelatedLinks`, optional `excludeHref` |
| `components/scholarships/ScholarshipStateExternalContextSidebar.tsx` | State link cluster |
| `components/scholarships/ScholarshipUniversityExternalContextSidebar.tsx` | University cluster + optional provider |
| `components/scholarships/UniversityHubPageContent.tsx` | Passes `providerSlug={hub.slug}` |
| `components/compare/CompareExternalStateAffordabilitySection.tsx` | Graph-based links |
| `components/compare/CompareExternalSchoolEnrichmentSection.tsx` | Graph-based links; removed inline helper |
| `components/providers/ProviderExternalSchoolContext.tsx` | Graph-based provider cluster |

## Link titles by page type

| Page type | Title |
|-----------|-------|
| scholarship-state / scholarship-university | Explore related scholarship paths |
| provider | Related scholarship planning pages |
| compare-state-detail | Compare costs and scholarship options |
| compare-university-detail | Useful next steps |
| resource/essay (D2) | Related scholarship context |

## Rules enforced

- Max 6 links per block (`finalizeInternalLinks`)
- No self-links (`excludeHref` on state/university sidebars)
- No duplicate hrefs within a block
- Empty blocks not rendered
- Server-only components (no heavy client JS)
- Generic pages: enrichment blocks hidden (D2 guards unchanged)

## SEO safety

- No edits to `robots.txt`, sitemap, canonical, or noindex policy
- No new URLs generated at scale
- Provider links only on confident matches

## Not in commit scope

- `lib/i18n/*` (unrelated dirty files)
- `reports/seo/*`
- Supabase / auth / payments
