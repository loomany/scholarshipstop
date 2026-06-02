# AI Resources Stage 6A.4 — Pilot publish smoke

**Date:** 2026-05-21  
**Slug:** `best-scholarship-websites`  
**Post ID:** `07caa51c-695b-4605-9a3d-24f2688551c0`  
**Script:** [`scripts/publish-ai-resource-pilot.ts`](../../scripts/publish-ai-resource-pilot.ts)

## Scope guardrails

| Action | Run? |
|--------|------|
| Publish only `best-scholarship-websites` | Yes (1 row) |
| `content:run-once` / generation | No |
| Batch 29/30 topics | No |
| `publish-next` / `publish-unpublished-content.ts` | No |
| ES/FR translations | No |
| Git commit / push | No |
| Supabase schema / RLS / migrations | No |

## `publish-unpublished-content.ts` check

[`scripts/publish-unpublished-content.ts`](../../scripts/publish-unpublished-content.ts) has **no** `--slug` flag. It selects **all** non-published `content_posts` and `essays` — **not used**.

## Preflight (read-only, before publish)

| Check | Result |
|-------|--------|
| Post exists | Yes |
| `id` = `07caa51c-695b-4605-9a3d-24f2688551c0` | Yes |
| `slug` = `best-scholarship-websites` | Yes |
| `status` = `review_needed` | Yes |
| Classification `categoryId` | `ai` (`data/resource-article-classification.json`) |
| `title` / `meta_title` / `meta_description` / `excerpt` | Present |
| Internal links in `body_html` | 32 (`href` to `/scholarships` or `/resources`) |
| Published slug collision | 0 other published rows with same slug |

## Dry-run

```json
{
  "phase": "dry-run",
  "rowsExpected": 1,
  "filter": {
    "id": "07caa51c-695b-4605-9a3d-24f2688551c0",
    "slug": "best-scholarship-websites",
    "status": "review_needed"
  },
  "patch": {
    "status": "published",
    "published_at": "<now ISO>",
    "updated_at": "<now ISO>"
  }
}
```

## DB before / after

| Field | Before | After |
|-------|--------|-------|
| `status` | `review_needed` | `published` |
| `published_at` | `null` | `2026-05-21T20:17:04.556+00:00` |
| `slug` | `best-scholarship-websites` | `best-scholarship-websites` (unchanged) |

**Rows updated:** `1` (triple filter: `id` + `slug` + `status=review_needed`)

**Command:**

```bash
npx dotenv-cli -e .env.local -- npx tsx scripts/publish-ai-resource-pilot.ts --write
```

## Production smoke (after publish + ISR revalidate)

Initial fetch returned **404** on the article URL (~300s `unstable_cache` on `published-content-post-by-slug-v2`).  
Post-publish **ISR revalidate** via existing `POST /api/revalidate` (paths `/resources/best-scholarship-websites`, `/resources`; tag `published-content-post-by-slug-v2`) — no secrets logged.

| URL | Status | Notes |
|-----|--------|-------|
| `/resources/best-scholarship-websites` | **200** | Live article |
| `/resources?cat=ai` | **200** | Page lists pilot slug / title signal |
| `/es/resources/best-scholarship-websites` | **404** | Expected (no ES translation) |
| `/fr/resources/best-scholarship-websites` | **404** | Expected (no FR translation) |

**SEO signals (EN article):**

| Signal | Result |
|--------|--------|
| Canonical | `https://scholarshiptop.com/resources/best-scholarship-websites` |
| `<title>` | Present (~46 chars) |
| Meta description | Present |
| AI category filter | Pilot visible on `?cat=ai` |

## Sitemap

| Location | Contains slug? |
|----------|----------------|
| `/sitemap.xml` (index) | No (index only lists child sitemaps) |
| `/sitemaps/resources.xml` | **Yes** — dynamic from published `content_posts` |

Sitemap is generated from DB; no manual sitemap commit required.

## Git status (unchanged deploy commit)

- **HEAD:** `4094320 feat(content): add AI resources pack and generation guards`
- **Branch:** `main...origin/main` (in sync)
- **New local files (uncommitted):** `scripts/publish-ai-resource-pilot.ts`, this report
- **Uncommitted noise still present:** i18n/IQ/middleware, unrelated `dist/` (not staged/pushed)

## Confirmations

- Generation, batch 29/30, `content:run-once`, and publish of other `review_needed` posts were **not** run.
- Only one Supabase `content_posts` row was updated for this pilot.
