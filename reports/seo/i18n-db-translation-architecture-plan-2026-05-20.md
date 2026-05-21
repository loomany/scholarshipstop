# DB translation architecture plan (2026-05-20)

**Status:** Proposal only — no migrations, no Supabase writes, no bulk jobs.

---

## 1. Goals

- Translate long-tail DB content to ES/FR without breaking English SEO.
- Preserve facts: names, amounts, dates, URLs, slugs, category IDs.
- Publish only after human review.
- Detect stale translations when English source changes.

---

## 2. Storage (recommended)

### Table: `public.content_translations` (proposed)

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | PK |
| `source_type` | enum | `scholarship`, `provider`, `resource`, `essay`, `compare`, `seo_hub`, `category` |
| `source_id` | text | DB id or stable slug |
| `source_path` | text | English canonical path (`/scholarships/foo`) |
| `source_revision_hash` | text | SHA-256 of translatable fields from EN row |
| `locale` | text | `es` \| `fr` |
| `translation_status` | enum | See lifecycle |
| `title` | text | Optional localized display title |
| `meta_title` | text | |
| `meta_description` | text | |
| `h1` | text | |
| `body_html` | text | Or `body_md` |
| `faq_json` | jsonb | Structured FAQ |
| `model` | text | e.g. `gpt-4o-mini-2024-07-18` |
| `prompt_version` | text | |
| `reviewed_by` | text | nullable |
| `reviewed_at` | timestamptz | |
| `published_at` | timestamptz | |
| `created_at` / `updated_at` | timestamptz | |

**Unique constraint:** `(source_type, source_id, locale)`

**English canonical content stays in existing tables** — never overwrite EN rows.

---

## 3. Status lifecycle

```
missing → queued → draft_machine → review_required → reviewed → published
                                    ↘ blocked
published → stale (when source_revision_hash ≠ current EN hash)
```

| Status | Index | Sitemap | hreflang | Visible on site |
| --- | --- | --- | --- | --- |
| `missing` | — | no | no | EN only |
| `queued` | no | no | no | EN only |
| `draft_machine` | **noindex** | no | no | optional preview URL |
| `review_required` | **noindex** | no | no | admin/review tool |
| `reviewed` | **noindex** | no | no | pre-publish QA |
| `published` | **index** (if EN indexable) | yes | yes | `/es/...` `/fr/...` |
| `stale` | **noindex** (ES/FR) | remove | remove | fallback EN or 404 policy TBD |
| `blocked` | no | no | no | legal/quality hold |

**Rules:**

- **noindex until `published`**
- **no sitemap until `published`**
- **no hreflang until `published`** for that entity in both ES and FR (or omit locale from cluster)
- **English source remains indexable** at root paths always

---

## 4. Runtime resolution

```
Request: /es/scholarships/{slug}
1. Load EN scholarship by slug (existing loader)
2. Lookup content_translations WHERE source_id, locale=es, status=published
3. If hit: merge translated meta/body into page props
4. If miss: either 404 OR noindex EN-fallback page (recommend noindex + thin EN excerpt until published — product decision)
```

**Pilot recommendation:** Do not serve unpublished paths in production; keep linking to EN via Zone C until published.

---

## 5. Stale detection

On EN row update (webhook, cron, or nightly job):

1. Recompute `source_revision_hash` from translatable columns.
2. Compare to `content_translations.source_revision_hash`.
3. If mismatch → set `translation_status = stale`, drop from locale sitemap, add `noindex` on ES/FR URL.

---

## 6. Worker pipeline (no OpenAI in this sprint)

```
scripts/translation/enqueue-batch.ts   → status queued
workers/translation/run-batch.ts     → draft_machine (calls OpenAI later)
admin/review UI or CSV export          → reviewed
scripts/translation/publish.ts       → published + sitemap regen hook
```

**Idempotency:** upsert on `(source_type, source_id, locale)`.

**Validation:** JSON schema + max lengths + forbidden `<script>` + glossary regex for `$`, dates, URLs.

---

## 7. SEO integration

| System | Change |
| --- | --- |
| `lib/seo/sitemaps.ts` | New builder: only `published` translations |
| `lib/i18n/englishAlternates.ts` | Add hreflang only for published pairs |
| `robots` meta | `noindex` for non-published ES/FR DB pages |
| Canonical | Self on `/es/...`, `/fr/...` when published |

---

## 8. Slug strategy

**Phase 1–3:** Keep **English slugs** under locale prefix (`/es/scholarships/gates-millennium`).

**Phase 4+ (optional):** `localized_slug` column + 301 map only for curated guides with marketing need.

---

## 9. What not to build yet

- Auto-publish on machine translation
- hreflang to draft pages
- Overwriting EN `scholarships` rows
- Lemon/billing copy in translation table

---

## 10. Pilot readiness checklist

| Item | Ready? |
| --- | --- |
| Inventory CSV | ✅ `i18n-db-translation-inventory-2026-05-20.csv` |
| Field matrix | ✅ prior + this doc |
| UI/static ES/FR | ✅ Stage 2 + 3M |
| Schema migration | ❌ not created (by design) |
| Worker | ❌ |
| Review tool | ❌ |

**Verdict:** Ready to **design migration + pilot worker** in next sprint; not ready to bulk-translate without schema.
