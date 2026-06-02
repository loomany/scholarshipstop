# AI Resources Stage 6A.7 — UI hotfix deploy + production smoke

**Date:** 2026-05-21  
**Article:** https://scholarshiptop.com/resources/best-scholarship-websites  
**Commit:** `ff0675a` — `fix(resources): clean AI article rendering`  
**Push range:** `4094320..ff0675a` → `origin/main`

## Guardrails

| Action | Run? |
|--------|------|
| Generation / batch 29–30 | No |
| Publish other posts | No |
| Supabase / DB writes | No |
| ES/FR translations | No |
| Env files committed | No |

## Staged files (16)

| Area | Path |
|------|------|
| Resource page | `app/resources/[slug]/page.tsx` |
| TOC | `lib/content-hub/resourceArticleBodyToc.ts`, `__tests__/resourceArticleBodyToc.test.ts` |
| Related / IQ | `lib/content-hub/filterResourceArticleRelatedScholarships.ts` |
| Localized resources | `components/content-hub/LocalizedResourceArticlePage.tsx` |
| CTA | `components/content-hub/ContentHubScholarshipCta.tsx` |
| Related UI | `components/content-hub/ContentHubArticleMatchedScholarships.tsx` |
| Award format | `app/scholarships/scholarshipsData.ts`, `components/scholarships/ScholarshipCard.tsx` |
| Content source | `data/content/polished/best-scholarship-websites-2026-05-21.md` |
| Scripts | `scripts/ai-resources-stage6a2-polish-post.ts`, `scripts/ai-resources-stage6a5-revalidate-pilot.ts` |
| Reports | `ai-resources-stage6a5-*`, `ai-resources-stage6a6-*`, regenerated `ai-resources-stage6a2-*` preview/QA |

**Excluded:** i18n/IQ/middleware, unrelated `dist/`, env files.

## Pre-commit QA

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | Pass |
| `npm run build` | Pass |

## Deploy

- **Revalidate:** `scripts/ai-resources-stage6a5-revalidate-pilot.ts` — OK (`/resources/best-scholarship-websites`, `/resources`)
- **Deploy lag:** ~2 minutes after push before new UI appeared in production HTML

## Production smoke (post-deploy)

| Check | Result | Notes |
|-------|--------|-------|
| Article URL 200 | Pass | |
| `/resources?cat=ai` 200 | Pass | Pilot visible in hub |
| `/es/...` / `/fr/...` | Pass (404) | No translations |
| No wide `<table>` | Pass | Comparison cards only |
| Comparison cards visible | Pass | ScholarshipTop, Fastweb, Watch out for, etc. |
| No horizontal table scroll | Pass | No table element |
| No `In 3–5 bullets` | Pass | |
| No `Type ???` | Pass | IQ CTA removed |
| No `resource-article-iq-cta` | Pass | |
| No `deadline passed` related | Pass | Expired filtered / section empty |
| No `$9.000` | Pass | None on page |
| `$9,000` formatting | N/A | No related amount cards on page after filter; dot format absent |
| TOC: no FAQ questions | Pass | H2-only TOC |
| TOC: no Quick Summary | Pass | |
| TOC: no CTA heading | Pass | |
| CTA not H2 in body | Pass | `ContentHubScholarshipCta` uses `<p>` |
| Internal links | Pass | 15+ `/scholarships` hrefs in HTML |
| Canonical / meta | Pass | |

**TOC entries (production, post-deploy):**

1. Quick Answer  
2. Best Scholarship Websites Compared (2026)  
3. ScholarshipTop: Pros, Limitations, and When to Use Official Pages  
4. How We Evaluated Scholarship Databases in 2026  
5. How to Find Scholarships Online Without Wasting Time  

Platform comparison subsections (`### ScholarshipTop`, etc.) correctly omitted from TOC (H3 only).

## Git status after push

- **HEAD / origin/main:** `ff0675a`
- **Uncommitted noise remains:** `app/layout.tsx`, `middleware.ts`, i18n audits, unrelated `dist/`, IQ WIP files

## Summary

UI hotfixes and comparison-card source are live on production for the pilot AI resource article. DB body was already updated in 6A.5/6A.6; this deploy applied rendering fixes only.
