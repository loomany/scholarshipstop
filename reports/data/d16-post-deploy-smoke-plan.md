# D16 Post-Deploy Smoke Plan

Date: 2026-06-01  
Run after D16 is deployed to production.

## URLs to verify

| URL | Check |
|---|---|
| `/sitemap.xml` | Index loads; includes `resources.xml` |
| `/sitemaps/resources.xml` | Contains `https://scholarshiptop.com/resources/medical-scholarships-guide` |
| `/resources/medical-scholarships-guide` | HTTP 200; self-canonical; no `noindex`; D11/D13 content visible |

## Automated check

```bash
npx tsx scripts/seo/verify-sitemap-priority-urls.ts --prod
```

Expected for medical guide:

```
found_in_sitemap=yes
sitemap_bucket=resources
result=ok
```

## GSC follow-up

1. URL Inspection on `/resources/medical-scholarships-guide`
2. Request indexing if not on Google or stale vs D11–D14 enrichment
3. Complete `d16-gsc-access-fix-checklist.md` if API access still missing

## Pass criteria

- Medical guide in live `resources.xml`
- No robots/canonical regression on smoke URLs
- No new visible undefined/null/NaN tokens

## Fail / rollback

If sitemap breaks or wrong URLs added: revert D16 commit and revalidate `resources.xml` size/parse.
