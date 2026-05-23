# Stage 5E scholarship detail scale-up — seed & production smoke (2026-05-23)

## Summary

| Item | Value |
|------|--------|
| Scholarships (allowlist) | **56** (6 legacy + 50 scale-up) |
| `content_translations` rows (ES+FR) | **112** published `scholarship_detail` |
| Scale-up batches | 5 × 10 scholarships × 2 locales = **100** new rows |
| Code deploy | `a714323` on `main` |
| OpenAI spend | **$0** (deterministic factory) |
| Production sitemap | `locale-es|fr-scholarships-detail-db.xml` → **56** URLs each |

## Per-batch DB seed

All batches seeded via lean script (production, writes enabled in `.env.local`):

```bash
$env:I18N_SCHOLARSHIP_PILOT_BATCH='scale-N'
$env:I18N_PILOT_ALLOW_DB_WRITES='1'
$env:I18N_PILOT_ALLOW_PRODUCTION='1'
npx tsx scripts/i18n/seed-scholarship-scaleup-batch.ts
```

| Batch | `machine_model` | Rows upserted | Row CSV |
|-------|-----------------|---------------|---------|
| 1 | `stage5e-scholarship-manual-batch-1` | 20 | `i18n-stage5e-scholarship-detail-batch-1-rows-2026-05-22.csv` |
| 2 | `stage5e-scholarship-manual-batch-2` | 20 | `...-batch-2-rows-...` |
| 3 | `stage5e-scholarship-manual-batch-3` | 20 | `...-batch-3-rows-...` |
| 4 | `stage5e-scholarship-manual-batch-4` | 20 | `...-batch-4-rows-...` |
| 5 | `stage5e-scholarship-manual-batch-5` | 20 | `...-batch-5-rows-...` |

Legacy pilots (pre scale-up): `stage5e-scholarship-manual-pilot`, `stage5e-scholarship-manual-pilot-2`.

## Post-deploy production smoke

After `a714323` deploy (~3 min):

```bash
npx tsx scripts/seo/i18n-scholarship-detail-sitemap-verify.ts 56
# ES URLs: 56 FR URLs: 56 — OK

npx tsx scripts/seo/i18n-scholarship-detail-batch-smoke.ts 5
# All 10 batch-5 slugs: EN/ES/FR 200
# Unseeded slug: ES/FR 404
# Sitemaps 56+56, slugs present — Batch smoke passed
```

Gate checks (batch 5 script):

- `/scholarships/{slug}` → 200
- `/es|fr/scholarships/{slug}` → 200 for pilot slugs
- `/es|fr/scholarships/how-to-apply-for-a-scholarship-step-by-step` → 404
- No `/en/` or `review_required` in detail-db sitemaps

## Rollback (per batch)

```sql
delete from public.content_translations
where source_type = 'scholarship_detail'
  and locale in ('es', 'fr')
  and machine_model = 'stage5e-scholarship-manual-batch-{N}';  -- N = 1..5
```

To remove scale-up routes from production without DB delete, revert allowlist in `scholarshipPilotSlugs.ts` / `scaleUpBatchSlugs.ts` and redeploy.

## Notes

- Prefer `scripts/i18n/seed-scholarship-scaleup-batch.ts` over `seed-scholarship-detail-pilot-translations.ts` for scale batches (avoids long `tsc`/import hangs).
- Batch smoke can take several minutes (sequential HTTP); do not pipe through `Select-Object -Last` until the process exits.
