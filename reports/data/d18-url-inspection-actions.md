# D18 URL Inspection Actions

Date: 2026-06-01  
Tool: Google Search Console → URL Inspection

## Priority 1 — Inspect and request indexing if stale/not on Google

Only for **indexable** pages. Request indexing **only** if Inspection shows URL is not on Google or cached version predates D11–D16 enrichment.

| URL | Why | Checklist |
|---|---|---|
| `/resources/medical-scholarships-guide` | D16 sitemap fix; flagship medical cluster | [ ] Inspect [ ] Request if not indexed/stale |
| `/essays/career-goals` | D11 cluster + enriched essay | [ ] Inspect [ ] Request if not indexed/stale |
| `/resources/best-scholarships-texas-international-students` | GEO Texas + international intent | [ ] Inspect [ ] Request if not indexed/stale |
| `/providers/loyola-university-chicago` | D8 enrichment live; provider long-tail | [ ] Inspect [ ] Request if not indexed/stale |

### P1 execution order

1. **Medical guide** — highest priority (new sitemap inclusion)
2. **Career goals essay** — cluster hub link target
3. **Texas international resource** — GEO + title refresh candidate
4. **Loyola provider** — enrichment validation in SERP

## Priority 2 — Inspect only (do NOT request indexing)

These URLs intentionally use **`noindex, follow`**.

| URL | Expected robots | Action |
|---|---|---|
| `/scholarships/texas` | `noindex, follow` | Inspect crawl/render only |
| `/compare/states/california-vs-texas` | `noindex, follow` | Inspect only |
| `/compare/universities/university-of-massachusetts-amherst-vs-university-of-south-florida` | `noindex, follow` | Inspect only |

### P2 checklist

- [ ] Confirm Google sees `noindex, follow` in rendered HTML
- [ ] Confirm enrichment blocks visible (state sidebar / compare sections)
- [ ] **Never** click "Request indexing"

## Important

> **Do not request indexing for URLs that intentionally have noindex.**

## Post-Inspection notes (fill manually)

| URL | Verdict | Last crawl | Action taken | Date |
|---|---|---|---|---|
| `/resources/medical-scholarships-guide` | | | | |
| `/essays/career-goals` | | | | |
| `/resources/best-scholarships-texas-international-students` | | | | |
| `/providers/loyola-university-chicago` | | | | |

## Related

- Indexing readiness: `d18-indexing-readiness.csv` (all P1 **ok**)
- Manual GSC export: `d18-gsc-manual-export-checklist.md`
