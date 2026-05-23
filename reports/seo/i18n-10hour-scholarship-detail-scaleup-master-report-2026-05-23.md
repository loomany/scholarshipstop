# 10-hour scholarship_detail scale-up — master report (2026-05-23)

## Objective

Expand ES/FR `scholarship_detail` pilots from **6** to **56** scholarships (preferred cap 50 scale-up + 6 legacy), with batched seeding, validation, production deploy, and sitemap/route smoke.

## Outcome: complete

| Metric | Before | After |
|--------|--------|-------|
| Pilot slugs (code allowlist) | 6 | **56** |
| `scholarship_detail` DB rows (ES+FR) | 12 | **112** |
| Detail-db sitemap URLs per locale | 6 | **56** |
| OpenAI cost | — | **$0** |

## Git & deploy

| Commit | Description |
|--------|-------------|
| `404ba41` | Sitemap service-role join (prerequisite) |
| `6f16e32` | Post-deploy verify docs |
| **`a714323`** | **Scale-up: 50 slugs, lean seeder, validators, smoke scripts** |

Pushed to `origin/main`; production verified after deploy.

## Architecture

1. **Candidates** — `reports/seo/i18n-10hour-scholarship-detail-candidates-2026-05-22.csv` (50 slugs, 5×10).
2. **Allowlist** — `lib/i18n/scholarshipPilot/scaleUpBatchSlugs.ts` + union in `scholarshipPilotSlugs.ts` (`Set` lookup, `ScholarshipDetailPilotSlug = string`).
3. **Content** — `fetchScholarshipPilotFacts.ts` + existing `scholarshipPilotContentFactory.ts` overlay; `buildScholarshipDetailPilotSeedRowsForSlugs()` in `scholarshipPilotTranslationsData.ts`.
4. **Validation** — `validateScholarshipPilotSeedRows.ts`.
5. **Seed** — `scripts/i18n/seed-scholarship-scaleup-batch.ts` (`I18N_SCHOLARSHIP_PILOT_BATCH=scale-1..5`).
6. **Smoke** — `scripts/seo/i18n-scholarship-detail-batch-smoke.ts`, `i18n-scholarship-detail-sitemap-verify.ts`.

## Batch registry

| Batch | Slugs | `machine_model` |
|-------|-------|-----------------|
| Legacy 5E-1 | 1 | `stage5e-scholarship-manual-pilot` |
| Legacy 5E-2 | 5 | `stage5e-scholarship-manual-pilot-2` |
| Scale 1–5 | 10 each | `stage5e-scholarship-manual-batch-{1..5}` |

Full slug lists: `lib/i18n/scholarshipPilot/scaleUpBatchSlugs.ts`.

## Verification

- `npx tsc --noEmit` — pass
- `npm run build` — pass
- Production: `i18n-scholarship-detail-sitemap-verify.ts 56` — pass
- Production: `i18n-scholarship-detail-batch-smoke.ts 5` — pass (cumulative 56 URLs + batch-5 routes)

Detail: [i18n-stage5e-scholarship-detail-scaleup-seed-smoke-2026-05-23.md](./i18n-stage5e-scholarship-detail-scaleup-seed-smoke-2026-05-23.md)

## Operational commands

```bash
# Re-seed one batch (dry-run: omit production write flags)
I18N_SCHOLARSHIP_PILOT_BATCH=scale-3 npx tsx scripts/i18n/seed-scholarship-scaleup-batch.ts

# Smoke batch N after deploy
npx tsx scripts/seo/i18n-scholarship-detail-batch-smoke.ts N

# Sitemap count check
npx tsx scripts/seo/i18n-scholarship-detail-sitemap-verify.ts 56
```

## Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Routes 404 with DB rows present | Deploy must include `a714323` allowlist |
| Heavy seed script hang | Use lean `seed-scholarship-scaleup-batch.ts` only |
| Sitemap under-count | `404ba41` service role; republish needs published translations |

## Follow-ups (optional)

- Spot-check hreflang / no EN body leak on random ES/FR detail pages
- Batch 1–4 dedicated smokes (batch 5 already validates cumulative sitemap)
- Next scale tranche: new CSV + `generate-scaleup-batch-slugs.ts` workflow

## Artifacts

- Baseline: `i18n-10hour-scholarship-detail-scaleup-baseline-2026-05-22.md`
- Execution log: `i18n-10hour-scholarship-detail-scaleup-execution-log-2026-05-22.md`
- Handoff: `i18n-10hour-scholarship-detail-scaleup-chatgpt-handoff-2026-05-23.md`
