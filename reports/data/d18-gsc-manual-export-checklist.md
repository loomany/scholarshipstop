# D18 GSC Manual Export Checklist

Date: 2026-06-01  
Use when API returns **403** (current state).

## Prerequisites

- Access to Google Search Console for **scholarshiptop.com**
- No credentials stored in repo

## Steps

### A. Fix API access (recommended once)

1. Open [Google Search Console](https://search.google.com/search-console)
2. Select property: **scholarshiptop.com** (URL-prefix or domain property)
3. Go to **Settings → Users and permissions**
4. Add the indexing service account email (from local `.env.local` only)
5. Grant **Full** access (or sufficient for Performance + URL Inspection)
6. Verify property URL matches code expectation: `https://scholarshiptop.com/`
7. Re-run locally: `dotenv -e .env.local -- npx tsx reports/data/_d18-gsc-pull.ts`

### B. Manual Performance export

1. Open Search Console → **Performance → Search results**
2. Date range: **Last 28 days** (repeat for **Last 7 days** if needed)
3. Dimension: **Pages**
4. Filter or search for each priority URL:

| Path |
|---|
| `/resources/medical-scholarships-guide` |
| `/essays/career-goals` |
| `/resources/best-scholarships-texas-international-students` |
| `/providers/loyola-university-chicago` |
| `/resources/how-to-find-scholarships` |
| `/resources/best-scholarship-websites` |

5. Record for each URL: **Clicks**, **Impressions**, **CTR**, **Average position**
6. Optional: switch dimension to **Queries** filtered by page → record top 3 queries per URL
7. Export CSV from GSC UI if available
8. **Do not commit** export if it contains account emails or private identifiers
9. Fill `reports/data/d18-gsc-performance-export.csv` manually:

```csv
url,period,clicks,impressions,ctr,average_position,top_query,gsc_start,gsc_end
```

### C. URL Inspection (same session)

For each P1 URL (see `d18-url-inspection-actions.md`):

1. Search Console → URL Inspection
2. Enter full URL
3. Check: **URL is on Google** / coverage state / last crawl
4. If stale or not indexed → **Request indexing** (indexable pages only)

### D. Save artifacts

- Manual CSV → `reports/data/d18-gsc-performance-export.csv` (aggregate stats only)
- Inspection notes → append to `d18-gsc-summary.md` after export

## Security

- Never commit `.env*` or service account JSON keys
- Never paste private keys into reports
