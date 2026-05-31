# D1 Growth Sprint — Preflight

**Date:** 2026-05-31  
**Baseline commit:** `d76d94e` — fix(scholarships): show affordability sidebar on state routes

## Git baseline

Recent history (top 10):

```
d76d94e fix(scholarships): show affordability sidebar on state routes
9d8b62b feat(scholarships): add static affordability sidebars
7e083d0 feat(data): extend enrichment context to localized content
9bd739f feat(data): expand static enrichment to site sections
02027a3 feat(compare): polish external enrichment cards
05d1b56 feat(compare): add static external enrichment data
```

Working tree had unrelated dirty files (i18n, SEO reports, content drafts). D1 work scoped to enrichment UI only.

## Preflight checks

| Check | Result |
|-------|--------|
| `npm run data:validate-enrichment` | **PASS** (40 school duplicate keys, 1 city duplicate — documented warnings) |
| `npx tsc --noEmit` | **PASS** |
| `npm run build` | **PASS** (206 static pages, no type/lint errors) |

## Constraints confirmed

- No new datasets under `data/external/`
- No Supabase / Auth / Payments / migration changes
- No canonical / robots / sitemap policy changes
- No chart.js / recharts; server-only HTML/CSS bars
- No full JSON embedded in HTML
- Ranking / listing logic untouched

## D1 scope

Add lightweight data-viz components and wire into existing enrichment surfaces:

- Compare state / university detail
- Scholarship state / university sidebars
- Provider school context (strict match)
- State-specific resources / essays context card
