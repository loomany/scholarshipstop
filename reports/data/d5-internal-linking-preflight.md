# D5 — Internal Linking Graph Preflight

**Date:** 2026-05-31  
**Baseline commit:** `c71f257` — `feat(seo): expand contextual enrichment links`

## Git log (last 10)

```
c71f257 feat(seo): expand contextual enrichment links
3b83393 feat(seo): add data-driven insight blocks
d76d94e fix(scholarships): show affordability sidebar on state routes
9d8b62b feat(scholarships): add static affordability sidebars
7e083d0 feat(data): extend enrichment context to localized content
9bd739f feat(data): expand static enrichment data to site sections
02027a3 feat(compare): polish external enrichment cards
05d1b56 feat(compare): add static external enrichment data
aafb276 seo: add scholarship route quality policy
e1ab4c1 seo: add RSS discovery signals and fix localized essay sitemap
```

## Working tree notes

- Many unrelated dirty/untracked files (i18n, SEO reports, content drafts) — **exclude from D5 commit**.
- D5 scope: `components/internal-links/*`, enrichment/compare/scholarship/provider wiring, `lib/external-data/internalLinkGraph.ts`, `lib/external-data/contentEnrichmentLinks.ts`, `reports/data/d5-*`.

## Preflight checks

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | **PASS** |
| Constraints: no Supabase/Auth/migrations | **OK** |
| Constraints: no canonical/robots/sitemap edits | **OK** |
| Constraints: no new datasets | **OK** |

## D5 intent

Centralize internal link rules in `lib/external-data/internalLinkGraph.ts` and render via server-only `InternalLinkCluster` + `SmartRelatedLinks` (3–6 links, dedupe, no self-links).
