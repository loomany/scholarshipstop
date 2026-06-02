# D15 Preflight

Date: 2026-06-01  
Stage: Search Console / Indexing / Crawl Feedback Loop (audit only)

## Current HEAD

```
b50e801 perf(seo): reduce enriched page payload risk
```

Prior live stack: D1, D2, D5, D6, D8, D9, D10, D11, D13, D14.

## D14 smoke

**PASS** (see `reports/data/d14-post-deploy-smoke-result.md`). Rollback: no.

## Validations (this run)

| Command | Result |
|---|---|
| `npm run data:validate-enrichment` | **PASS** |
| `npm run seo:validate-jsonld` | **PASS** (13 blocks / 10 cases) |
| `npx tsc --noEmit` | **PASS** |

## Working tree

Dirty unrelated local files remain (not part of D15):

- `lib/i18n/*` (modified, out of scope)
- `reports/seo/*` (modified, out of scope)
- `data/content/*` (untracked, out of scope)
- `.env.local.bak-*` (untracked, out of scope)

No D15 code changes planned.

## SEO policy

No canonical / robots / noindex / sitemap policy changes planned for D15.

## GSC credentials probe

`dotenv -e .env.local -- npx tsx reports/data/_d15-gsc-pull.ts` → **403** (service account lacks permission on `https://scholarshiptop.com/`). Manual Search Console checklist required.

## Audit helpers (local only, not product code)

- `reports/data/_d15-run-checks.ts`
- `reports/data/_d15-gsc-pull.ts`
