# Stage 2 ES/FR Exact Template Parity Audit

Date: 2026-05-18

## Summary

ES/FR Stage 2 routes were rendered through `LocalizedPilotPageView`, which used **separate localized shells** (`LocalizedHome`, `LocalizedHub`, `CatalogStyleBand`, `EssayCommandCenterBand`, `ProviderDirectoryBand`, `CompareEvergreenBand`) instead of the same production components as English. Trust, essay guide, and compare guide routes already used production templates with locale props.

## Audit Table

| English route | English component | ES/FR component (before fix) | Exact same template? | Difference found | Fix required |
|---|---|---|---|---|---|
| `/` | `app/page.tsx` (inline home sections) | `LocalizedHome` in `LocalizedPilotPage.tsx` | **no** | Different hero (2-col + search mock), section order, max-width, no stats/trust/workflow/preview sections | Use `HomePageContent` |
| `/scholarships` | `ScholarshipsSlugPathPageBody` (segments `[]`) | `LocalizedHub` + `CatalogStyleBand` | **no** | Generic cards/search mock vs real catalog shell, filters, listing | Use `ScholarshipsSlugPathPageBody` |
| `/essays` | `app/essays/page.tsx` | `LocalizedHub` + `EssayCommandCenterBand` | **no** | Simplified cards vs full command center, toolbar, grid, pagination | Use `EssaysIndexPageContent` |
| `/providers` | `ProvidersHubPageContent` | `LocalizedHub` + `ProviderDirectoryBand` | **no** | Generic trust cards vs directory grid, toolbar, methodology blocks | Use `ProvidersHubPageContent` |
| `/compare` | `app/compare/page.tsx` | `LocalizedHub` + `CompareEvergreenBand` | **no** | Static guide cards only vs evergreen section + matchup grid + toolbar | Use `CompareIndexPageContent` |
| `/resources` | `app/resources/page.tsx` | `LocalizedHub` (generic cards) | **no** | Simplified hub vs resources toolbar, static guides, article grid | Use `ResourcesIndexPageContent` |
| `/about` | `TrustPageTemplate` | `TrustPageTemplate` (via pilot) | **yes** | Locale props only | Verify visually |
| `/essays/examples` | `StaticEssayGuidePage` | `StaticEssayGuidePage` (via pilot) | **yes** | Locale props only | Verify visually |
| `/compare/scholarship-vs-grant` | `StaticCompareGuidePage` | `StaticCompareGuidePage` (via pilot) | **yes** | Locale props only | Verify visually |

## Shells to retire as primary renderer

- `LocalizedHome`
- `LocalizedHub`
- `CatalogStyleBand`
- `EssayCommandCenterBand`
- `ProviderDirectoryBand`
- `CompareEvergreenBand`
- `HeroSearchMock` / `SectionCards` (hub-specific)

These may remain as **emergency fallback** only for unpublished pilot paths.

## Target architecture

```
app/[locale]/[[...slugPath]]/page.tsx
  → LocalizedProductionPage
      home     → HomePageContent(locale, copy)
      hubs     → same *PageContent as English + hubUiCopy
      trust    → TrustPageTemplate (existing)
      essay    → StaticEssayGuidePage (existing)
      compare  → StaticCompareGuidePage (existing)
```

Allowed differences: language text, metadata, canonical, hreflang, localized links, `lang`.

Forbidden: layout, spacing, section order, cards, CTA placement, max-width, grid, simplified shells.
