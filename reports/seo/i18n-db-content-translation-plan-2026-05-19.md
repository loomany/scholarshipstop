# Stage K — DB content translation plan (future) — 2026-05-19

This pass does **not** translate any DB-backed long-tail content. The English
source pages remain canonical and indexable. This document defines a future
rollout for ES/FR DB content.

## In-scope content surfaces

| Surface | Route patterns | DB source(s) | Notes |
|---|---|---|---|
| Scholarship detail | `/scholarships/[state]/[university]`, `/scholarships/category/[slug]`, `/scholarships/[[...slugPath]]` | `public.scholarships`, derived hub views | Fact-heavy: amounts, deadlines, eligibility blocks. **Names must stay in source language**. |
| Provider profiles | `/providers/[id]` | `public.providers` | Org names + URLs untouchable. |
| DB essay guides | `/essays/[slug]` | `public.essay_guides` (or equivalent CMS) | Headings/intro safe to translate. Sample prompts may quote English program text — keep quoted. |
| Resources / CMS articles | `/resources/[slug]` | `public.resources` | Newsroom-style articles; safe to translate body, but preserve named-entity citations. |
| Compare long-tail | `/compare/[slug]`, `/compare/states/[slug]`, `/compare/universities/[slug]` | Computed from `public.scholarships` + universities | Mostly tabular; UI wrapper can be localized later; numbers/dates verbatim. |

## Out of scope here (Zone B already shipped this round)

- `/get-scholarships`, `/signin`, `/signin/*` — funnel wrappers translated.
- All Stage 2 static SEO pages — already live at `/es/...` and `/fr/...`.

## Translation pipeline (proposed)

1. **Translation queue table**
   - New table `public.long_tail_translations` (proposed, NOT created in this
     pass — would be Supabase migration; explicitly out of scope).
   - Columns: `source_path`, `source_revision_hash`, `locale`, `status`
     (`queued | machine_drafted | human_reviewed | published | needs_update`),
     `body_md`, `metadata_jsonb` (title/description/H1/breadcrumb), `quality_score`,
     `reviewer_id`, `reviewed_at`, `updated_at`.

2. **Status model**
   - `queued` — picked up by translation worker.
   - `machine_drafted` — MT output; **noindex,follow** until human review.
   - `human_reviewed` — passed quality gate; ready to publish.
   - `published` — visible at `/es/...` or `/fr/...`; included in sitemap.
   - `needs_update` — English source changed; re-translate or human review.

3. **Quality gates**
   - Quality score combines:
     - Glossary lock check (named entities, currency strings, dates retained).
     - LLM grader on terminology consistency vs. existing static pages.
     - Min coverage on body sections (no truncation).
   - Only `human_reviewed` or `published` records are eligible for sitemap.

4. **`noindex` until reviewed**
   - Records in `machine_drafted` are served with `<meta robots="noindex,follow">`
     and excluded from `sitemap.xml` (and the per-locale sitemap slot).
   - Once `published`, they switch to `index,follow` with `hreflang en/es/fr/x-default`
     and `<link rel="canonical">` self.

5. **Source English page must be indexable**
   - We do not "switch off" `/scholarships/[state]/[university]` (English) when
     adding ES/FR. Each locale has its own canonical; hreflang links point
     across published siblings only.

6. **No MT spam**
   - Translation worker must always wait for human review before publishing.
   - LLM API key usage is rate-limited; logs of token counts written to
     `reports/seo/i18n-translation-usage-*.json` per batch.

7. **Preserve names/facts/dates/amounts**
   - Hard rules in the prompt:
     - Do not change scholarship names, provider names, university names, or
       award amounts (preserve number, currency, formatting).
     - Do not change deadlines or dates — copy verbatim.
     - Do not translate official URL paths or query parameters.

8. **Update detection**
   - When `public.scholarships.updated_at` or content hash changes:
     - Mark all matching `long_tail_translations` rows as `needs_update`.
     - Remove from sitemap until re-reviewed.
   - When English `/resources/[slug]` body changes, the same applies via
     `source_revision_hash`.

9. **Sitemap inclusion**
   - Sitemap generator (`lib/i18n/localizedSitemaps.ts`) only includes locale
     URLs whose `long_tail_translations.status === 'published'`.
   - Otherwise, no `<url>` entry and no `<link rel="alternate">` from the
     English sibling for that locale.

10. **Operational hooks**
    - A future cron (NOT in this pass) reconciles the queue against
      `public.scholarships` / `public.resources` change feeds.
    - Editorial dashboard surfaces reviewer queues by locale.

## What we do NOT do

- No mass MT publication.
- No Supabase writes or migrations in this audit.
- No new OpenAI generator runs in this audit.
- No deletion of English URLs.
- No silent linking from ES/FR pages to English DB content unless explicitly
  marked English (see `isExplicitEnglishOnlyInternalLink`).

## Acceptance criteria (future rollout, not this pass)

- A scholarship/provider/resource is published at `/es/...` or `/fr/...` only
  when the row is `human_reviewed` + `published`.
- 0 machine-drafted records served with `index,follow`.
- Sitemap diff per release shows only reviewed additions.
- `?stp_locale=audit` debug endpoint can list queue + statuses.

## Effort estimate

- Schema + worker plumbing: ~2 engineer-weeks (Supabase migration, worker,
  reviewer UI, sitemap integration).
- Initial reviewer batch: scoped per content type; budget per row depends on
  body length (scholarship detail ~30 min/locale/page reviewed).
