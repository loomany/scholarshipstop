# DB content translation readiness (2026-05-19)

**Status: PLAN ONLY** — No DB writes, no migrations, no bulk translation in this audit.

English remains canonical at root. ES/FR DB long-tail is intentionally not served until a quality-gated translation pipeline exists.

---

## 1. Executive summary

| Surface | Est. indexable EN URLs | ES/FR today | Start priority |
| --- | ---: | --- | --- |
| Scholarship detail | ~19,448 | EN body only | P2 pilot top 100 |
| Resources CMS | ~900 | EN body only | P1 (high editorial value) |
| Essay guides (DB) | ~11,799 | EN body only | P2 (large volume) |
| Provider profiles | ~5,061 | EN body only | P2 |
| Compare state/univ | ~1,175 | EN body only | P3 |
| SEO programmatic hubs | ~1,626 | EN body only | P3 |
| Category hubs | 11 | EN body only | P1 (small, high traffic) |
| Cross-country SEO | subset of seo.xml | EN body only | P3 |

**Total English sitemap surface (May 2026):** ~40,114 URLs (`multilingual-implementation-map-2026-05-17.md`).

---

## 2. Content types — field matrix

### 2.1 Scholarships (`/scholarships/**`)

| Field | Translate? | Notes |
| --- | --- | --- |
| `title` (official name) | **No** (default) | Keep official scholarship name unless known localized alias |
| `meta_title`, `meta_description` | Yes | SEO wrappers only |
| `summary_short`, `summary_long`, `description` | Yes | Fact-preserving MT + review |
| `seoOverview`, FAQ blocks | Yes | High SEO value |
| `amount`, `deadline`, dates | **No** | Copy verbatim |
| Eligibility facts | Partial | Translate labels; preserve exact criteria |
| `slug`, `id`, URLs | **No** | Stable English slugs under `/es/` prefix |
| `categories` (IDs) | **No** | IDs stay English; visible labels via taxonomy helper |

**Est. count:** ~19,448 indexable detail URLs (scholarships-0.xml bucket).  
**Avg body size (estimate):** 800–2,500 words/page → ~1,200–4,000 tokens input/page.  
**Freshness risk:** High — listings update frequently.  
**SEO risk:** High — fact errors harm trust.  
**Update frequency:** Daily/weekly for active catalog.  
**Quality gate:** Human review required before `published`.  
**Index policy:** EN indexable; ES/FR `noindex` until `published`.  
**Sitemap policy:** ES/FR only when `translation_status === published`.  
**Pilot recommendation:** Top 100 by GSC impressions + indexable flag.

### 2.2 Providers (`/providers/[id]`)

| Field | Translate? | Notes |
| --- | --- | --- |
| `display_name` | **No** | Legal/org name |
| `description`, `ai_description`, `ai_faq` | Yes | Wrapper copy |
| Official URLs, state | **No** | |
| Scholarship counts | **No** | Numeric |

**Est. count:** ~5,061 (quality-gated).  
**Token volume:** ~500–1,500 tokens/page.  
**Freshness risk:** Medium.  
**Pilot:** Top 50 providers by scholarship count + traffic.

### 2.3 Resources CMS (`/resources/[slug]`)

| Field | Translate? | Notes |
| --- | --- | --- |
| `title`, `meta_title`, `meta_description` | Yes | |
| `body_html` | Yes | Preserve links, headings, citations |
| Author names, quoted program text | **No** / quote | Keep quotes in source language |

**Est. count:** ~900 DB articles (+ 14 static guides already translated).  
**Token volume:** ~2,000–8,000 tokens/page (long-form).  
**Freshness risk:** Medium.  
**Pilot:** Top 50 articles linked from EN hub + high impressions.

### 2.4 DB essay guides (`/essays/[slug]`)

**Est. count:** ~11,799 (essays.xml).  
**Fields:** Same pattern as resources.  
**Note:** 11 static essay guides already ES/FR; DB volume is the long tail.  
**Pilot:** Defer until resources pilot succeeds; start with top 25.

### 2.5 Compare long-tail (`/compare/states/*`, `/compare/universities/*`)

**Est. count:** ~1,175.  
**Fields:** Intro blocks, comparison narrative — yes; tabular stats — no.  
**Quality gate:** Strict fact preservation (numbers, rankings).  
**Many pages:** already `noindex` via compare quality policy.

### 2.6 SEO programmatic (`/scholarships/for-students-from/...`, manifests)

**Est. count:** ~1,626 (seo.xml) + cross-country subset.  
**Fields:** Hub intro, FAQ, meta — yes; listing cards — reuse EN data with localized chrome.  
**Risk:** Thin-page noindex rules must carry over to ES/FR.

### 2.7 Category SEO pages (`/scholarships/category/[slug]`)

