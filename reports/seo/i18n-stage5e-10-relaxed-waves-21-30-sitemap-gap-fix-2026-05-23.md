# Stage 5E-10 — relaxed waves 21–30 DB vs sitemap gap fix (2026-05-23)

## Executive summary

| Item | Result |
|------|--------|
| Root cause | **PostgREST 1000-row cap** on translated-ID exclusion in candidate selector |
| Secondary | **Report confusion** (500 upsert ops ≠ 500 net-new sitemap URLs) |
| Sitemap eligibility of relaxed rows | **All 834 rows eligible** (no title/body/policy gap) |
| Live XML vs list | **Aligned at 1201/1201** (no cache/pagination bug in sitemap builder) |
| Fix applied | Paginated `fetchTranslatedScholarshipDetailSourceIds`; align list with title gate |
| Wave 31 | **Allowed** after fix (expect +N sitemap = +N net-new scholarships) |

---

## 1. Production DB audit (waves 21–30)

Query: `machine_model LIKE stage5e-scholarship-autopilot-relaxed-wave-%`

| Metric | Expected (report) | **Actual** |
|--------|-------------------|------------|
| Total rows | 1000 | **834** |
| ES rows | 500 | **417** |
| FR rows | 500 | **417** |
| Distinct scholarships | 500 | **417** |
| Status | all published | **all published** |
| quality_score | ≥85 | **all ≥85** |
| empty translated_title | 0 | **0** |
| empty body/summary | 0 | **0** |

### Rows by wave (current `machine_model` tag)

| Wave | Total | ES | FR | Distinct scholarships |
|------|-------|----|----|------------------------|
| 21 | 40 | 20 | 20 | 20 |
| 22 | 50 | 25 | 25 | 25 |
| 23 | 44 | 22 | 22 | 22 |
| 24 | 100 | 50 | 50 | 50 |
| 25 | 100 | 50 | 50 | 50 |
| 26 | 100 | 50 | 50 | 50 |
| 27 | 100 | 50 | 50 | 50 |
| 28 | 100 | 50 | 50 | 50 |
| 29 | 100 | 50 | 50 | 50 |
| 30 | 100 | 50 | 50 | 50 |

**Note:** Per-wave totals under-count earlier waves because **upsert replaces `machine_model`** when the same `source_id+locale` is published again in a later wave. This is metadata migration, not row loss.

**Upsert operations:** ~500 scholarship batches were attempted; **417 distinct** scholarships hold the relaxed tag today (~83 duplicate re-targeting across waves/resume runs).

---

## 2. Sitemap eligibility audit

CSV: `i18n-stage5e-10-relaxed-waves-21-30-sitemap-gap-audit-2026-05-23.csv`

For all **834** relaxed rows:

| Check | Result |
|-------|--------|
| sitemap_eligible (full SEO policy incl. title) | **834/834 yes** |
| missing_reason | **none** |
| Routes (non-eligible only) | n/a — all eligible |

**Not the cause:** empty title/body, non-indexable source, slug mismatch, quality &lt;85, draft/review.

---

## 3. Live sitemap / XML

| Metric | Before wave 21 | After waves 21–30 | After revalidate (5E-10) |
|--------|----------------|-------------------|--------------------------|
| ES `<loc>` | 1001 | 1201 | **1201** |
| FR `<loc>` | 1001 | 1201 | **1201** |
| `/en` in XML | absent | absent | **absent** |
| draft/review | absent | absent | **absent** |

`listPublishedScholarshipDetailTranslations()` ES/FR distinct slugs: **1201 / 1201** — matches live XML.

**Net sitemap increase:** **+200** per locale (not +500).

---

## 4. Root cause

### Primary: **H + selector bug (same class as 5887ddf)**

`select-candidates-tiered.ts` (and legacy `select-candidates.ts`) built `translatedIds` with a **single non-paginated query**. PostgREST returns max **1000 rows**. With **~2400+** ES+FR `scholarship_detail` rows at wave-21 time, **~200+ already-translated `source_id`s were not excluded**.

Relaxed autopilot **re-upserted** those scholarships (same `source_id+locale`), updating `machine_model` but **not adding new sitemap URLs** → **+200 net** instead of **+500**.

### Secondary: **I — report / ops counting**

- “500 scholarships / 1000 rows” counted **publish batches**, not **net-new distinct `source_id`s** (417 in DB).
- Per-wave DB reports looked like partial waves (20/25/22 in 21–23) due to **`machine_model` reassignment** on later upserts, not failed publishes.

### Ruled out

| Hypothesis | Verdict |
|------------|---------|
| A. Rows not inserted | **No** — 834 relaxed rows exist |
| B. One locale only | **No** — 417 ES + 417 FR |
| C. Not published | **No** |
| D. Missing title/body | **No** |
| E. Source not indexable | **No** |
| F. Sitemap list pagination bug | **No** — list/XML agree at 1201 |
| G. Cache only | **No** — counts stable after revalidate |
| Routes 404 | **No** for eligible relaxed samples |

---

## 5. Fix applied

### Code (no new DB rows)

1. **`fetch-translated-source-ids.ts`** — paginated load of all translated `source_id`s.
2. **`select-candidates.ts`** + **`select-candidates-tiered.ts`** — use paginated exclusion.
3. **`listPublishedScholarshipDetailTranslations.ts`** — skip rows without `translated_title` (align list with sitemap SEO policy / `buildLocalizedSitemapEntry`).

### Verification after fix

| Check | Result |
|-------|--------|
| Publishable Tier A pool (correct exclusion) | **16,338** (was ~17,015 with cap bug) |
| Revalidate | OK |
| Live ES/FR sitemap | **1201 / 1201** (unchanged — correct) |
| `npm run build` | pass |
| `npx tsc --noEmit` | pass |
| i18n tests | 93/93 pass |

**No backfill** required — existing relaxed rows are valid; gap was **selector double-publish**, not missing fields.

---

## 6. Before / after

| Metric | Before fix | After fix |
|--------|------------|-----------|
| Selector exclusion | ~1000 rows max | **Full paginated set (~1201+ ids)** |
| Publishable pool (audit) | ~17,015 (inflated) | **16,338 (correct)** |
| Live sitemap | 1201 | **1201** (unchanged) |
| Wave 31 safe | **No** | **Yes** |

---

## 7. Wave 31 verdict

**Wave 31 allowed: YES**

Conditions:

- Use fixed selector (committed before wave 31).
- Expect **sitemap +N = net-new distinct scholarships** per wave, not raw upsert count.
- Track **before/after** `countSitemapEligibleEs/Fr` per wave.
- Do **not** relax SEO policy for weak rows.

---

## Artifacts

- `i18n-stage5e-10-relaxed-waves-21-30-sitemap-gap-audit-2026-05-23.csv`
- `i18n-stage5e-10-audit-summary-2026-05-23.json`
- `scripts/i18n/scholarship-detail-autopilot/audit-stage5e10-relaxed-sitemap-gap.ts`
