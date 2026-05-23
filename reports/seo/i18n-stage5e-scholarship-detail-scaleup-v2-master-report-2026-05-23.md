# Stage 5E-3 scholarship_detail scale-up v2 — master report (2026-05-23)

## Summary

| Metric | Before v2 | After v2 |
|--------|-----------|----------|
| Pilot slugs (allowlist) | 56 | **106** |
| `scholarship_detail` rows (ES+FR) | 112 | **212** |
| Detail-db sitemap URLs / locale | 56 | **106** (after deploy) |
| New batches | — | **6–10** (+50 scholarships, +100 rows) |
| OpenAI | $0 | **$0** |

## Phase 1 — QA current 56: PASS

- DB: 112 rows, 56 ES + 56 FR, all `published`, `quality_score >= 85`
- Sitemap: 56+56, no `/en`, no draft/review
- Routes: 56×3 HTTP — all 200; 3 unseeded → 404
- HTML: 10 random slugs × ES/FR — pass (hreflang cluster + overlay markers)
- `npm run build`, `tsc`, i18n tests (91) — pass
- Production regression smoke — pass

Report: `i18n-stage5e-current-56-scholarship-detail-qa-2026-05-23.md`

## Phase 2 — Script hardening

- `i18n-stage5e-3-qa-current-56.ts` — full 56 QA
- `i18n-scholarship-detail-html-check.ts` — canonical, hreflang, robots, overlay, EN-fallback heuristics
- `i18n-scholarship-detail-batch-smoke-report.ts` — per-batch markdown (batches 1–10)
- `i18n-stage5e-3-production-regression-smoke.ts` — hubs, category, resource, provider, IQ
- `i18n-stage5e-scholarship-detail-next-candidates.ts` + `generate-scaleup-batch-slugs-v2.ts`
- Batch smoke extended to batches **1–10**

## Phase 3–4 — Batches 6–10

- Candidates: `i18n-stage5e-scholarship-detail-next-candidates-2026-05-23.csv` (50 slugs, batches 6–10)
- Allowlist: `scaleUpBatchSlugsV2.ts` + union in `scholarshipPilotSlugs.ts`
- Seeded production: `stage5e-scholarship-manual-batch-6` … `batch-10` (20 rows each)
- Row CSVs: `i18n-stage5e-scholarship-detail-batch-{6..10}-rows-2026-05-23.csv`

## Retroactive batch reports (1–5)

- `i18n-stage5e-scholarship-detail-batch-{1,2}-seed-smoke-2026-05-23.md` — production smoke PASS
- Batches 3–5 reports: run `npx tsx scripts/seo/i18n-scholarship-detail-batch-smoke-report.ts N`

## Rollback SQL (new batches only)

```sql
delete from public.content_translations
where source_type = 'scholarship_detail'
  and locale in ('es', 'fr')
  and machine_model = 'stage5e-scholarship-manual-batch-{N}';  -- N = 6..10
```

## Recommendation

- **Continue +10** (batch 11) after 24–48h monitoring post-deploy
- **Safe to scale further:** yes, same gates
- **Do not re-seed** batches 6–10 without gap verification

## Post-deploy verify

```bash
npx tsx scripts/seo/i18n-scholarship-detail-sitemap-verify.ts 106
$env:EXPECTED_DETAIL_SITEMAP='106'; npx tsx scripts/seo/i18n-stage5e-3-production-regression-smoke.ts
npx tsx scripts/seo/i18n-scholarship-detail-batch-smoke-report.ts 10
```
