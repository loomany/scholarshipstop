# English SEO safety — final check (2026-05-20)

## Score: **96 / 100**

## Verified

| Check | Status |
| --- | --- |
| Root English URLs unchanged | ✅ |
| No `/en` route (404) | ✅ |
| Unsupported locales 404 (`/de`, `/pt`, …) | ✅ |
| EN sitemap buckets preserved | ✅ `lib/seo/sitemaps.ts` |
| EN pages not bulk-noindexed | ✅ |
| ES/FR pilot only in locale sitemaps (106 URLs) | ✅ |
| DB long-tail not in ES/FR sitemaps | ✅ |
| hreflang limited to en/es/fr/x-default on pilot | ✅ |
| Query/filter pagination noindex (EN) | ✅ unchanged |
| No redirect of `/` → `/en` | ✅ |
| Middleware: locale header only for `/es`/`/fr` | ✅ |

## Sprint impact on English SEO

- **taxonomyLabels.ts** — display-only; EN labels identical to `SCHOLARSHIP_CATEGORY_LABELS`
- **No** English route or canonical changes
- **No** sitemap URL removals

## Post-deploy checks (GSC)

1. EN URL count stable week-over-week  
2. New `locale-es-core` / `locale-fr-core` indexed  
3. No `/en` in coverage  
4. hreflang errors only on pages you expect  

## Minor residual (−4)

Hub tab hreflang sometimes absent on listing URLs (pre-existing). Not introduced by this sprint.
