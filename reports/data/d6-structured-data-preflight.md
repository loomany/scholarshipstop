# D6 — Structured Data Preflight

**Date:** 2026-05-31  
**Baseline commit:** `e25b5e3` — D5 internal linking graph (live, smoke PASS)

## Git log (last 12)

```
e25b5e3 feat(seo): strengthen internal scholarship link graph
c71f257 feat(seo): expand contextual enrichment links
3b83393 feat(seo): add data-driven insight blocks
d76d94e fix(scholarships): show affordability sidebar on state routes
9d8b62b feat(scholarships): add static affordability sidebars
7e083d0 feat(data): extend enrichment context to localized content
9bd739f feat(data): expand static enrichment to site sections
02027a3 feat(compare): polish external enrichment cards
05d1b56 feat(compare): add static external enrichment data
aafb276 seo: add scholarship route quality policy
e1ab4c1 seo: add RSS discovery signals and fix localized essay sitemap
8ceb105 feat(seo): add RSS stage 1 feeds
```

## Working tree notes

- Unrelated dirty files remain (`lib/i18n/*`, `reports/seo/*`, content drafts) — exclude from D6 commit.
- D5 post-deploy smoke: **PASS**, rollback **no**.

## Preflight checks

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` (pre-D6 baseline) | **PASS** |
| Supabase/Auth/Payments/migrations planned | **no** |
| canonical/robots/sitemap policy planned | **no** |
| New datasets planned | **no** |

## D6 intent

Consolidate JSON-LD builders in `lib/seo/jsonLd.ts`, add missing safe schema on enriched routes, and validate shapes locally — no fake FAQ/review/product schema.
