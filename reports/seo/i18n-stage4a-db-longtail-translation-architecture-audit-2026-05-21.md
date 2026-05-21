# Stage 4A — DB + Long-tail SEO Translation Architecture Audit

**Date:** 2026-05-21  
**Status:** Audit only — no migrations, no Supabase writes, no bulk OpenAI, no push.  
**Prerequisites:** ES/FR UI/static/funnel clean final confirmation (2026-05-20); English at root; `/en` → 404; only `es` / `fr`.

**Related artifacts (unchanged by this pass):**

| Artifact | Path |
| --- | --- |
| Inventory CSV | `reports/seo/i18n-db-translation-inventory-2026-05-20.csv` |
| Prior architecture sketch | `reports/seo/i18n-db-translation-architecture-plan-2026-05-20.md` |
| Field matrix / readiness | `reports/seo/i18n-db-content-translation-readiness-2026-05-19.md` |
| OpenAI cost plan | `reports/seo/i18n-openai-translation-cost-plan-2026-05-20.md` |
| Inventory generator | `scripts/i18n-db-translation-inventory.ts` |

---

## 1. Executive summary

| Question | Answer |
| --- | --- |
| Are we ready to bulk-translate 40k pages? | **No** — no `content_translations` table, no locale DB routes for detail surfaces, no review worker. |
| Is the **design** ready for ChatGPT → Stage 4B migration TZ? | **Yes** — storage model, lifecycle, SEO gates, pilot batch, and code hooks are specified below. |
| English SEO risk if we follow this plan? | **Low** — EN tables/routes/sitemaps unchanged; ES/FR gated by `published` + existing `getTranslatedPageSeoDecision`. |
| Biggest current gap? | `/es|fr/scholarships/*` deep URLs render **English DB body** with **`noindex`** — acceptable as SEO safety, **not** acceptable as product UX; replace with **404 until published**. |

**Recommended next step (Stage 4B, not this pass):** Supabase migration for `content_translations` + read-only loaders + category pilot (11×2) without OpenAI bulk.

---

## 2. Current state (post Stage 3M)

### 2.1 What works today

| Layer | ES/FR coverage |
| --- | --- |
| Static pilot (~106 paths) | `lib/i18n/staticTranslations/` + `STAGE2_PILOT_CANONICAL_PATHS` |
| UI chrome (hubs, filters, funnel) | `hubUiCopy`, `scholarshipsHubUiCopy`, `taxonomyLabels`, onboarding/account |
| Locale routes | `app/[locale]/…` for pilot marketing, `/scholarships` hub root, funnel |
| SEO policy code | `lib/i18n/translationPolicy.ts`, `translationQuality.ts`, `localizedSitemaps.ts` |
| hreflang (static pilot) | `buildLocalizedAlternates` + smoke 21/21 PASS |

### 2.2 What does **not** work for DB long-tail

| Surface | EN route | ES/FR today |
| --- | --- | --- |
| Scholarship detail | `/scholarships/{slug}` | `/es/scholarships/{slug}` → **EN body**, `robots: noindex` |
| Provider profile | `/providers/{slug}` | No `[locale]/providers/[id]` route |
| Resource article | `/resources/{slug}` | No localized DB route |
| DB essay guide | `/essays/{slug}` | No localized DB route |
| Compare DB | `/compare/states|universities/{slug}` | No localized route |
| Category SEO | `/scholarships/category/{id}` | Labels via `taxonomyLabels`; **page copy EN** |
| Manifest / country / hub SEO | `/scholarships/...` (multi-segment) | EN only; resolver in `seoScholarshipResolve.ts` |
| University hub | `/scholarships/{state}/{university}` | EN only (dedicated route) |

**DB types:** `types_db.ts` has **no** `locale`, `translation_*`, or per-locale columns on `scholarships`, `providers`, `content_posts`, `essays`, `compare_pages`, `state_compare_pages`, `seo_hub_content`.

### 2.3 Intentional gaps (do not fix in Stage 4A–4E without explicit TZ)

- Lemon checkout EN  
- `/essay` EN product flow  
- `/signup` → EN `/onboarding`  
- Supabase reset URL `/auth/reset_password`  
- hub-tab hreflang legacy gap on EN  
- Auth / payment / RLS / Lemon — **out of scope**

