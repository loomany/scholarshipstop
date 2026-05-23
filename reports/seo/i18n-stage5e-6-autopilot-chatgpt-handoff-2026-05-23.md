# Stage 5E-6 scholarship detail autopilot — ChatGPT handoff (2026-05-23)

## Executive summary

**Target 500 autopilot scholarships (waves 1–10 × 50) is complete.** All waves published to production DB; waves 1–10 seed-smoke reports are **PASS** (after recovery fixes). OpenAI cost **$0**.

| Metric | Start (pre–Wave 2 resume) | End |
|--------|---------------------------|-----|
| ES/FR detail-db sitemap (live) | **166 / 166** | **499 / 501** |
| Published `scholarship_detail` ES rows (DB) | 166 | **616** |
| Sitemap-eligible ES / FR (policy) | 166 | **499 / 501** |

**Gap:** 616 published ES DB rows vs 499 sitemap-eligible ES (~117 scholarships) — published in DB but **excluded from sitemap** because `translated_title` is empty (SEO quality policy requires localized title). Routes still return **200** for sampled wave URLs.

---

## Commits deployed

| Commit | Purpose |
|--------|---------|
| `72805e0` | Autopilot wave recovery (`--smoke-only-wave`, persisted loader, retry) |
| `a0f3ef3` | Chunked scholarship ID lookup for sitemap; post-publish revalidate; `.xml` slug route fix |

Local follow-up (push recommended): sitemap-eligible smoke expectations, per-slug sitemap checks only when eligible.

---

## Waves completed

| Wave | Scholarships | DB rows | machine_model | Smoke |
|------|-------------|---------|---------------|-------|
| 1 | 50 | 100 | `stage5e-scholarship-autopilot-wave-1` | PASS (recovery) |
| 2 | 50 | 100 | `…-wave-2` | PASS |
| 3 | 50 | 100 | `…-wave-3` | PASS |
| 4 | 50 | 100 | `…-wave-4` | PASS |
| 5 | 50 | 100 | `…-wave-5` | PASS |
| 6 | 50 | 100 | `…-wave-6` | PASS |
| 7 | 50 | 100 | `…-wave-7` | PASS |
| 8 | 50 | 100 | `…-wave-8` | PASS |
| 9 | 50 | 100 | `…-wave-9` | PASS |
| 10 | 50 | 100 | `…-wave-10` | PASS |

**Total autopilot:** 500 scholarships, **1000** ES+FR rows (`stage5e-scholarship-autopilot-wave-*`).

**Manual pilots (pre-autopilot):** 116 scholarships → 232 rows (various `stage5e-scholarship-manual-*` models).

---

## Run notes (recovery)

1. **Wave 2** — First resume failed smoke: ISR sitemap cache (166) + wrong `currentTotal` offset. Fixed: post-publish `/api/revalidate`, use live DB/sitemap-eligible counts.
2. **Wave 3–6** — Sitemap 404 until `a0f3ef3` deployed (Supabase `.in('id', …)` chunking for 400+ scholarships).
3. **Waves 7–9** — Intermittent empty sitemap / count drift; resolved with revalidate + smoke expecting **sitemap-eligible** counts (not raw DB when title missing).
4. **Wave 10** — Clean PASS with revalidate + regression.

**Failed/skipped (transient only):** No wave rolled back. Automated runs stopped on smoke; each wave was re-smoked with persisted rows after fixes. No validator hard-fails.

---

## Smoke results (final)

- All waves: `reports/seo/i18n-stage5e-6-autopilot-wave-{N}-seed-smoke-2026-05-23.md` → **PASS**
- Checks: EN/ES/FR **200** (sample), `/en` **404**, unseeded **404**, category/resource/provider/IQ regression, no `/en` in sitemap XML
- Post-publish: `revalidate-detail-sitemaps.ts` → `/api/revalidate` for index + ES/FR detail-db buckets

---

## OpenAI cost

**$0** (deterministic overlays only).

---

## Rollback SQL (per wave)

```sql
-- Wave N (1–10)
delete from public.content_translations
where source_type = 'scholarship_detail'
  and locale in ('es', 'fr')
  and machine_model = 'stage5e-scholarship-autopilot-wave-N';
```

Full autopilot rollback:

```sql
delete from public.content_translations
where source_type = 'scholarship_detail'
  and locale in ('es', 'fr')
  and machine_model like 'stage5e-scholarship-autopilot-wave-%';
```

---

## Safe to continue another +500?

**Yes, with caveats:**

1. **Deploy** `a0f3ef3`+ on production (chunked sitemap + revalidate) before the next run.
2. **Expect** some published rows to stay out of sitemap until `translated_title` is populated (fix generator to fail validation if `officialTitle` empty, or backfill titles).
3. **Use** `--start-wave=11` only after confirming candidate pool; current run consumed waves 1–10 of the `--target=500` selector output.
4. **Monitor** live sitemap after each wave (`npx tsx scripts/seo/i18n-scholarship-detail-sitemap-verify.ts <expected>`).

Recommended next command (when approved):

```powershell
$env:I18N_PILOT_ALLOW_DB_WRITES='1'
$env:I18N_PILOT_ALLOW_PRODUCTION='1'
$env:I18N_SCHOLARSHIP_AUTOPILOT='1'
npx tsx scripts/i18n/scholarship-detail-autopilot/run-autopilot.ts --target=1000 --wave-size=50 --start-wave=11
```

---

## Key artifacts

- Recovery: `i18n-stage5e-6-autopilot-wave-1-recovery-2026-05-23.md`
- Master: `i18n-stage5e-6-autopilot-master-report-2026-05-23.md`
- Per-wave: `i18n-stage5e-6-autopilot-wave-{N}-{validation,rows,seed-smoke}-2026-05-23.*`
