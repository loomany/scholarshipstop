# Requires `content_translations` — 2026-05-21

**No translation runs in this audit.** Plans reference existing Stage 4A–4D architecture.

---

## Summary

| source_type | Public ES/FR today | Rows (prod ref) | Priority |
| --- | --- | --- | --- |
| `scholarship_category` | STEM pilot live | 22 translations | P2 maintain |
| `resource_article` | Routes may exist; **0 seeded** | 0 | P2 seed 25×2 |
| `compare_page` (university/state) | EN body via English zone | TBD | P3 pilot |
| `scholarship` (detail/listing snippet) | EN listings on ES/FR hubs | Bulk | P4 |
| `provider` (description) | EN on ES/FR hub cards | Bulk | P4 |

---

## 1. Scholarship listing snippets (cards)

| Field | Route | Policy until translated |
| --- | --- | --- |
| `description` / list summary | `/es/scholarships`, category hubs | Show EN snippet today (bucket C) — **acceptable short-term** with English card chrome fixed first |
| Detail full page | `/es/scholarships/{slug}` | `gateLocalizedScholarshipDetail` — **404** if no translation (verify per env) |

**Pilot batch:** Top 50 hub-visible scholarships by impression (after analytics), not full catalog.

**source_type:** `scholarship` (or dedicated listing field map per Stage 4A audit).

**Priority:** P4

---

## 2. Provider descriptions

| Field | Route | Policy |
| --- | --- | --- |
| `ai_description` snippet | `/es/providers` cards | EN today |
| Provider detail | `/es/providers/{slug}` | Index only when quality gates pass |

**Pilot batch:** Providers with ≥10 active scholarships + official URL (align with SEO quality policy).

**source_type:** `provider`

**Priority:** P4 (after provider card chrome P0)

---

## 3. Compare DB pages (university / state)

| Field | Route | Policy |
| --- | --- | --- |
| Generated title + body | `/es/compare/universities`, `/es/compare/states` | **English zone** + notice; do not index ES/FR until translated |
| Card titles in grid | Same | EN titles from DB |

**Pilot batch:** 10 university + 10 state pages (highest traffic from Search Console).

**source_type:** per Stage 4A (`compare_page` or equivalent).

**Priority:** P3

**SEO:** No ES/FR sitemap entries until published + `quality_score >= 85`; keep `EnglishZoneNotice` until body translated.

---

## 4. Resource articles (CMS)

| Field | Route | Policy |
| --- | --- | --- |
| Title, excerpt, body | `/es/resources/{slug}` | **404** without published translation (Stage 4D policy) |
| Hub grid cards | `/es/resources` | EN static guides today; CMS cards English until seed |

**Pilot batch:** 25 articles × ES + FR (curated list in `i18n-stage4d-resources-pilot-candidates-2026-05-21.csv`).

**source_type:** `resource_article`

**Priority:** P2 (after P0 UI)

**Hub policy:** Filter ES/FR hub to translated IDs only until ≥10–25 per locale (per 4D inventory).

---

## 5. Essay long-tail (CMS/DB)

| Field | Route | Policy |
| --- | --- | --- |
| DB essay posts | `/essays/how-to-write-*` | **Hidden** on ES/FR hub (`EssaysIndexPageContent` locale !== 'en') |

**Pilot batch:** Defer until resources pilot stable.

**Priority:** P5+

---

## 6. Category pilot (maintain)

| Slug | ES/FR | Notes |
| --- | --- | --- |
| `stem` | Published | Listing chrome still EN — code fix separate |
| `hobbies` | 404 | Not in pilot — correct |

Expand categories only with translations ready per category playbook.

---

## Route / sitemap rules (do not break)

- English URLs unchanged; **no `/en`**
- ES/FR self-canonical when indexable
- Hreflang only for **published** locales (`contentTranslationsDbPolicy`)
- **No** untranslated DB URLs in `locale-es-*` / `locale-fr-*` sitemaps
- No English body fallback on ES/FR DB detail URLs

---

## Recommended pilot order

1. **P2** — 25 resource articles (50 rows) — proves CMS pipeline  
2. **P3** — 20 compare pages — removes largest English zone complaint  
3. **P4** — Scholarship + provider details in batches of 50–100  

**Do not** run bulk OpenAI across full catalog until P0/P1 chrome audit is green.