---

## 3. English long-tail inventory (~40k URLs)

Source: `multilingual-implementation-map-2026-05-17.md`, `scripts/i18n-db-translation-inventory.ts`, `lib/seo/sitemaps.ts`.

| Content group | Route pattern | Est. EN URLs | Primary source | Sitemap bucket |
| --- | --- | ---: | --- | --- |
| Scholarship detail | `/scholarships/{slug}` | ~19,448 | `public.scholarships` | `scholarships-0` |
| Provider profile | `/providers/{slug}` | ~5,061 | `public.providers` + views | `providers` |
| Resources CMS | `/resources/{slug}` | ~900 | `public.content_posts` | `resources` |
| DB essay guides | `/essays/{slug}` | ~11,799 | `public.essays` | `essays` |
| Compare state | `/compare/states/{slug}` | ~600 | `state_compare_pages` | `compare` |
| Compare university | `/compare/universities/{slug}` | ~575 | `compare_pages` | `compare` |
| Category SEO (L1) | `/scholarships/category/{id}` | **11** | code + `categorySeoAllowlist` | `categories` |
| Programmatic SEO hubs | `/scholarships/for-students-from/*`, presets, states | ~1,626+ | manifest + `seo_hub_content` + JSON | `seo` |
| Cross-country SEO | `/scholarships/...` | ~200 | `scholarshipCountrySeo.ts` | `seo` |
| University hub | `/scholarships/{state}/{university}` | subset of `seo` + dedicated route | `provider_hub_listing` | `seo` / listings |

**Total EN sitemap surface:** ~40,114 URLs (unchanged after ES/FR static pilot).

Localized sitemap today: only **static pilot** buckets (`locale-es-*`, `locale-fr-*` from `listLocalizedPilotPages()`).

---

## 4. Content resolution map (how EN pages are built)

```mermaid
flowchart LR
  subgraph detail [Scholarship detail]
    S1[slug or UUID] --> DB[(scholarships)]
    DB --> Layout[layout.tsx schema.org]
  end
  subgraph listing [Programmatic listing]
    M[seo-scholarship-routes.json] --> R[seoScholarshipResolve]
    J[data/seo-scholarship-content/*.json] --> R
    H[(seo_hub_content)] --> R
    LT[long-tail presets] --> R
    R --> Body[scholarshipsSlugPathPageBody]
  end
  subgraph other [Other DB SEO]
    P[providers] --> PP[/providers/id]
    C[content_posts published] --> RES[/resources/slug]
    E[essays is_published] --> ESS[/essays/slug]
    CP[compare_pages published] --> CMP[/compare/...]
  end
```

**Priority in `resolveScholarshipSlugPath()`:** country SEO → UUID detail → single-segment manifest → long-tail preset → multi-segment manifest / dynamic.

**Implication for translations:** one `source_type` is not enough for “scholarships” — treat **detail**, **manifest listing**, **seo_hub**, **country**, and **university_hub** as separate translation keys (same URL prefix, different loaders).

---

## 5. Recommended storage architecture

### 5.1 Single table: `public.content_translations` (proposed)

Consolidates earlier `long_tail_translations` / `content_translations` drafts.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | PK |
| `source_type` | enum | See §5.2 |
| `source_id` | text | Stable id: scholarship `id`, provider `id`, slug for path-keyed rows |
| `source_path` | text | English canonical path, e.g. `/scholarships/gates-millennium` |
| `source_revision_hash` | text | SHA-256 of translatable EN fields (per type matrix §6) |
| `locale` | text | `es` \| `fr` only |
| `translation_status` | enum | §7 lifecycle |
| `title` | text | Optional localized display title (usually omit for official names) |
| `meta_title` | text | |
| `meta_description` | text | |
| `h1` | text | |
| `body_html` | text | Main prose; or `body_json` for structured compare/FAQ |
| `faq_json` | jsonb | Optional |
| `extras_json` | jsonb | Section blocks (seo_overview, intro, ai_* mirrors) |
| `quality_score` | int | 0–100; gate ≥85 (`TRANSLATION_INDEXABLE_QUALITY_SCORE`) |
| `model` | text | e.g. `gpt-4o-mini-2024-07-18` |
| `prompt_version` | text | |
| `token_usage_input` / `token_usage_output` | int | Cost audit |
| `reviewed_by` | text | nullable |
| `reviewed_at` | timestamptz | |
| `published_at` | timestamptz | |
| `created_at` / `updated_at` | timestamptz | |

