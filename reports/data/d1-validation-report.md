# D1 Growth Sprint — Validation Report

**Date:** 2026-05-31

## Automated checks

| Command | Result | Notes |
|---------|--------|-------|
| `npm run data:validate-enrichment` | **PASS** | 6197 schools, 52 states, 2759 cities; 4.88 MB total |
| `npx tsc --noEmit` | **PASS** | No type errors |
| `npm run build` | **PASS** | Compiled, linted, 206 static pages generated |

### Build bundle notes

- Compare state page First Load JS unchanged band (~247 kB route segment)
- No new client chart dependencies
- All new viz components are server components (no `'use client'`)

## Policy / safety

| Check | Result |
|-------|--------|
| Supabase schema / RLS / Auth / Payments | **Unchanged** |
| Canonical / robots / sitemap | **Unchanged** |
| Ranking / listing queries | **Unchanged** |
| Full JSON in HTML | **None added** |
| Public safety copy | Neutral aggregate context only; no safe/unsafe language |

## Local runtime smoke

Attempted HTTP smoke against `localhost:3000` / `3001` after build.

| Observation | Detail |
|-------------|--------|
| Port 3000 | Stale dev server; partial 200 on compare state only |
| Port 3001 (`next start`) | `MODULE_NOT_FOUND` for webpack chunks — likely concurrent dev + prod corrupting `.next` |

**Conclusion:** Build-time static generation succeeded for all target routes. Post-deploy smoke on production/staging recommended (see `d1-post-deploy-smoke-plan.md`).

## Manual review checklist (code)

- [x] `MetricComparisonBars` filters null / undefined / non-finite values
- [x] Generic resource/essay slugs gated by `hasDisplayableContentContext`
- [x] Provider block returns `null` when `matchProviderToSchool` fails
- [x] School compare shows only matched schools; missing school shows dashed empty column
- [x] `DataSourceFooter` includes required source line and optional public-safety note

## Verdict

**PASS** for D1 acceptance criteria (automated validation). Local HTTP smoke **blocked by environment**; not a code regression signal given clean build.
