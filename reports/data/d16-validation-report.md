# D16 Validation Report

Date: 2026-06-01

## Checks

| Command | Result |
|---|---|
| `npm run data:validate-enrichment` | **PASS** |
| `npm run seo:validate-jsonld` | **PASS** (13 blocks / 10 cases) |
| `npx tsc --noEmit` | **PASS** |
| `npm run build` | **PASS** |
| `npm run test:seo-lib` | **PASS** for D16 tests; 1 pre-existing failure in `llmsFullGeoPolicy.test.ts` (unrelated) |
| `dedicatedResourceGuideSitemap.test.ts` | **PASS** (2 tests) |
| `npx tsx scripts/seo/verify-sitemap-priority-urls.ts --prod` | **PASS** with `pending_deploy` for medical guide |

## Code change validation

- `buildDedicatedResourceGuideSitemapEntries()` includes `/resources/medical-scholarships-guide`
- Dedupes against `STATIC_SCHOLARSHIP_GUIDES` (no double entries for overlapping slugs)
- Also includes other dedicated resource guides from `RESOURCE_GUIDE_SLUGS` not in manifest

## SEO policy

| Policy | Changed |
|---|---|
| robots | **no** |
| canonical | **no** |
| noindex | **no** |
| sitemap index structure | **no** (only `resources` bucket entries added) |

## Production pre-deploy

Live `resources.xml` does **not** yet include medical guide until D16 is deployed.

## Rollback

Revert commit; sitemap returns to prior state (medical guide absent). No data migration.
