# Scholarship Detail Sitemap Fix — 2026-06-02

## Root Cause

Production `/sitemaps/scholarships-0.xml` returned `200` but had `0` URLs because scholarship detail sitemap generation depended on the private `scholarships` table plus full `DETAIL_SELECT`. When that query failed or was unavailable in production, `buildScholarshipsSitemapEntries()` caught the error and returned an empty sitemap silently.

The first attempted public-safe replacement used too narrow a select from `scholarships_safe_listing`, so `getScholarshipDetailIndexPolicy()` could not see fields like `eligibility_text`, `summary_long`, and `official_source_name`. That excluded indexable detail pages. The final fix uses a minimal but sufficient public-safe select from `scholarships_safe_listing`.

## Files Changed

- `lib/seo/sitemaps.ts`
- `lib/seo/scholarshipDetailSitemapPolicy.ts`
- `lib/seo/__tests__/scholarshipDetailSitemapPolicy.test.ts`
- `scripts/seo/debug-scholarship-detail-sitemap.ts`

## Before / After Counts

| Stage | Before | After |
|---|---:|---:|
| Production `/sitemaps/scholarships-0.xml` loc count | 0 | not deployed yet |
| Local debug raw active candidates | n/a | 20,461 |
| Local debug after safe candidate prefilter | n/a | 9,889 |
| Local debug policy indexable | n/a | 8,447 |
| Local rendered `/sitemaps/scholarships-0.xml` loc count | 0 / 2,080 during earlier attempts | 8,447 |

## Local Rendered Sitemap Check

Local production server check after `npm run build`:

| Check | Result |
|---|---|
| First cold `/sitemaps/scholarships-0.xml` | 24.661s |
| Second warm `/sitemaps/scholarships-0.xml` | 52ms |
| `<loc>` count | 8,447 |

Cold generation is still DB-bound and above the ideal 5-10s target locally, but the route now uses `unstable_cache` with `SITEMAP_REVALIDATE_SECONDS`, so repeated requests are fast. Production should be re-smoked after deploy.

## Sample Included URLs

Included in local rendered `/sitemaps/scholarships-0.xml`:

- `/scholarships/nbcc-minority-fellowship-program-for-addictions-counselors-nbcc-minority-fellowship-program`
- `/scholarships/kerrie-ervin-realtor-scholarship-qvfaom6ijbul`

First debug-included URLs:

- `/scholarships/the-city-law-school-deans-scholarship-for-academic-excellence-2025-city-university-of-london-law-sc`
- `/scholarships/dolores-ennis-of-the-flint-area-education-foundation-scholarship-vqmlejgmszcn`
- `/scholarships/leonard-and-marion-krall-scholarship-vlxk65dcdy45`
- `/scholarships/deanna-lynn-potts-scholarship-idyxcoulholw`
- `/scholarships/irene-marguerite-mcleod-postgraduate-scholarship-at-university-of-waterl-irene-marguerite-mcleod-postgrad`

## Sample Excluded URLs

Excluded from local rendered `/sitemaps/scholarships-0.xml`:

- `/scholarships/sage-de-i-scholarship-award-sage-deandi-scholarship-award`
- `/scholarships/elizabeth-garde-national-scholarship-elizabeth-garde-national-scholar`
- `/scholarships/girls-for-gaming-scholarship-girls-for-gaming-scholarship`
- `/scholarships/john-kitt-memorial-aact-scholarship-fund-john-kitt-memorial-aact-scholars`

Debug excluded examples with reasons:

- `tuition-fee-waivers-for-masters-program-in-economics-finance-2523`: `missing_or_expired_deadline`, `source_needs_confirmation`
- `seg-foundation-scholarship-754`: `missing_or_expired_deadline`, `source_needs_confirmation`
- `fashion-design-visual-communication-management-scholarships-3341`: `missing_or_expired_deadline`, `source_needs_confirmation`

## Validation Commands

| Command | Result |
|---|---|
| `npm run test:seo-lib` | PASS |
| `npx tsc --noEmit` | PASS |
| `npm run seo:validate-jsonld` | PASS |
| `npm run build` | PASS |

Additional checks:

- `npx dotenv-cli -e .env.local -- npx tsx scripts/seo/debug-scholarship-detail-sitemap.ts` PASS.
- Local rendered sitemap check PASS for inclusion/exclusion samples.

## No-Essay Behavior

No-essay behavior stayed unchanged:

- `/scholarships/no-essay`: `index, follow`, self-canonical, present in `/sitemaps/seo.xml`.
- `/resources/no-essay-scholarships-guide`: `noindex, follow`, canonical to `/scholarships/no-essay`.
- `/essays/no-essay-scholarships`: `noindex, follow`, canonical to `/scholarships/no-essay`.

## Notes Before Commit/Deploy

- Do not commit until approved.
- After deploy, run production smoke again and create/update `reports/seo/seo-production-smoke-scholarship-sitemap-fix-2026-06-02.md`.
- PASS requires production `/sitemaps/scholarships-0.xml` to return nonzero locs and include sampled indexable detail URLs.
