# AI Resources Stage 6B.3 — five live articles polish

**Date:** 2026-05-21  
**Script:** `scripts/ai-resources-stage6b3-polish-live-five.ts`  
**Rows updated:** 5 (`content_posts`, status stayed `published`)  
**Polished markdown:** `data/content/polished/*-2026-05-21.md` (5 files)  
**Commit/push:** not performed

## Guardrails

| Action | Run? |
|--------|------|
| Polish only 5 published AI slugs | Yes |
| Status remains `published` | Yes |
| Other `review_needed` / posts | No |
| Generation / batch 24/29/30 | No |
| ES/FR | No |
| Env / auth / billing / RLS | No |

## What changed

### Database (5 posts)

- Restored source from `reports/seo/ai-resources-stage6b-previews-2026-05-21/` (pre-corruption markdown).
- Re-linked bare internal paths → markdown links (`/scholarships`, `/scholarships/hub/matches`, `/scholarships/category/stem`, `/scholarships/category/education`, `/resources`).
- Replaced generic **Key Point 1/2/3** TL;DR blocks with article-specific Quick Summary bullets.
- Fixed **scholarshiptop-vs-scholarships-com** awkward “Scholarships.com alternative” sentence.
- Regenerated `body_html`, updated `word_count` / `char_count` / `updated_at`; **no** status change.

### Code (local — needs deploy for live hub)

- `components/content-hub/ResourcesIndexPageContent.tsx`: hide IQ sidebar + grid promo card when `?cat=ai`.
- Grid promo preview: **Type ???** → **Fit / Profile** on non-AI hubs.
- `lib/content-hub/polishAiResourceArticleMarkdown.ts`: shared polish helpers.

## DB updates per slug

| Slug | post_id | status | internal hrefs (after) | Key fixes |
|------|---------|--------|------------------------|-----------|
| best-scholarship-search-engines-international-students | `8d0d578c-de38-40bf-a3c7-66bac2637bb1` | published | 7 | TL;DR + path links |
| scholarshiptop-vs-fastweb | `d20f6684-f8af-4501-9b5e-c1c613b13f74` | published | 5 | TL;DR + path links |
| scholarshiptop-vs-scholarships-com | `461277cf-c5e7-47b9-b9f4-242d58c09858` | published | 5 | TL;DR + neutral Scholarships.com copy |
| best-free-scholarship-websites-without-spam | `fe08ee54-8742-41f0-b8a6-f847dcc1bd30` | published | 6 | TL;DR (already had links from 6B.1) |
| best-scholarship-websites-for-graduate-students | `b9e85f8b-6335-45a9-939b-6b7e20fa0eac` | published | 5 | TL;DR + path links |

## ISR revalidate

All OK via `POST /api/revalidate`:

- `/resources?cat=ai`
- `/resources`
- All 5 article paths (tag `published-content-post-by-slug-v2`)

## Production smoke (articles — post-polish)

| URL | HTTP | no table | no 3–5 bullets | no ??? | no Key Point | clickable internal links | no deadline passed | no $9.000 | canonical | meta |
|-----|------|----------|----------------|--------|--------------|------------------------|-------------------|----------|-----------|------|
| `/resources/best-scholarship-search-engines-international-students` | 200 | pass | pass | pass | pass | pass | pass | pass | pass | pass |
| `/resources/scholarshiptop-vs-fastweb` | 200 | pass | pass | pass | pass | pass | pass | pass | pass | pass |
| `/resources/scholarshiptop-vs-scholarships-com` | 200 | pass | pass | pass | pass | pass | pass | pass | pass | pass |
| `/resources/best-free-scholarship-websites-without-spam` | 200 | pass | pass | pass | pass | pass | pass | pass | pass | pass |
| `/resources/best-scholarship-websites-for-graduate-students` | 200 | pass | pass | pass | pass | pass | pass | pass | pass | pass |
| `/es/resources/best-scholarship-search-engines-international-students` | 404 | — | — | — | — | — | — | — | — | — |

Bare `/scholarships/...` path text in article body replaced with `<a href="...">` links (verified on fastweb + scholarships-com samples).

## Hub (`/resources?cat=ai`)

| Check | Production (now) | After UI deploy |
|-------|------------------|-----------------|
| IQ grid card with **Type ???** | Still visible (code not deployed) | Hidden on `?cat=ai` |
| IQ sidebar | Still visible | Hidden on `?cat=ai` |
| Pilot + 5 articles listed | pass | pass |
| `resource-article-iq-cta` on AI articles | not present | not present |

Deploy `ResourcesIndexPageContent.tsx` to remove the hub IQ promo on the AI category filter.

## Live URLs

- https://scholarshiptop.com/resources/best-scholarship-search-engines-international-students
- https://scholarshiptop.com/resources/scholarshiptop-vs-fastweb
- https://scholarshiptop.com/resources/scholarshiptop-vs-scholarships-com
- https://scholarshiptop.com/resources/best-free-scholarship-websites-without-spam
- https://scholarshiptop.com/resources/best-scholarship-websites-for-graduate-students
- Hub: https://scholarshiptop.com/resources?cat=ai

## Build

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | pass |
| `npm run build` | pass |

## Git status

Uncommitted: `ResourcesIndexPageContent.tsx`, `polishAiResourceArticleMarkdown.ts`, `scripts/ai-resources-stage6b3-polish-live-five.ts`, `data/content/polished/*-2026-05-21.md` (5), this report. No commit/push per instructions.
