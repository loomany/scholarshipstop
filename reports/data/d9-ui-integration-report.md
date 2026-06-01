# D9 UI Integration Report

Generated at: 2026-06-01

## Components Added

- `components/data-viz/CityRentMetroContext.tsx`

## Server Helpers Added

- `lib/external-data/cityRentMetroEnrichment.ts`
- `getCityRentMetroByCityState(city, state)`
- `getCityRentMetroByKey(cityKey)`
- `getRentMetroContextForSchool({ city, state })`
- `getRentMetroContextForProvider({ city, state })`

## Routes Improved

- `/scholarships/[state]/[university]`
  - Adds a compact city rent/wage card when the matched school has a strict city/state row.
- `/providers/[id]`
  - Adds city rent/wage context for providers that strictly match a College Scorecard school row with city/state.
  - Non-school providers without city data remain hidden.
- `/compare/universities/[slug]`
  - Adds compact city rent/wage comparison when either matched school has city context.
  - Each school profile column can show its own compact city context.
- `/resources/[slug]` and `/essays/[slug]`
  - Adds a compact city/rent card only when existing resource/essay context already resolves to a strict school or city.
  - Generic pages remain hidden.

## Copy Policy

Visible copy uses neutral wording only:

- "City rent and wage context"
- "Public rent and wage estimates can help compare cost of attendance and relocation planning."
- "Reference only - not ScholarshipTop rules or guarantees."

No best/worst, cheap/expensive ranking, safe/unsafe, eligibility, or scholarship-fit claims were added.

## Display Rules

- Server-only loaders.
- Strict city/state lookup.
- Duplicate city keys hidden during build.
- Ambiguous city/state lookup returns null.
- No raw Zillow monthly series or full BLS occupation tables in UI.
- Generic resource pages stay clean.

## Files Changed

- `components/data-viz/CityRentMetroContext.tsx`
- `components/data-viz/DataSourceFooter.tsx`
- `components/providers/ProviderExternalSchoolContext.tsx`
- `components/scholarships/ScholarshipUniversityExternalContextSidebar.tsx`
- `components/compare/CompareExternalSchoolEnrichmentSection.tsx`
- `components/content-hub/ExternalReferenceContextCard.tsx`
