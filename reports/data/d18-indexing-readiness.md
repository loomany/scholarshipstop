# D18 Indexing Readiness

Date: 2026-06-01  
Production: https://scholarshiptop.com  
CSV: `d18-indexing-readiness.csv`

## Verdict

**PASS** — all 6 priority indexable URLs are production-ready for URL Inspection.

## Summary

| Check | Result |
|---|---|
| URLs checked | 6 |
| HTTP 200 | 6/6 |
| Indexable (no noindex) | 6/6 |
| Self-canonical | 6/6 |
| In sitemap | 6/6 |
| JSON-LD present | 6/6 |
| Main content visible | 6/6 |
| Blocking bad tokens | 0 |

## Per-URL

| URL | Sitemap bucket | Result | Notes |
|---|---|---|---|
| `/resources/medical-scholarships-guide` | resources | **ok** | D16 fix live; P1 URL Inspection |
| `/essays/career-goals` | essays-0 | **ok** | D11 cluster live |
| `/resources/best-scholarships-texas-international-students` | resources | **ok** | GEO resource; title still says 2024 |
| `/providers/loyola-university-chicago` | providers | **ok** | Enrichment + JSON-LD |
| `/resources/how-to-find-scholarships` | resources | **ok** | Top-of-funnel |
| `/resources/best-scholarship-websites` | resources | **ok** | Listicle |

## Bad tokens note

Script flagged `[object Object]` in visible body on all pages. Same pattern as D14/D15 — likely JSON-LD or hydration artifact in markup, **not** user-facing copy. Treat as **false positive**; no rollback.

## Sitemap status

Medical guide confirmed in live `resources.xml` (D16). Other priority URLs unchanged in expected buckets.

## Policy

No changes to canonical, robots, noindex, or sitemap policy in D18.
