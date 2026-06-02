# D15 Search Console Summary

Date: 2026-06-01

## Data available

**No** — automated Search Analytics API returned **403 Forbidden** (service account not permitted on GSC property).

## What was attempted

```bash
dotenv -e .env.local -- npx tsx reports/data/_d15-gsc-pull.ts
```

Error: insufficient permission for `https://scholarshiptop.com/`.

## Manual path

Use `reports/data/d15-search-console-manual-checklist.md` to pull:

- Last 24 hours / 7 days / 28 days performance by page
- URL Inspection status for P1 and P2 URLs
- Coverage notes for noindex vs indexable pages

## Expected signals to watch (hypothesis until GSC export)

| URL | Hypothesis |
|---|---|
| `/resources/medical-scholarships-guide` | New cluster page — may have low/zero impressions until indexed + sitemap fix |
| `/essays/career-goals` | Established essay guide — likely some impressions; check CTR after D13 copy |
| `/resources/best-scholarships-texas-international-students` | Long-tail GEO — impressions possible on “Texas international scholarships” |
| `/providers/loyola-university-chicago` | Provider long-tail — variable impressions |
| State `/scholarships/texas` etc. | May appear in GSC from crawl even with noindex — clicks unlikely to be strategic |
| Compare detail noindex pages | May get impressions from internal links; leave noindex unless policy changes |

## Next step

Grant GSC access to indexing service account **or** run manual export and append to `d15-search-console-priority-url-status.csv`.
