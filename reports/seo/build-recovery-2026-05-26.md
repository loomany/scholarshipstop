# Build recovery — 2026-05-26

## Failure (intermittent)

`npm run build` failed during static generation with:

```text
TypeError: Cannot read properties of undefined (reading 'locale')
```

Affected `generateMetadata` on localized routes, e.g.:

- `app/[locale]/subscription/page.tsx`
- `app/[locale]/scholarships/[[...slugPath]]/page.tsx`
- `app/[locale]/[[...slugPath]]/page.tsx`
- `app/[locale]/signin/[id]/page.tsx` (shared chunk)

Secondary noise: `PageNotFoundError: Cannot find module for page: /_document` on `/404` and `/500` during the same failed run (cascade).

Full failed log: `reports/seo/build-recovery-failed-log-2026-05-26.txt`

## Relation to P1 noindex patch

**Not caused by** `compareIndexFilters` / `app/compare/page.tsx` logic.

**Contributing interaction:** `scholarshipSlugLayoutMetadata` hub branch emitted `index, follow` from layout without `searchParams` (fixed in same release).

**Root fix:** guard `params?.locale` in localized `generateMetadata` via `resolveStage2PilotLocaleFromParams()`; stop layout from overriding hub pagination metadata.

## Fix

- `lib/i18n/metadataRouteParams.ts` — safe locale resolution + `METADATA_NOT_FOUND`
- Localized `generateMetadata` callers updated (optional `params` during prerender)
- P1 noisy-query noindex (hub pagination + compare `?state=`)
- **Follow-up:** removed `generateMetadata` from `app/scholarships/[[...slugPath]]/layout.tsx` (layout cannot read `searchParams`; its hub metadata overrode page-level pagination `noindex`). Slug metadata now resolves only in `page.tsx`.
- **Hub P1 live gap:** `/scholarships/hub/matches` is served by `app/scholarships/[state]/[university]/page.tsx` (`state=hub`, `university=matches`), not the catch-all. That route called `buildScholarshipHubRouteMetadata` without `searchParams`; fixed by passing `searchParams` there.

## Verification

- `npx tsc --noEmit` — pass
- `npm run test:seo-lib` — 58 pass
- `npm run test:essays-lib` — 6 pass
- `npm run build` (clean `.next`) — pass

Success log: `reports/seo/build-recovery-success-log-2026-05-26.txt`
