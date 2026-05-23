# ChatGPT handoff — scholarship_detail scale-up (2026-05-23)

## Done

- **56** scholarship detail pilot slugs in code (`a714323`).
- **112** published ES+FR `content_translations` rows (`scholarship_detail`).
- Production sitemaps: **56** ES + **56** FR in `locale-*-scholarships-detail-db.xml`.
- Production smoke (batch 5 + sitemap verify): **green**.

## Do not re-seed

DB already has batches 1–5 (`stage5e-scholarship-manual-batch-1` … `5`). Only re-run seed if verification shows gaps.

## Key files

- Allowlist: `lib/i18n/scholarshipPilot/scaleUpBatchSlugs.ts`, `scholarshipPilotSlugs.ts`
- Seed: `scripts/i18n/seed-scholarship-scaleup-batch.ts`
- Smoke: `scripts/seo/i18n-scholarship-detail-batch-smoke.ts`, `i18n-scholarship-detail-sitemap-verify.ts`
- Master: `reports/seo/i18n-10hour-scholarship-detail-scaleup-master-report-2026-05-23.md`

## Rollback one batch

```sql
delete from public.content_translations
where source_type = 'scholarship_detail' and locale in ('es','fr')
  and machine_model = 'stage5e-scholarship-manual-batch-N';
```

## Next work ideas

1. Expand beyond 56 with new candidate CSV + codegen slugs.
2. i18n tests / hreflang audit on scholarship detail pages.
3. Deprecate or slim `seed-scholarship-detail-pilot-translations.ts` for scale paths.

## Context commits

`404ba41` (sitemap fix) → `a714323` (56-slug allowlist + seeder).
