# D15 URL Inspection Priority List

Date: 2026-06-01  
Tool: Google Search Console → URL Inspection

## Priority 1 — Inspect and request indexing (indexable pages only)

These pages are **indexable** (`index, follow` or default index). Request indexing only if Inspection shows the URL is not on Google or the cached version predates D11–D14 enrichment.

| URL | Why |
|---|---|
| `/resources/medical-scholarships-guide` | D11 medical cluster + D13 copy; **missing from sitemap** — highest discovery priority |
| `/essays/career-goals` | D11 cluster link target + enriched essay guide |
| `/providers/loyola-university-chicago` | D8 provider enrichment live; large structured page |
| `/resources/best-scholarships-texas-international-students` | GEO Texas + international intent; planning context blocks |

### Request indexing checklist

- [ ] Medical scholarships guide — inspect → request if stale/not indexed
- [ ] Career goals essay — inspect → request if stale
- [ ] Loyola provider — inspect → request if stale
- [ ] Texas international students resource — inspect → request if stale

## Priority 2 — Inspect only (do NOT request indexing)

These pages intentionally use **`noindex, follow`**. Inspect to verify Google sees correct robots and rendered enrichment; **never** request indexing.

| URL | Expected robots |
|---|---|
| `/scholarships/texas` | `noindex, follow` |
| `/compare/states/california-vs-texas` | `noindex, follow` |
| `/compare/universities/university-of-massachusetts-amherst-vs-university-of-south-florida` | `noindex, follow` |

### Inspect-only checklist

- [ ] Texas state listing — confirm noindex + D13 sidebar visible in rendered HTML
- [ ] CA vs TX compare — confirm noindex + affordability sections
- [ ] UMass vs USF compare — confirm noindex + single footer (D14 fix)

## Priority 3 — Monitor via sitemap / Performance (no urgent Inspection)

- `/essays/financial-need`
- `/resources/how-to-find-scholarships`
- `/resources/best-scholarship-websites`
- `/scholarships/texas/tarleton-state-university`
- `/scholarships/california/california-state-university-northridge`
- `/compare/states`, `/compare/universities`
- `/providers/alamo-colleges-foundation`

## Important

> **Do not request indexing for URLs that intentionally have noindex.**

State scholarship listings and compare battle pages are discovery/crawl aids for users and internal linking — not index targets under current policy.