**Constraints:**

- `UNIQUE (source_type, source_id, locale)`  
- `CHECK (locale IN ('es','fr'))`  
- English canonical content **never** overwritten in source tables.

**RLS (Stage 4B):** public `SELECT` only where `translation_status = 'published'`; writes via service role / worker only.

### 5.2 `source_type` enum (recommended)

| `source_type` | `source_id` | `source_path` example |
| --- | --- | --- |
| `scholarship` | `scholarships.id` | `/scholarships/{slug}` |
| `provider` | `providers.id` | `/providers/{slug}` |
| `resource` | `content_posts.id` | `/resources/{slug}` |
| `essay` | `essays.id` | `/essays/{slug}` |
| `compare_state` | `state_compare_pages.id` | `/compare/states/{slug}` |
| `compare_university` | `compare_pages.id` | `/compare/universities/{slug}` |
| `category` | category slug/id | `/scholarships/category/{id}` |
| `seo_hub` | `seo_hub_content.id` or canonical_path | `/scholarships/texas/...` |
| `seo_manifest` | canonical_path | manifest path from JSON |
| `seo_country` | country slug key | `/scholarships/for-students-from/india` |
| `university_hub` | `{stateSlug}/{universitySlug}` composite | `/scholarships/california/stanford` |

**Filesystem SEO JSON** (`data/seo-scholarship-content/`): store translations as `seo_manifest` keyed by `canonical_path`; do not duplicate into `scholarships` row unless detail page shares same path as detail (resolver decides).

### 5.3 Slug strategy

| Phase | Rule |
| --- | --- |
| **4B–4E** | Keep **English slugs** under `/es/` and `/fr/` (`/es/scholarships/gates-millennium`) |
| **Future** | Optional `localized_slug` + 301 only for curated marketing guides — not for 40k catalog |

### 5.4 What stays in English source tables

| Always EN | Never MT |
| --- | --- |
| `scholarships.title` (official name) | `slug`, `id`, `category_slug` |
| `providers.display_name` | `official_url`, counts |
| Amounts, deadlines, dates, URLs | `apply_url`, query params |
| Listing cards on hub pages | Filter state codes, GPA numbers |
| `indexing_status` pipeline | RLS, auth, billing |

---

## 6. Field translation matrix (by content group)

### 6.1 Scholarship detail (`source_type = scholarship`)

| Field (EN source) | Translate? | Notes |
| --- | --- | --- |
| `seo_excerpt`, `seo_overview`, `seo_eligibility`, `seo_application`, `seo_faq` | Yes | High SEO value |
| `summary_short`, `summary_long`, `description`, HTML blocks | Yes | Fact-preserving |
| `ai_student_summary`, `ai_*` blocks | Yes (optional P2) | Large token cost |
| `title` | **No** (default) | Official program name |
| `award_amount_*`, `deadline_*`, eligibility JSON | **No** | Verbatim |
| `slug`, `id`, URLs, `category_slug` | **No** | |

**Hash inputs:** translatable text columns + `seo_faq` JSON stringified; exclude `updated_at`-only cosmetic fields if documented.

**EN index gate:** `is_indexable !== false` and `is_active` for sitemap; ES/FR also requires `sourceIndexable` in `getTranslatedPageSeoDecision`.

### 6.2 Provider (`provider`)

| Translate | Do not |
| --- | --- |
| `description`, `ai_description`, `ai_faq`, meta wrappers | `display_name`, `official_url`, `state`, scholarship counts |

### 6.3 Resources CMS (`resource`)

| Translate | Do not |
| --- | --- |
| `title`, `meta_title`, `meta_description`, `body_html` | Author names; quoted program text; internal path slugs |

**EN gate:** `status = 'published'`.

### 6.4 DB essays (`essay`)

Same pattern as resources; EN gate: `is_published = true`.  
**Note:** 11 static essay guides already ES/FR in staticTranslations — do not duplicate in DB table.

### 6.5 Compare (`compare_state`, `compare_university`)

