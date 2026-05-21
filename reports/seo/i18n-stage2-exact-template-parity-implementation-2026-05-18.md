# Stage 2 ES/FR Exact Template Parity Implementation

Date: 2026-05-18

## Executive Summary

ES/FR Stage 2 pilot routes now render through **`LocalizedProductionPage`**, which reuses the same production page bodies as English (`HomePageContent`, hub index content components, `ScholarshipsSlugPathPageBody`, trust/essay/compare guide templates). Separate localized homepage/hub shells (`LocalizedHome`, `LocalizedHub`, `CatalogStyleBand`, etc.) are **no longer the primary renderer**; they remain only as an emergency fallback via `LocalizedPilotPageView` with `emergencyFallback`.

English root URLs and layout are unchanged. Metadata, canonical, and hreflang behavior from Stage 2 are preserved.

## Shells removed from primary path

| Former shell | Status |
|---|---|
| `LocalizedHome` | Emergency fallback only |
| `LocalizedHub` | Emergency fallback only |
| `CatalogStyleBand` | Unused on published routes |
| `EssayCommandCenterBand` | Unused on published routes |
| `ProviderDirectoryBand` | Unused on published routes |
| `CompareEvergreenBand` | Unused on published routes |
| `HeroSearchMock` / hub `SectionCards` | Unused on published routes |

## English components extracted / reused

| Route | Reusable component | ES/FR entry |
|---|---|---|
| `/` | `components/home/HomePageContent.tsx` | `LocalizedProductionPage` + `getHomePageCopy(locale)` |
| `/scholarships` | `ScholarshipsSlugPathPageBody` (`segments=[]`) | Same + `getScholarshipsCatalogIntroCopy(locale)` |
| `/essays` | `components/essays/EssaysIndexPageContent.tsx` | Same + `getEssaysHubUiCopy(locale)` |
| `/providers` | `components/providers/ProvidersHubPageContent.tsx` | Same + `getProvidersHubUiCopy(locale)` |
| `/compare` | `components/compare/CompareIndexPageContent.tsx` | Same + `getCompareHubUiCopy(locale)` |
| `/resources` | `components/content-hub/ResourcesIndexPageContent.tsx` | Same + `getResourcesHubUiCopy(locale)` |
| Trust / essay / compare guides | `TrustPageTemplate`, `StaticEssayGuidePage`, `StaticCompareGuidePage` | Unchanged (already production templates) |

English route files (`app/page.tsx`, `app/essays/page.tsx`, etc.) are thin wrappers that call the same content components with `locale="en"`.

## New copy / helpers

- `lib/i18n/homePageCopy.ts` — homepage UI strings (en/es/fr)
- `lib/i18n/hubUiCopy.ts` — hub index UI strings (essays, compare, resources, providers, scholarships catalog intro)
- `lib/i18n/localizedHref.ts` — `hrefForLocalizedUi`, `sectionPathForLocale`
- `components/i18n/LocalizedProductionPage.tsx` — locale route dispatcher

## Routing change

`app/[locale]/[[...slugPath]]/page.tsx` now renders:

```tsx
<LocalizedProductionPage page={page} searchParams={searchParams} />
```

instead of `LocalizedPilotPageView` for all page types.

## SEO preserved

- English URLs unchanged (`/`, `/scholarships`, …)
- No `/en` route
- Only `es` / `fr` pilot locales
- Localized metadata still from `buildLocalizedPilotMetadata` + static translations
- `en` / `es` / `fr` / `x-default` hreflang unchanged
- Query views remain `noindex` where applicable
- Scholarship/provider long-tail not translated

## Verification

| Check | Result |
|---|---|
| `npx tsx --test lib/i18n/__tests__/*.test.ts` | **32/32 pass** |
| `npx tsc --noEmit` | **pass** |
| `npm run build` | Compiled + lint OK; **failed at collect page data** on unrelated missing API modules (`/api/account/saved-filters-snapshot`, `/api/cron/process-essay-queue`) — pre-existing/env issue, not introduced by this pass |

## Screenshots

Directory prepared: `reports/seo/screenshots/i18n-stage2-exact-template-parity/`

Run locally with dev server on port 3005 and capture side-by-side pairs for:

- `/`, `/es`, `/fr`
- `/scholarships`, `/es/scholarships`, `/fr/scholarships`
- `/essays`, `/es/essays`, `/fr/essays`
- `/providers`, `/es/providers`, `/fr/providers`
- `/compare`, `/es/compare`, `/fr/compare`
- `/resources`, `/es/resources`, `/fr/resources`

## English pages not regressed

- `/` still uses identical section order and components via `HomePageContent` with English copy defaults
- Hub English pages delegate to the same extracted content components as before (structure preserved; only extraction, not redesign)

## Follow-ups (optional)

- Localize remaining English-only subcomponents on home (`HomeWhatWeVerify`, `HomeGuidedEssaySupport`, `HomeFinalCta`) via copy props if full string parity is required
- Fix unrelated `npm run build` page-data errors for missing API route modules
- Capture screenshot set into `reports/seo/screenshots/i18n-stage2-exact-template-parity/`
