# Thin Scholarship SEO Route Policy Final Report - 2026-05-28

## Executive summary

Implemented a shared scholarship SEO route-quality policy and applied it to metadata and `seo.xml` sitemap inclusion for thin long-tail/filter landing pages.

Known weak examples now receive `noindex, follow` and are excluded from `seo.xml`:

- `/scholarships/california`
- `/scholarships/no-essay`
- `/scholarships/connecticut/high-school/nursing`
- `/scholarships/texas/high-school/arts`

Strong/protected examples remain indexable:

- `/scholarships/engineering`
- `/scholarships/category/stem`
- `/scholarships/category/education`
- `/scholarships/for-students-from/canada/study-in/united-states`

## What was audited

- Scholarship catch-all metadata flow
- Scholarship long-tail preset routing
- Manifest SEO route resolution
- Dynamic SEO manifest entry fallback
- `seo.xml` sitemap builder
- category sitemap behavior
- local production metadata and sitemap output
- RSS Stage 1 feed health

## Route families

Strong/protected:

- scholarship detail pages
- category pages
- curated GOOD manifest SEO routes
- approved cross-country routes
- dedicated provider/university hub routes

Weak/risky:

- dynamic state landings
- dynamic state/topic landings
- dynamic state/degree/topic landings
- dynamic filter combinations
- legacy long-tail pages not promoted for sitemap

## Quality thresholds and rules

- GOOD manifest route with result count > 3: indexable and sitemap eligible.
- Dynamic scholarship filter route without explicit quality approval: noindex and removed from sitemap.
- Legacy long-tail route not promoted for sitemap: noindex and removed from sitemap.
- Query-param or unstable routes: noindex and removed from sitemap.
- Scholarship details, categories, providers, resources, essays, compare, and RSS routes are not governed by this thin landing-page policy.

## Files changed

- `app/scholarships/scholarshipSlugLayoutMetadata.ts`
- `lib/seo/sitemaps.ts`
- `lib/seo/scholarshipSeoQualityPolicy.ts`
- `lib/seo/__tests__/scholarshipSeoQualityPolicy.test.ts`
- `scripts/seo/audit-scholarship-seo-quality.ts`
- `artifacts/seo/scholarship-seo-quality-sample-2026-05-28.json`
- `reports/seo/thin-route-policy-preflight-2026-05-28.md`
- `reports/seo/scholarship-seo-route-family-inventory-2026-05-28.md`
- `reports/seo/scholarship-seo-quality-sampling-2026-05-28.md`
- `reports/seo/scholarship-seo-route-policy-design-2026-05-28.md`
- `reports/seo/scholarship-seo-route-policy-implementation-2026-05-28.md`
- `reports/seo/scholarship-seo-helpful-sections-plan-or-implementation-2026-05-28.md`
- `reports/seo/scholarship-seo-sitemap-validation-2026-05-28.md`
- `reports/seo/scholarship-seo-route-policy-validation-2026-05-28.md`
- `reports/seo/thin-scholarship-seo-route-policy-final-2026-05-28.md`

## Examples before and after

| URL | Before | After |
|---|---|---|
| `/scholarships/california` | 200, `index, follow`, thin SSR, sitemap candidate | 200, `noindex, follow`, exact URL removed from `seo.xml` |
| `/scholarships/no-essay` | 200, `index, follow`, thin SSR | 200, `noindex, follow`, exact URL removed from `seo.xml` |
| `/scholarships/connecticut/high-school/nursing` | 200, `index, follow`, thin SSR, sitemap candidate | 200, `noindex, follow`, exact URL removed from `seo.xml` |
| `/scholarships/texas/high-school/arts` | 200, `index, follow`, thin SSR, sitemap candidate | 200, `noindex, follow`, exact URL removed from `seo.xml` |
| `/scholarships/engineering` | indexable | still `index, follow`, still in `seo.xml` |

## Sitemap impact

`buildSeoSitemapEntries` now respects the shared route-quality policy for:

- manifest paths
- legacy long-tail paths
- state-only RPC rows
- generated programmatic hub rows

The policy removes exact weak URLs from `seo.xml` while preserving curated GOOD manifest routes and approved cross-country routes.

## Metadata impact

`generateScholarshipSlugLayoutMetadata` now applies the policy before returning metadata for scholarship listing routes. Weak pages return `robots: { index: false, follow: true }`.

## RSS impact

RSS Stage 1 routes were not changed. Local regression check:

- `/rss.xml`: 200
- `/rss/resources.xml`: 200
- `/rss/essays.xml`: 200
- `/rss/compare.xml`: 200
- `/rss/categories.xml`: 200

All returned `application/rss+xml; charset=utf-8`.

## Validation

- `npm run build`: pass.
- `npx tsx --test lib/seo/__tests__/scholarshipSeoQualityPolicy.test.ts`: pass, 5 tests.
- Local sitemap/metadata smoke: pass.
- `npm run test:seo-lib -- --test-name-pattern "scholarship SEO route quality"`: existing unrelated `llmsFullGeoPolicy` expectation failure; new policy tests passed.

## What was not changed

- No auth changes.
- No payments, billing, Lemon Squeezy, checkout changes.
- No onboarding changes.
- No Supabase RLS changes.
- No DB schema or migration changes.
- No env changes.
- No account/dashboard/profile changes.
- No private essay page changes.
- No private API changes.
- No RSS Stage 1 route changes.
- No mass AI content generation.
- No new route families.

## Remaining risks

- Medium manifest pages such as `/scholarships/engineering` can still use richer SSR content later, even though they are explicitly curated GOOD routes.
- University/provider scholarship hubs should get a separate quality gate if future audits find thin pages there.
- Cross-country pages remain controlled by their existing manifest status; future GEO expansion should continue respecting manual-review/noindex statuses.

## Next recommended stages

1. Improve reusable SSR content for curated GOOD manifest routes that are indexable but under 1500 visible words.
2. Add a provider/university hub quality gate if production samples show thin pages.
3. Build a scheduled sitemap/noindex consistency monitor for scholarship SEO route families.
4. Use the policy when designing future `/rss/scholarships.xml`, `/rss/providers.xml`, and `/rss/geo.xml`.

## Commit

Commit hash: recorded after commit creation in the final response.