| Translate | Do not |
| --- | --- |
| Intro narrative, comparison prose, meta | Tabular stats, rankings, numeric comparisons, university legal names |

**EN gate:** inherit compare quality policy + `status = 'published'`.

### 6.6 Category SEO (`category`) — **quick win**

| Translate | Do not |
| --- | --- |
| Page intro, FAQ, meta (expert copy in code today) | Category id/slug; listing query |

**Volume:** 11 promoted categories × 2 locales = **22 translation rows**.

### 6.7 Programmatic SEO (`seo_hub`, `seo_manifest`, `seo_country`)

| Translate | Do not |
| --- | --- |
| Hub intro, FAQ, meta from JSON/`seo_hub_content` | Scholarship listing cards (stay EN data) |
| | `canonical_path`, manifest filters |

**Risk:** thin-page / drip / `indexable: false` on manifest — ES/FR must copy EN `robots` decision via `sourceIndexable`.

### 6.8 University hub (`university_hub`)

| Translate | Do not |
| --- | --- |
| Hub intro, FAQ from `provider_hub_listing` / AI FAQ | University legal name; listing payloads |

---

## 7. Status lifecycle

```
missing → queued → draft_machine → draft_agent → review_required → reviewed → published
                                                      ↓                              ↓
                                                  blocked                      stale
```

| Status | Public URL | robots | Sitemap | hreflang |
| --- | --- | --- | --- | --- |
| `missing` | — (404 on `/es/...`) | — | no | no |
| `queued` | — | — | no | no |
| `draft_machine` / `draft_agent` | preview only (auth) | **noindex,follow** | no | no |
| `review_required` / `reviewed` | staging | **noindex,follow** | no | no |
| `published` | `/es/...` `/fr/...` | **index,follow** if EN indexable + quality pass | yes | yes |
| `stale` | 404 or noindex | **noindex** | remove | remove from cluster |
| `blocked` | — | — | no | no |

**Hard rules (non-negotiable):**

1. **noindex until `published`** — already enforced in `getTranslatedPageSeoDecision`.  
2. **no sitemap until `published`** — extend `buildSitemapBuckets()` with DB-fed `locale-es-*` / `locale-fr-*` entries via `buildLocalizedSitemapEntry`.  
3. **no hreflang until `published`** for that entity — pass only published locales into `buildLocalizedAlternates({ availableLocales })`.  
4. **English root URLs always canonical for EN** — do not point EN canonical to `/es/`.  
5. **x-default** = English root URL (`ROOT_LOCALE`).

**Stale detection:** on EN update, recompute `source_revision_hash`; mismatch → `stale`, drop from locale sitemap, ES/FR **noindex** or **404** (recommend 404 to avoid thin duplicate).

---

## 8. Runtime resolution (target architecture)

### 8.1 Request flow

```
GET /es/scholarships/{slug}
  1. isStage2PilotLocale('es') else 404
  2. resolve EN entity (existing loader)
  3. fetch content_translations
       WHERE source_type, source_id, locale='es', status='published'
  4. if miss → notFound()  [recommended]
  5. merge translation into page props (meta, body, FAQ)
  6. metadata: getTranslatedPageSeoDecision({ sourceIndexable, translationStatus: 'published', ... })
  7. alternates: buildLocalizedAlternates with ['en','es','fr'] only if both es+fr published
```

### 8.2 Routes to add (Stage 4C+)

| English route | Localized route (new or extend) |
| --- | --- |
| `app/scholarships/[[...slugPath]]` | extend `app/[locale]/scholarships/[[...slugPath]]` |
| `app/providers/[id]` | `app/[locale]/providers/[id]` |
| `app/resources/[slug]` | `app/[locale]/resources/[slug]` |
| `app/essays/[slug]` | `app/[locale]/essays/[slug]` |
| `app/compare/states/[slug]` | `app/[locale]/compare/states/[slug]` |
| `app/compare/universities/[slug]` | `app/[locale]/compare/universities/[slug]` |
| `app/scholarships/category/[slug]` | `app/[locale]/scholarships/category/[slug]` |

**Change required now (behavior):** stop serving EN DB body on `/es|fr/scholarships/*` deep paths — today `ScholarshipsSlugPathPageBody` runs with `locale` but content is EN; metadata is `noindex`. Replace with **404 until published** to prevent accidental indexing of mixed-language pages if robots tag regresses.

