# D15 Sitemap / Robots Audit

Date: 2026-06-01  
Production: https://scholarshiptop.com

## robots.txt

```
User-Agent: *
Allow: /
Disallow: /api/

Sitemap: https://scholarshiptop.com/sitemap.xml
Sitemap: https://scholarshiptop.com/rss.xml
Sitemap: https://scholarshiptop.com/rss/resources.xml
Sitemap: https://scholarshiptop.com/rss/essays.xml
```

**Verdict:** PASS — no blocks on priority indexable paths; `/api/` correctly disallowed.

## Sitemap index

`/sitemap.xml` is a sitemap index with buckets:

- `core.xml`, `resources.xml`, `essays-0..46.xml`, `providers.xml`, `categories.xml`
- `seo.xml`, `scholarships-0.xml`, `compare.xml`
- Localized ES/FR sub-sitemaps

All sub-sitemaps fetched successfully except legacy `scholarships.xml` (404 — superseded by `scholarships-0.xml`).

## Priority URL presence

CSV: `reports/data/d15-sitemap-url-presence.csv`

### Indexable — expected in sitemap

| URL | Found | Sitemap bucket | Status |
|---|---|---|---|
| `/resources/medical-scholarships-guide` | **No** | — | **WARN** — indexable static page missing |
| `/essays/career-goals` | Yes | essays-0 | OK |
| `/essays/financial-need` | Yes | essays-0 | OK |
| `/resources/how-to-find-scholarships` | Yes | resources | OK |
| `/resources/best-scholarship-websites` | Yes | resources | OK |
| `/resources/best-scholarships-texas-international-students` | Yes | resources | OK |
| `/scholarships/texas/tarleton-state-university` | Yes | scholarships-0 | OK |
| `/scholarships/california/california-state-university-northridge` | Yes | seo | OK |
| `/compare/states` | Yes | core | OK |
| `/compare/universities` | Yes | core | OK |
| `/providers/loyola-university-chicago` | Yes | providers | OK |
| `/providers/alamo-colleges-foundation` | Yes | providers | OK |

### Noindex policy — should not be promoted via sitemap

| URL | In sitemap | Status | Notes |
|---|---|---|---|
| `/scholarships/texas` (and CA/NY/FL/IL) | **Yes** (seo.xml) | **Note** | Listed despite `noindex, follow` — existing policy; do not change in D15 |
| `/compare/states/california-vs-texas` | No | OK | Matches noindex detail policy |
| `/compare/universities/university-of-massachusetts-amherst-vs-university-of-south-florida` | **Yes** (seo.xml) | **Note** | In sitemap but `noindex, follow` on page — inconsistent with CA-vs-TX; monitor only |

## compare.xml scope

`compare.xml` contains only four static guides (`scholarship-vs-grant`, etc.). State/university battle pages are **not** in `compare.xml`; some appear in `seo.xml` per quality/drip rules.

## Canonical cleanliness

All priority URLs use clean self-canonical `https://scholarshiptop.com/...` with no query params or trailing-slash mismatches observed.

## Verdict

**PASS with warnings**

1. **Critical for discovery:** `/resources/medical-scholarships-guide` is indexable but absent from all sitemaps — recommend sitemap inclusion in a future approved change.
2. **Policy notes (no D15 change):** State `noindex` pages remain in `seo.xml`; one compare detail page is in `seo.xml` while another is not.
