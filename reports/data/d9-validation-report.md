# D9 Validation Report

Generated at: 2026-06-01

## Static Data Validation

Command: `npm run data:validate-enrichment`

Result: PASS

- `city_rent_metro_enrichment.json`: 2,692 rows, 2,733.0 KB
- Total static enrichment size: 10.27 MB
- No `C:\dev\adek` paths in final JSON
- No secrets-like strings detected
- Manifest row counts match
- Duplicate `city_key` count: 0
- Raw monthly Zillow date columns: none
- Large per-row arrays: none

Known existing warnings remain documented:

- School name/state duplicate keys in `school_enrichment.json`
- `Bayamon|PR` duplicate in `city_affordability.json`
- Provider nonprofit ambiguous name/state keys hidden by loader

## SEO JSON-LD

Command: `npm run seo:validate-jsonld`

Result: PASS

- 13 JSON-LD sample blocks validated across 10 cases.
- No Review, AggregateRating, Product, Offer, or Course schema added.

## Typecheck

Command: `npx tsc --noEmit`

Result: PASS

## Build

Command: `npm run build`

Result: PASS

- Next.js app build completed.
- 206 static pages generated.

## Local Smoke

Method: local `next start` server plus Playwright visible-text checks.

Result: PASS

| Route | Status | City card | Expected | Visible undefined/null/NaN |
|---|---:|---|---|---|
| `/scholarships/texas/tarleton-state-university` | 200 | yes | yes | no |
| `/scholarships/california/california-state-university-northridge` | 200 | yes | yes | no |
| `/providers/loyola-university-chicago` | 200 | yes | yes | no |
| `/compare/universities/university-of-massachusetts-amherst-vs-university-of-south-florida` | 200 | yes | yes | no |
| `/resources/best-scholarships-texas-international-students` | 200 | no | no | no |
| `/resources/best-scholarship-websites` | 200 | no | no | no |

## Policy Checks

- Supabase/Auth/Payments changes: no
- Migrations: no
- Canonical/robots/noindex/sitemap policy changes: no
- Raw customer package files copied: no
- Large JSONL/GZ/CSV committed: no
