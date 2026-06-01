# D9 Post-Deploy Smoke Plan

Run after an approved commit and deploy.

## Routes

- `/scholarships/texas/tarleton-state-university`
- `/scholarships/california/california-state-university-northridge`
- `/providers/loyola-university-chicago`
- `/compare/universities/university-of-massachusetts-amherst-vs-university-of-south-florida`
- `/resources/best-scholarships-texas-international-students`
- `/resources/best-scholarship-websites`

## Checks

- HTTP status is 200.
- No visible `undefined`, `null`, or `NaN`.
- City rent/wage card appears on strict school/provider/compare matches.
- City rent/wage card stays hidden on generic resource pages.
- No wrong city/metro match is visible.
- No best/worst, cheap/expensive ranking, safe/unsafe, or eligibility wording.
- Existing canonical, robots, sitemap, and noindex behavior remains unchanged.
- No Supabase/Auth/Payments behavior is involved.

## Expected D9 Markers

- Visible marker when matched: `City rent and wage context`
- Hidden marker for generic pages: no `City rent and wage context`

## Rollback Notes

D9 is static-file and server-rendered UI only. If needed, rollback is limited to:

- `city_rent_metro_enrichment.json`
- D9 loader/types/index exports
- `CityRentMetroContext`
- D9 UI insertions
- validation/manifest/README/report updates
