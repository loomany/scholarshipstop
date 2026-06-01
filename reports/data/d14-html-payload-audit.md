# D14 HTML Payload Audit

Date: 2026-06-01

## Checks Performed

| Check | Result |
|---|---|
| Full static JSON filenames in HTML | **None** — no `school_enrichment.json`, `city_rent_metro_enrichment.json`, etc. |
| Raw enrichment arrays embedded | **None** — only selected metric strings rendered |
| 10.58 MB layer in page source | **No** — JSON stays server-side via `loadStaticEnrichment.ts` |
| Giant RSC JSON blobs with enrichment tables | **Not observed** on sampled routes |
| Repeated source footers | **Issue found (pre-fix)** — nested blocks each rendered `DataSourceFooter` |

## Route Samples

### `/compare/universities/university-of-massachusetts-amherst-vs-university-of-south-florida`

| Metric | Value |
|---|---|
| HTML size | 273.9 KB |
| Static JSON file refs | 0 |
| `Reference only` strings (production pre-fix) | 10 |
| `Reference only` strings (local post-fix) | **1** |
| Context blocks | School columns, rent/research bars, link cluster |

### `/scholarships/texas`

| Metric | Value |
|---|---|
| HTML size | ~185 KB |
| Enrichment | State sidebar only (selected highlights + bars) |
| Listing payload | Dominates size |

### `/resources/best-scholarships-texas-international-students`

| Metric | Value |
|---|---|
| HTML size | ~154 KB |
| Enrichment | State context card + D2 links |
| Latency | High variance (cold/cache) |

## Duplicated Blocks (pre-fix)

Nested components each included full `DataSourceFooter`:

- `StateSocialContextBlock`
- `InstitutionResearchContext`
- `CityRentMetroContext`
- `MedicalSchoolContext`
- `PremedTopicContextCard` (on medical guide, alongside planning source note)

Parent sections also rendered a consolidated footer → **2–5 footers per enriched page**.

## D14 Fix

Added optional `showSourceFooter={false}` on nested data-viz blocks; parent sections keep one consolidated footer. Medical guide source section uses inline copy only (removed duplicate `DataSourceFooter`).

## Verdict

**FIXED (footer duplication)** — no full JSON embedding risk; listing/compare HTML weight remains inherent to page type.