### 8.3 Shared loader API (proposed)

```ts
// lib/i18n/contentTranslationsServer.ts (proposed)
getPublishedTranslation({ sourceType, sourceId, locale })
getPublishedTranslationsForPath({ sourcePath, locale })
listPublishedTranslationsForSitemap({ sourceType, locale, bucket })
```

Wire into existing metadata helpers; reuse `translationPolicy.ts` for robots/sitemap/hreflang.

---

## 9. SEO integration checklist

| System | Current | After DB translations |
| --- | --- | --- |
| `lib/seo/sitemaps.ts` | EN buckets only + static pilot locale buckets | Add DB query: published rows per `source_type` |
| `lib/i18n/localizedSitemaps.ts` | Static pilot | DB candidates with `translationStatus: 'published'` |
| `lib/i18n/alternates.ts` | Pilot paths | Dynamic: `availableLocales` = `['en', ...published]` |
| EN `generateMetadata` on `/scholarships/*` | unchanged | Add hreflang only when ES+FR published (optional Phase 4D) |
| `app/[locale]/scholarships/[[...slugPath]]/page.tsx` | hub root indexable; deep noindex | deep paths: published → index + hreflang |
| Google Indexing API | EN `indexing_status` | Separate policy for ES/FR (defer; crawl natural) |
| `robots.ts` | unchanged | |
| Zone C links | EN fallback allowed | Link to `/es/...` only when published |

**hreflang cluster rule:** include `en`, `es`, `fr`, `x-default` only when **both** `es` and `fr` are `published` for same `(source_type, source_id)` — OR emit partial cluster with only published siblings (document choice in 4B; recommend **partial cluster** to avoid blocking ES-only launch).

**Intentional deferral:** hub-tab hreflang on EN — fix separately; do not auto-add ES/FR to broken EN tabs.

---

## 10. Quality gates (before `published`)

Code already implements base checks in `translationQuality.ts` + `translationPolicy.ts`:

| # | Gate | Implementation |
| --- | --- | --- |
| 1 | `translation_status === 'published'` | `translationStatusIsPublished` |
| 2 | `quality_score >= 85` | `translationQualityScorePasses` |
| 3 | Localized title, H1, body present | `translationContentQualityReasons` |
| 4 | No mixed-language risk flag | `hasMixedLanguageRisk` |
| 5 | EN source indexable | `sourceIndexable` in decision input |
| 6 | Fact preservation (amounts, dates, URLs) | Prompt + post-validation regex |
| 7 | Official names unchanged | Glossary + reviewer checklist |
| 8 | JSON schema / max lengths / no script | Worker validation |
| 9 | Internal links locale-correct | `i18n-locale-link-audit` on pilot batch |
| 10 | Human review | **100% for pilot**; 10% sample at scale |

**Do not auto-publish** machine output. `draft_machine` → human → `published`.

---

## 11. OpenAI / model / cost plan (summary)

Full numbers: `reports/seo/i18n-openai-translation-cost-plan-2026-05-20.md`.

| Role | Model |
| --- | --- |
| Bulk ES/FR draft | `gpt-4o-mini` |
| High-value scholarship QA sample | `gpt-4o` |
| Do **not** reuse | `app/api/internal/seo/*` generators (different prompts) |

| Batch | Rows (×2 locales) | Est. MT USD |
| --- | ---: | ---: |
| 11 categories | 22 | ~$0.05 |
| Top 50 resources | 100 | ~$0.48 |
| Top 100 scholarships | 200 | ~$0.24 |
| Top 50 providers (optional) | 100 | ~$0.12 |
| **Pilot total (recommended)** | **~322–422** | **~$1.00** |
| All scholarships (~19.4k) | ~38.9k | ~$46 |
| Full ~40k EN surface | ~80k | ~$100–160 |

**Dominant cost:** human review (90–145 h for recommended pilot), not tokens.

**Execution guardrails:** Batch API after pilot (~50% discount); log usage to `reports/seo/i18n-translation-usage-*.json`; dry-run `scripts/i18n-translation-cost-estimator.ts` (proposed, read-only sample).

---

## 12. First pilot batch (Stage 4C MT, after 4B schema)

