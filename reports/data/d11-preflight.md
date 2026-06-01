# D11 Preflight

Date: 2026-06-01

## Current HEAD

`ba9ccae` — `feat(data): add medical scholarship context layer`

## D10 production status

- D10 commit `ba9ccae` is live on production.
- D10 post-deploy smoke: **PASS** (`reports/data/d10-post-deploy-smoke-result.md`).

## Preflight checks

| Check | Result |
|---|---|
| `npm run data:validate-enrichment` | PASS |
| `npm run seo:validate-jsonld` | PASS |
| `npx tsc --noEmit` | PASS |

## Dirty unrelated files

Working tree contains unrelated modified/untracked files outside D11 scope, including:

- `lib/i18n/*`
- `reports/seo/*`
- `data/content/*`
- `.env*` backups
- various stage reports and AI resource drafts

D11 will not stage these files.

## Planned scope boundaries

- No Supabase / Auth / Payments / RLS changes planned.
- No canonical / robots / noindex / sitemap policy changes planned.
- No mass new SEO pages planned.
- No residency / hospital-quality / NPPES / Open Payments raw UI planned.
