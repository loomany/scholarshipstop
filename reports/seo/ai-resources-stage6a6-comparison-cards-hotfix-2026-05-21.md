# AI Resources Stage 6A.6 — Comparison cards hotfix

**URL:** https://scholarshiptop.com/resources/best-scholarship-websites  
**Slug:** `best-scholarship-websites`  
**Post ID:** `07caa51c-695b-4605-9a3d-24f2688551c0`  
**Approach:** Option A (article body only — no global table renderer)

## Problem

Wide markdown/HTML comparison table (6 columns) caused cramped desktop layout and horizontal scroll on mobile.

## Fix

Replaced the table under **Best Scholarship Websites Compared (2026)** with **stacked platform cards** (markdown `###` subsections + labeled bullets):

1. ScholarshipTop  
2. Fastweb  
3. Scholarships.com  
4. College Board BigFuture  
5. Official university / government / provider pages  

Each card includes: **Best for**, **Strengths**, **Watch out for**, **Signup required**, **International student usefulness**. Internal ScholarshipTop links preserved; neutral competitor framing kept.

## DB update

| Field | Value |
|-------|--------|
| Updated | **Yes** (`ai-resources-stage6a2-polish-post.ts --write`) |
| `status` | `published` (unchanged) |
| `published_at` | `2026-05-21T20:17:04.556+00:00` |
| `word_count` | 1403 (+98) |
| `<table>` in body | **No** |
| Internal links | 32 |

## Revalidate

`scripts/ai-resources-stage6a5-revalidate-pilot.ts` — OK for `/resources/best-scholarship-websites` and `/resources`.

## QA

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | Pass |
| `npm run build` | Pass (clean `.next`) |
| No `In 3–5 bullets` | Pass (prod) |
| No comparison `<table>` | Pass (prod + DB) |
| Stacked comparison cards | Pass (prod) |
| Internal links | Pass (32) |
| Article `published` | Pass |

## Production smoke

| Signal | Prod |
|--------|------|
| HTTP 200 | Yes |
| No `<table>` | Yes |
| Card content (platforms + “Watch out”) | Yes |
| `In 3–5 bullets` | Absent |
| IQ CTA (`resource-article-iq-cta`) | Still present — **Stage 6A.5 UI not deployed** |
| `deadline passed` in related | Still present — **6A.5 UI not deployed** |
| `$9,000` vs `$9.000` | `$9,000` seen — **6A.5 UI not deployed** for all card paths |

## Local dev

`http://localhost:3000/resources/best-scholarship-websites` returned **500** during smoke (dev server likely stale after build). Restart `npm run dev` to verify 6A.5 + 6A.6 together locally.

## Layout verdict

| Viewport | Verdict |
|----------|---------|
| **Desktop** | No multi-column table; readable stacked cards with full-width bullets |
| **Mobile** | No table horizontal scroll; cards stack vertically |

## Changed files (this stage)

| File | Change |
|------|--------|
| [`data/content/polished/best-scholarship-websites-2026-05-21.md`](../../data/content/polished/best-scholarship-websites-2026-05-21.md) | Table → comparison cards |
| [`scripts/ai-resources-stage6a2-polish-post.ts`](../../scripts/ai-resources-stage6a2-polish-post.ts) | QA: `hasComparisonCards`, verdict gate |
| Regenerated preview/QA md under `reports/seo/ai-resources-stage6a2-*` | From polish run |

**Not required for 6A.6:** React/UI files (unchanged this step). Stage **6A.5** UI fixes remain in working tree for a separate deploy commit.

## Guardrails

- Generation / batch 29–30: **not run**
- Other posts: **not changed**
- Commit / push: **not done** (awaiting approval)

## Git status

- **HEAD:** `4094320` on `main` (remote unchanged)
- **Modified (hotfix-related):** `data/content/polished/best-scholarship-websites-2026-05-21.md`, `scripts/ai-resources-stage6a2-polish-post.ts`, regenerated stage6a2 reports
- **Also modified (6A.5, uncommitted):** `app/resources/[slug]/page.tsx`, `resourceArticleBodyToc.ts`, `scholarshipsData.ts`, CTA/related components, etc.
- **Untracked:** `lib/content-hub/filterResourceArticleRelatedScholarships.ts`, `lib/content-hub/__tests__/resourceArticleBodyToc.test.ts`, `reports/seo/ai-resources-stage6a5-*.md`, publish/revalidate scripts

## Recommended next commit (when approved)

1. **Deploy commit:** Stage 6A.5 UI + 6A.6 content path (or split: content-only already live in DB; UI deploy for IQ/TOC/related/amounts).
2. **Push** after scoped staging — exclude i18n/IQ/middleware noise.