Ordered by risk × learning value:

| Step | Content | EN pages | Translation rows | Rationale |
| --- | --- | ---: | ---: | --- |
| **1** | Category SEO | 11 | 22 | Smallest; validates hreflang + sitemap + category template |
| **2** | Top 50 resources CMS | 50 | 100 | Editorial quality; long-form pipeline |
| **3** | Top 100 scholarships | 100 | 200 | Highest SEO value; fact QA |
| **4** (optional) | Top 50 providers | 50 | 100 | Directory trust |

**Selection criteria:**

- Categories: all 11 in `categorySeoAllowlist`.  
- Resources: top 50 by GSC impressions + inbound links from EN hub.  
- Scholarships: top 100 indexable by GSC impressions (exclude `is_indexable = false`).  
- Providers: top 50 by linked scholarship count.

**Defer to P3:** compare state/university (~1,175), manifest SEO bulk (~1,826), cross-country (~200), DB essays scale (~11,799).

**Pilot acceptance:**

- 0 `draft_*` with `index,follow`  
- EN sitemap URL count unchanged  
- hreflang smoke extended for new published paths  
- visible-text audit 0 blocking on pilot URLs  
- GSC: monitor ES/FR impressions separately  

---

## 13. Worker pipeline (Stage 4D+, design only)

```
enqueue-batch.ts     → status = queued
run-batch.ts         → draft_machine (OpenAI, idempotent upsert)
export-review.csv    → human review
publish.ts           → reviewed → published, sets published_at
stale-reconcile.ts   → nightly hash compare → stale
```

**Idempotency:** upsert on `(source_type, source_id, locale)`.

**Out of scope:** Lemon, auth emails, Supabase Auth URLs, RLS changes, bulk without review.

---

## 14. English SEO safety checklist

| Risk | Mitigation |
| --- | --- |
| EN canonical drift | Never set EN canonical to `/es/` |
| Duplicate thin ES/FR | 404 until published; noindex on stale |
| hreflang to drafts | `includeInHreflang` only when published + quality pass |
| Sitemap bloat | Separate locale buckets; only published rows |
| 40k auto MT spam | Batch caps + human review + quality_score |
| EN indexing drop | Do not change EN routes/metadata/sitemap builders without diff test |
| Mixed language on `/es/` | Remove EN-body fallback on localized URLs |

---

## 15. Stage gate: what ChatGPT should approve before 4B TZ

| Item | Stage 4A verdict |
| --- | --- |
| Storage model (`content_translations`) | ✅ Recommended |
| `source_type` split (detail vs manifest vs hub) | ✅ Required |
| Lifecycle + noindex/sitemap/hreflang rules | ✅ Aligned with code |
| Slug strategy (EN slugs under `/es|fr`) | ✅ |
| Pilot batch (11 + 50 + 100 [+ 50]) | ✅ |
| 404 vs EN-fallback for unpublished | ✅ Recommend **404** |
| Partial vs full hreflang cluster | ⚠️ Product choice (recommend partial) |
| Migration + RLS + workers | ❌ Stage 4B TZ |
| OpenAI bulk | ❌ Stage 4C after schema + review tool |

---

## 16. Deliverables produced in Stage 4A

| Deliverable | Location |
| --- | --- |
| This audit | `reports/seo/i18n-stage4a-db-longtail-translation-architecture-audit-2026-05-21.md` |
| Inventory CSV (regenerate if needed) | `npx tsx scripts/i18n-db-translation-inventory.ts` → `reports/seo/i18n-db-translation-inventory-2026-05-20.csv` |

**No code changes, no Supabase writes, no migrations, no OpenAI calls in this pass.**

---

## 17. Suggested ChatGPT → Cursor next TZ (Stage 4B sketch)

1. Create migration `content_translations` + enum + indexes + RLS (read published only).  
2. Implement `contentTranslationsServer.ts` read helpers.  
3. Category pilot: seed 22 rows manually or scripted **without OpenAI**.  
4. Wire `app/[locale]/scholarships/category/[slug]` + metadata + sitemap.  
5. Change `/es|fr/scholarships/*` deep unpublished → `notFound()`.  
6. Tests: extend `localizedMetadata.test.ts` + hreflang smoke for 11 categories.  

---

*End of Stage 4A audit.*
