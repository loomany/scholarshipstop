# Cross-country SEO preview (Stage 1)

Read-only aggregate from `scholarships_safe_listing` (active rows). No production routes or sitemap changes.

**Generated:** 2026-05-05T23:50:59.197Z

## Summary counts

| Metric | Value |
|--------|------:|
| Scholarship rows scanned | 17259 |
| Unique applicant×host pairs (count ≥ 1) | 1870 |
| Theoretical catalog grid (unique applicants × unique hosts seen anywhere) | 17927 |
| **Pairs in this report (count ≥ 5)** | **308** |
| Pairs 5–19 | 151 |
| Pairs 20–49 | 13 |
| Pairs 50+ | 144 |
| Pairs ≥ 5 with host **US** | 68 |
| Pairs ≥ 5 with host **DE** (Germany cluster) | 137 |

## Cluster warnings

### Germany host cluster

Many distinct applicant countries share very similar **study-in-Germany** inventory (DAAD-style breadth). Treat **DE** host URLs as a **quality/relevance review** batch before Ads or mass indexing — not because counts are low, but because **templates and SERP differentiation** get harder.

### USA study destination cluster

Host **US** pairs are the natural **English-language acquisition** set. Expect the strongest **SEO + Ads** overlap here; still require manual QA so cards reinforce **Eligible + Study in** signals.

## Top 20 SEO candidates (by totalCount, among pairs ≥ 5)

| # | Count | URL | Applicant | Host | Tier |
|---|------:|-----|-----------|------|------|
| 1 | 8983 | `/scholarships/for-students-from/united-states/study-in/united-states` | United States | United States | priority_candidate |
| 2 | 182 | `/scholarships/for-students-from/canada/study-in/canada` | Canada | Canada | priority_candidate |
| 3 | 170 | `/scholarships/for-students-from/united-kingdom/study-in/united-kingdom` | United Kingdom | United Kingdom | priority_candidate |
| 4 | 150 | `/scholarships/for-students-from/canada/study-in/united-states` | Canada | United States | priority_candidate |
| 5 | 117 | `/scholarships/for-students-from/united-states/study-in/germany` | United States | Germany | priority_candidate |
| 6 | 102 | `/scholarships/for-students-from/ukraine/study-in/germany` | Ukraine | Germany | priority_candidate |
| 7 | 98 | `/scholarships/for-students-from/vietnam/study-in/germany` | Vietnam | Germany | priority_candidate |
| 8 | 98 | `/scholarships/for-students-from/indonesia/study-in/germany` | Indonesia | Germany | priority_candidate |
| 9 | 96 | `/scholarships/for-students-from/colombia/study-in/germany` | Colombia | Germany | priority_candidate |
| 10 | 96 | `/scholarships/for-students-from/malaysia/study-in/germany` | Malaysia | Germany | priority_candidate |
| 11 | 96 | `/scholarships/for-students-from/thailand/study-in/germany` | Thailand | Germany | priority_candidate |
| 12 | 96 | `/scholarships/for-students-from/philippines/study-in/germany` | Philippines | Germany | priority_candidate |
| 13 | 95 | `/scholarships/for-students-from/united-kingdom/study-in/germany` | United Kingdom | Germany | priority_candidate |
| 14 | 94 | `/scholarships/for-students-from/laos/study-in/germany` | Laos | Germany | priority_candidate |
| 15 | 94 | `/scholarships/for-students-from/myanmar-burma/study-in/germany` | Myanmar (Burma) | Germany | priority_candidate |
| 16 | 94 | `/scholarships/for-students-from/mexico/study-in/germany` | Mexico | Germany | priority_candidate |
| 17 | 94 | `/scholarships/for-students-from/kazakhstan/study-in/germany` | Kazakhstan | Germany | priority_candidate |
| 18 | 94 | `/scholarships/for-students-from/georgia/study-in/germany` | Georgia | Germany | priority_candidate |
| 19 | 94 | `/scholarships/for-students-from/serbia/study-in/germany` | Serbia | Germany | priority_candidate |
| 20 | 93 | `/scholarships/for-students-from/egypt/study-in/germany` | Egypt | Germany | priority_candidate |

## Top 10 Google Ads candidates

Priority tier, host in **US / GB / CA / AU**, sorted by count.

| # | Count | URL | Notes |
|---|------:|-----|-------|
| 1 | 8983 | `/scholarships/for-students-from/united-states/study-in/united-states` | yes_after_QA |
| 2 | 182 | `/scholarships/for-students-from/canada/study-in/canada` | yes_after_QA |
| 3 | 170 | `/scholarships/for-students-from/united-kingdom/study-in/united-kingdom` | yes_after_QA |
| 4 | 150 | `/scholarships/for-students-from/canada/study-in/united-states` | yes_after_QA |
| 5 | 81 | `/scholarships/for-students-from/mexico/study-in/united-states` | yes_after_QA |
| 6 | 70 | `/scholarships/for-students-from/united-kingdom/study-in/united-states` | yes_after_QA |
| 7 | 65 | `/scholarships/for-students-from/united-states/study-in/canada` | yes_after_QA |
| 8 | 64 | `/scholarships/for-students-from/australia/study-in/australia` | yes_after_QA |

## Recommended first batch (heuristic)

High host US + priority tier + major applicant markets (GB, CA, IN, MX, PH, NG):

- `/scholarships/for-students-from/canada/study-in/united-states` — 150 — Scholarships for Canadian Students to Study in the USA
- `/scholarships/for-students-from/mexico/study-in/united-states` — 81 — Scholarships for Mexican Students to Study in the USA
- `/scholarships/for-students-from/united-kingdom/study-in/united-states` — 70 — Scholarships for UK Students to Study in the USA

## Recommended noindex / skip groups

- **Skip entirely (not in CSV/JSON pair list):** pairs with count **< 5** (1562 pairs exist below threshold — not exported).
- **5–19:** `low_count_noindex` — keep **noindex**, **not in sitemap** until catalog depth improves.
- **20–49:** `candidate_after_QA` — **manual QA** then optional index + sitemap **only after approve**.
- **50+:** `priority_candidate` — still **noindex in preview**; production index/sitemap **only after approve**.

## Artifacts

- `docs/seo-cross-country-preview.json` — full rows + copy + samples  
- `docs/seo-cross-country-preview.csv` — summary columns for spreadsheets  
- This report — `docs/seo-cross-country-report.md`

## QA notes column

All rows default `qaNotes=pending` in CSV/JSON. Fill after manual review.
