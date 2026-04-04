# Subject taxonomy vs facets

## Storage

| Concern | Where it lives |
|--------|----------------|
| **Catalog browse** (L1/L2 subject areas) | `public.categories` + `public.scholarship_categories` |
| **Facets** (audience, level, requirements, amount, location) | `public.scholarships.seo_tags` (`text[]` of canonical tokens) |

`seo_tags` is a **PostgreSQL `text[]`**, not `jsonb`. PostgREST filters use array operators (e.g. `cs` / `@>`). Do not change the column type without updating listing code.

## Canonical facet tokens

Facet tag names and groups are defined in:

- `lib/scholarships/seoTags/vocabulary.ts` — allowlist (`ALL_SEO_TAGS`)
- `lib/scholarships/seoTags/slugSegmentToTag.ts` — URL segment → tag
- `data/seo-tag-text-rules.json` — optional text needles for backfill / enrichment

**Subject-only** tokens used when inferring L2 categories (read-only in assignment logic; listing still uses full `seo_tags` elsewhere):

- `engineering` → L2 `engineering` (under L1 `stem`)
- `computer_science` → L2 `computer_science`
- `stem` → L2 `stem_general`

All other `seo_tags` values are **facets**, not catalog categories.

## Subject category mapping

Rules live in `data/scholarship-subject-category-map.json`. Assignment logic:

- `lib/scholarships/categories/assignSubjectCategories.ts`

Priority (lower number = stronger for **primary** L2; all matches are kept as secondary L2s):

1. **`titleKeywordRules`** — title-only, strongest (typ. priority 8–14)  
2. **`fieldOfStudyRules`** — structured `field_of_study` JSON array (typ. 15–24; broad `stem` rule is weaker, ~48)  
3. **`keywordRules`** — title + summary + description + requirements + eligibility (typ. 30–52)  
4. **`seo_tags` subject tokens** — `engineering` / `computer_science` at ~18; broad `stem` at ~33 (weaker than title/fos so text can override)  
5. Legacy `category_slug` / `category` / `tags` (normalized via `scholarshipCategories`) — priority 40  
6. Fallback: `open_subject` (shown in UI as **General / open subject** — intentional, not an error)

Single-word needles use **token boundaries** (whole word only), so short tokens like `art` do not match inside `partner`.

Legacy `category_slug` values **`community`**, **`miscellaneous`**, and **`disability`** are intentionally **unmapped**: they are not reliable subject signals; classification comes from title / `field_of_study` / keywords, else **`open_subject`**. Narrow **community nonprofit** matches use explicit phrases only (see `titleKeywordRules` / `keywordRules`).

**Browse UI:** `GET /api/categories` returns all active L2 rows, including `open_subject`, so the General bucket is never omitted from subject lists.

## Backfill

After applying migration `20260421130000_scholarship_subject_categories.sql`:

```bash
npx tsx scripts/backfill-scholarship-subject-categories.ts
npx tsx scripts/backfill-scholarship-subject-categories.ts --apply
```

`--apply` requires `SUPABASE_SERVICE_ROLE_KEY`. Each scholarship gets **at least one** L2 row; multiple L2 rows are allowed.

## SEO routing

This document does **not** change URL routing or `seo_tags` filtering. Phase 3 can wire the UI catalog to `scholarship_categories` when you are ready.
