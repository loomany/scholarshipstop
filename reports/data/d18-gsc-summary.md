# D18 GSC Summary

Date: 2026-06-01

## Data availability

**No automated Performance data** — Search Analytics API returned **403 Forbidden**.

Manual export required per `d18-gsc-manual-export-checklist.md`.

## What we know without GSC

| Signal | Source | Finding |
|---|---|---|
| Indexing readiness | D18 production fetch | 6/6 P1 URLs **ok** — indexable, sitemap present |
| Medical guide sitemap | D16 post-deploy | In `resources.xml` |
| GSC API | D18 pull | **Blocked** — permission gap |

## Hypothesis (pre-export)

Until Performance data is exported, prioritize by **indexing readiness + D17 ranking**:

| URL | Hypothesis |
|---|---|
| Medical guide | Newly in sitemap; may have low/zero impressions until crawled + indexed |
| Career goals | Established essay; likely some impressions if indexed |
| Texas intl resource | Long-tail GEO; title/meta refresh candidate ("2024 Guide") |
| Loyola provider | Provider long-tail; enrichment live |
| How-to-find / best-websites | Mature resources; monitor CTR after export |

## After manual export

Update this file with:

- 7-day and 28-day clicks/impressions/CTR/position per URL
- Top queries per page
- Pages with impressions > 50 and CTR < 2% → title/meta polish queue
- Pages with zero impressions after 14 days post-Inspection → internal link boost

## Next action

1. Complete manual export OR fix service account permission
2. Run URL Inspection on P1 URLs
3. Fill `d18-gsc-performance-export.csv`
