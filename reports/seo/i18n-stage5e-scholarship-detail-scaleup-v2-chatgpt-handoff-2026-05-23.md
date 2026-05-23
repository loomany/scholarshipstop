# ChatGPT handoff — Stage 5E-3 scholarship detail v2 (2026-05-23)

## Done

- **QA 56:** PASS (DB, sitemap, routes, HTML sample, build, tsc, i18n tests, regression smoke)
- **Scale +50:** batches 6–10 seeded in DB (`stage5e-scholarship-manual-batch-6` … `10`)
- **Allowlist:** 106 slugs in code (deploy required for routes/sitemap)
- **OpenAI:** $0

## Totals after deploy

- **106** scholarship detail pilots
- **212** ES+FR `content_translations` rows
- **106+106** detail-db sitemap URLs

## Key paths

- QA: `scripts/seo/i18n-stage5e-3-qa-current-56.ts`
- HTML: `scripts/seo/i18n-scholarship-detail-html-check.ts`
- Batch report: `scripts/seo/i18n-scholarship-detail-batch-smoke-report.ts`
- Seed: `scripts/i18n/seed-scholarship-scaleup-batch.ts` (`I18N_SCHOLARSHIP_PILOT_BATCH=scale-6..10`)
- Slugs v2: `lib/i18n/scholarshipPilot/scaleUpBatchSlugsV2.ts`

## Do not re-seed 6–10

## Rollback batch N (6–10)

```sql
delete from public.content_translations
where source_type = 'scholarship_detail' and locale in ('es','fr')
  and machine_model = 'stage5e-scholarship-manual-batch-N';
```

## Next

- Post-deploy smoke sitemap **106**
- Optional: finish retro batch 3–5 markdown via smoke-report script
- Next tranche: new candidates CSV → batch 11+
