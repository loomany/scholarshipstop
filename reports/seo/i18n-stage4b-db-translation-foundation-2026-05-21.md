# Stage 4B — DB Translation Foundation (2026-05-21)

**Status:** Complete (local). **No commit, no push, no production Supabase apply, no translation seeds, no bulk OpenAI.**

---

## 1. Migration (file only)

| Item | Value |
| --- | --- |
| Path | `supabase/migrations/20260521120000_content_translations.sql` |
| Applied to production | **No** (by design) |

### Table `public.content_translations`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | `gen_random_uuid()` |
| `source_type` | text | 11 allowed values (check constraint) |
| `source_id` | text | Scholarship id, slug key, etc. |
| `locale` | text | `es` \| `fr` |
| `source_hash` | text | EN revision fingerprint |
| `source_updated_at` | timestamptz | |
| `status` | text | default `missing` |
| `translated_*` | text/jsonb | slug, title, meta, summary, body, faq, schema, extra |
| `quality_score` | int | 0–100 when set |
| `machine_model`, `translated_by`, `reviewed_by`, `reviewer_notes` | text | audit |
| `published_at`, `stale_at`, `blocked_reason` | timestamptz/text | lifecycle |
| `created_at`, `updated_at` | timestamptz | `updated_at` trigger |

**Unique:** `(source_type, source_id, locale)`

**Indexes:** source+locale, locale+status, source_type+locale+status, status+updated_at, partial published lookup.

### RLS

| Policy | Role | Rule |
| --- | --- | --- |
| `content_translations_select_published_public` | anon, authenticated | `SELECT` only where `status = 'published'` |
| (none for writes) | anon, authenticated | drafts invisible; writes via service role only |

---

## 2. TypeScript modules

| File | Role |
| --- | --- |
| `lib/i18n/contentTranslationsTypes.ts` | Locales, statuses, source types, `shouldExposeTranslatedRoute`, `shouldIndexTranslatedContent` |
| `lib/i18n/contentTranslationsDbPolicy.ts` | `canIncludeTranslatedDbPageInSitemap`, `canAddTranslatedDbHreflang`, `getTranslatedDbRobots` |
| `lib/i18n/contentTranslationsServer.ts` | `getPublishedContentTranslation`, `getContentTranslationSeoDecision`, `getTranslationSourceHash`, `getContentTranslationByStatus` (worker) |
| `lib/i18n/localizedScholarshipDetailGate.ts` | 404 gate for localized scholarship detail |
| `types_db.ts` | `content_translations` table types (ahead of migration apply) |

---

## 3. Route policy change (404 safety)

### Before (Stage 4A issue)

`/es/scholarships/{slug}` and `/fr/scholarships/{slug}` could render **English DB body** with `robots: noindex`.

### After (Stage 4B)

| URL | Behavior |
| --- | --- |
| `/scholarships/{slug}` (EN) | Unchanged — English detail works |
| `/es/scholarships`, `/fr/scholarships` | Unchanged — hub root indexable + hreflang |
| `/es/scholarships/hub/*`, `/fr/scholarships/hub/*` | Unchanged |
| `/es/scholarships/{slug}`, `/fr/scholarships/{slug}` (detail) | **`notFound()`** until `content_translations` row exists with `status=published` for `scholarship_detail` + scholarship `id` |

**Wiring:**

- `app/scholarships/scholarshipsSlugPathPageBody.tsx` — gate before detail render when `locale` is set
- `app/[locale]/scholarships/[[...slugPath]]/page.tsx` — gate in `generateMetadata` for detail paths

**Stage 4C note:** gate still ends in `notFound()` after a published row is found until localized detail **rendering** ships (no English body fallback).

Manifest/listing paths under `/es/scholarships/...` (multi-segment) are **not** gated in 4B (still noindex where applicable).

---

## 4. Sitemap / hreflang

- **No** DB rows added to `lib/seo/sitemaps.ts` in this stage.
- Policy helpers ready; static pilot locale sitemaps unchanged.
- Draft/review/stale/blocked → no sitemap, no hreflang, noindex.

---

## 5. Dry-run script

```bash
npx tsx scripts/seo/i18n-check-db-translation-foundation.ts
```

**Result:** PASS (migration file, helpers, gate wiring, no sitemap DB emission, no write ops in server helper).

---

## 6. Tests / build

| Check | Result |
| --- | --- |
| `npx tsx --test lib/i18n/__tests__/*.test.ts` | **PASS — 63/63** (+9 new `contentTranslations.test.ts`) |
| `npx tsc --noEmit` | **PASS** |
| `npm run build` | **PASS** |
| `npx tsx scripts/seo/i18n-check-db-translation-foundation.ts` | **PASS** |

---

## 7. What was not touched

- English URLs, routes, sitemaps
- `/en` route (still 404)
- Auth, Lemon, payment, unrelated RLS
- Bulk OpenAI / translation workers
- Supabase production writes / migration apply
- Seeding `content_translations` rows
- `[locale]/providers`, `[locale]/resources`, compare, category DB routes (Stage 4C+)

---

## 8. Why no translations were seeded

Stage 4B is **foundation only**: schema + read policy + 404 safety. Seeding without migration apply and without Stage 4C render would not be testable in production and risks accidental indexable EN duplicates.

---

## 9. Answers for ChatGPT / product

### Is it safe to start a tiny pilot seed?

**After** migration is applied to **staging/local** Supabase and verified:

- RLS: anon cannot read `draft_machine` / `review_required`
- Public app only reads `published` via `getPublishedContentTranslation`
- Yes — safe to seed **1–2 test rows** on staging for integration QA

**Not safe on production** until migration is reviewed and applied deliberately.

### Smallest recommended pilot (Stage 4C)

1. Apply migration to **staging**
2. Manually seed **11 category** rows (`scholarship_category`, ES+FR) — 22 rows, no OpenAI
3. Wire `[locale]/scholarships/category/[slug]` render from `content_translations`
4. Then top 50 resources (MT + review)

### Manual checks before applying migration

- [ ] Review SQL: constraints, indexes, RLS, no destructive DDL
- [ ] Confirm `source_type` names match app enums
- [ ] Apply on **staging** first; `select * from content_translations` as anon → 0 rows (empty) or only published
- [ ] Insert draft row as service role → anon `select` returns 0 for that row
- [ ] Hit `/es/scholarships/{known-slug}` → **404**
- [ ] Hit `/scholarships/{same-slug}` → **200**
- [ ] Hit `/es/scholarships` → **200**

---

## 10. Next stage (4C sketch)

- Localized render for `scholarship_category` (11) and remove final `notFound()` in gate when render exists
- Optional: resources pilot + `app/[locale]/resources/[slug]`
- Review export + `publish.ts` worker (service role)
- Extend hreflang smoke for first published DB paths

---

*End of Stage 4B report.*