**Est. count:** 11 promoted categories.  
**Fields:** Page heading, intro, FAQ — yes; category ID/slug — no.  
**Quick win:** Small set, high hub traffic; pairs with Stage 3B taxonomy labels.

---

## 3. Proposed translation data model

Table: `public.long_tail_translations` (**proposed — not created**)

| Column | Type | Purpose |
| --- | --- | --- |
| `id` | uuid | PK |
| `source_path` | text | English canonical path |
| `source_type` | enum | scholarship, provider, resource, essay, compare, seo_hub, category |
| `source_id` | text | DB row id/slug |
| `source_revision_hash` | text | Detect stale translations |
| `locale` | text | `es` \| `fr` |
| `translation_status` | enum | See below |
| `title`, `meta_title`, `meta_description`, `h1` | text | SEO fields |
| `body_md` or `body_html` | text | Translated body |
| `metadata_jsonb` | jsonb | FAQ, breadcrumbs, schema text |
| `quality_score` | int | 0–100 |
| `reviewer_id`, `reviewed_at` | | Human QA |
| `machine_model` | text | Audit trail |
| `token_usage_input`, `token_usage_output` | int | Cost tracking |
| `updated_at` | timestamptz | |

### `translation_status` lifecycle

```
missing → queued → draft_machine → draft_agent → review_required → reviewed → published
                                                      ↓                              ↓
                                                  blocked                      stale (on EN change)
```

| Status | Served? | robots | Sitemap | Hreflang |
| --- | --- | --- | --- | --- |
| `missing` | EN only | — | — | — |
| `queued` | EN only | — | — | — |
| `draft_machine` | Optional preview | noindex,follow | excluded | excluded |
| `draft_agent` | Optional preview | noindex,follow | excluded | excluded |
| `review_required` | Optional preview | noindex,follow | excluded | excluded |
| `reviewed` | Staging | noindex,follow | excluded | excluded |
| `published` | Live ES/FR | index,follow | included | bidirectional |
| `stale` | EN + old ES/FR | noindex on stale locale | removed until re-review | removed |
| `blocked` | EN only | — | — | — |

---

## 4. Quality gates (must pass before `published`)

1. Source English page is indexable (`is_indexable !== false`, not thin/broad noindex).
2. Translation complete (title, H1, body — no truncation).
3. Language detection pass (target locale ≥95% confidence).
4. No hallucinated facts (amounts, dates, eligibility match source).
5. Names preserved (scholarship, provider, university, official URLs).
6. No broken internal links (locale prefix correct).
7. Canonical self + hreflang valid (`en`, `es`, `fr`, `x-default`).
8. `noindex` until status = `published`.
9. Sitemap inclusion only when `published`.
10. Mixed-language risk score below threshold (reuse `translationPolicy.ts`).

---

## 5. Rendering architecture (future)

1. English route unchanged (`app/scholarships/[[...slugPath]]/page.tsx`).
2. ES/FR route checks `long_tail_translations` by `source_path + locale`.
3. If `published` → render translated fields in same template.
4. If missing/draft → `404` or redirect to EN hub (product decision); **do not** show English body on `/es/` URL.
5. Sitemap: `listLocalizedPilotPages()` pattern extended with DB rows where `published`.

---

## 6. What NOT to translate

- Scholarship official names (unless verified localized alias)
- Provider legal names
- University names
- Official URLs and query params
- Amounts, currencies, deadlines (verbatim)
- Eligibility facts requiring exact wording
- Slugs/IDs/filter params
- User-generated content (`/essays/u/*`, account data)

---

## 7. Recommended rollout order

| Phase | Content | Volume | Rationale |
| --- | --- | ---: | --- |
| **4A** | Category hubs (11) | 22 URLs | Small; unlocks taxonomy UX |
| **4B** | Top resources CMS (50) | 100 URLs | Unblocks `/es/resources` DB grid |
| **4C** | Top scholarships (100) | 200 URLs | Highest SEO value test |
| **4D** | Top providers (50) | 100 URLs | Directory trust |
| **4E** | Scale by GSC | +1k/quarter | Crawl-budget gated |

---

## 8. Operational hooks (future)

- Cron: reconcile `source_revision_hash` vs live DB rows → mark `stale`.
- Editorial dashboard: reviewer queue by locale/status.
- `reports/seo/i18n-translation-usage-*.json` per batch (token/cost audit).
- Reuse existing quality helpers: `getTranslatedPageSeoDecision`, `translationQuality.ts`.

---

## 9. Acceptance criteria (future rollout)

- Zero `draft_*` records served with `index,follow`.
- Sitemap diff shows only `published` additions.
- EN sitemap URL count unchanged after ES/FR DB launch.
- Hreflang only among `published` siblings.
- GSC: monitor ES/FR impressions separately; no EN canonical drift.
