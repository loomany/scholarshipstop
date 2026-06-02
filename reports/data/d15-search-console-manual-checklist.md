# D15 Search Console Manual Checklist

Date: 2026-06-01

## Why manual

Automated GSC pull failed:

```
403: User does not have sufficient permission for site 'https://scholarshiptop.com/'
```

Credentials exist locally (`GOOGLE_INDEXING_CLIENT_EMAIL` / `GOOGLE_INDEXING_PRIVATE_KEY`) but the service account is not authorized on the Search Console property (or property URL mismatch). D15 uses manual checklist only — **no code or credential changes**.

## Checklist

### 1. Open Search Console

- Property: `https://scholarshiptop.com/` (URL-prefix) or `sc-domain:scholarshiptop.com` if domain property
- Confirm service account email is added as **Full** or **Owner** if API automation is desired later

### 2. URL Inspection — Priority 1 (request indexing if “URL is on Google” is missing or stale)

| URL | Action |
|---|---|
| `/resources/medical-scholarships-guide` | Inspect → **Request indexing** if updated after D11/D13 and not indexed |
| `/essays/career-goals` | Inspect → **Request indexing** if enriched version not reflected |
| `/providers/loyola-university-chicago` | Inspect → **Request indexing** after D8/D14 enrichment |
| `/resources/best-scholarships-texas-international-students` | Inspect → **Request indexing** if GEO block updates not crawled |

**Do not request indexing** for URLs with intentional `noindex`.

### 3. URL Inspection — Priority 2 (inspect only)

| URL | Action |
|---|---|
| `/scholarships/texas` | Inspect crawl/render; confirm `noindex, follow`; **do not request indexing** |
| `/compare/states/california-vs-texas` | Inspect; confirm `noindex, follow`; **do not request indexing** |
| `/compare/universities/university-of-massachusetts-amherst-vs-university-of-south-florida` | Inspect; confirm `noindex, follow`; **do not request indexing** |

### 4. Performance → Search results → Pages

- Date ranges: **Last 24 hours**, **Last 7 days**, **Last 28 days**
- Filter or search for priority paths (medical guide, career-goals, texas intl resource, loyola provider, tarleton, CSUN)
- Export: clicks, impressions, CTR, average position

### 5. Coverage / Page indexing (if available)

- Check for “Excluded by noindex” on state/compare detail URLs — expected
- Check for “Crawled — currently not indexed” on P1 indexable URLs — action if present

### 6. Sitemap report

- Confirm `sitemap.xml` processed without errors
- Note: medical guide may not appear until added to sitemap in a future change

### 7. Save exports

- Store GSC exports outside repo **or** under `reports/data/` only if no private/account data risk
- Fill `d15-search-console-priority-url-status.csv` manually after export

## Columns to capture manually

```
url, period, clicks, impressions, ctr, avg_position, indexing_status, coverage_issue, last_crawl, notes
```

Periods: `last_24h`, `last_7d`, `last_28d`
