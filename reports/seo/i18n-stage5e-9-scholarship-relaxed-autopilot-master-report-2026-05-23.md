# Stage 5E-9 relaxed scholarship_detail autopilot — master report (2026-05-23)

## Summary

| Metric | Value |
|--------|-------|
| Start ES/FR sitemap (pre–wave 21) | **1001 / 1001** |
| Final ES/FR sitemap (production) | **1201 / 1201** |
| Sitemap net increase | **+200** |
| Scholarships published (waves 21–30) | **500** |
| Translation rows upserted | **1000** |
| Waves accepted | **10 / 10** (21–23 + 24–30) |
| OpenAI cost | **$0** |
| Stop reason | **completed** (target 500) |

## Phase 0 — tooling

- Committed `70516ff`: `fix(i18n): harden scholarship autopilot resume tooling`
- `run-autopilot.ts` start-wave bucket mapping
- `rollback-wave.ts` helper

## Phase 1 — QA at 1001/1001

- Report: `i18n-stage5e-9-current-1001-scholarship-detail-qa-2026-05-23.md`
- **PASS** — 1001/1001, 30 routes, 10 unseeded 404, HTML/regressions OK

## Phase 2 — tiered selector audit

| Tier | Untranslated indexable count |
|------|------------------------------|
| A (publish) | **17,015** |
| B (publish) | **0** |
| C (review) | **0** |
| D (reject) | **2,086** |

CSV: `i18n-stage5e-9-scholarship-candidate-pool-expanded-2026-05-23.csv`

Strict prior selector (~503) was **too narrow** (5k row cap + tight risk filter). Full-table paginated scan found **17k+** Tier A candidates.

## Waves 21–30

| Wave | Scholarships | Sitemap ES (post-wave) | Smoke |
|------|-------------|------------------------|-------|
| 21 | 50 | 1051 | PASS |
| 22 | 50 | 1101 | PASS |
| 23 | 50 | 1151 | PASS |
| 24 | 50 | 1151 | PASS |
| 25 | 50 | 1168 | PASS |
| 26 | 50 | 1201 | PASS |
| 27 | 50 | 1201 | PASS |
| 28 | 50 | 1201 | PASS |
| 29 | 50 | 1201 | PASS |
| 30 | 50 | 1201 | PASS |

`machine_model`: `stage5e-scholarship-autopilot-relaxed-wave-{N}`

### Incident — wave 24 timestamp

First batch stopped at wave 24: invalid `publishedAt` hour `24` from `T${waveNum}:30`. Fixed in `generate-overlays.ts` (`hour = 10 + (waveNum % 14)`). Resumed waves 24–30.

### Sitemap vs DB note

**500** scholarships were published to DB, but production detail sitemap grew **1001 → 1201 (+200)**. ~300 published rows may not yet meet sitemap eligibility (or need revalidation audit). Per-wave smoke used **dynamic** eligible counts and passed; investigate `listPublishedScholarshipDetailTranslations` / title gates for relaxed batch if counts should be +500.

## Build / tests

- `npm run build` — pass (Phase 0)
- `npx tsc --noEmit` — pass
- `npx tsx --test lib/i18n/__tests__/*.test.ts` — pass
- Regression every 2 waves during run — pass

## Rollback

```sql
delete from public.content_translations
where source_type = 'scholarship_detail'
  and locale in ('es', 'fr')
  and machine_model = 'stage5e-scholarship-autopilot-relaxed-wave-{N}';
```

## Remaining pool

~**16,813** Tier A publishable scholarships (17,015 − ~202 net sitemap-visible).

## Next recommendation

1. Commit Stage 5E-9 scripts (`select-candidates-tiered.ts`, `run-relaxed-autopilot.ts`, `qa-stage5e9-current-1001.ts`, `generate-overlays.ts` hour fix).
2. Audit why ~300 relaxed rows are published but not in detail sitemap (+200 vs +500).
3. Continue **wave 31+** with same relaxed pipeline (`--start-wave=31 --target=500`) after sitemap gap understood.
4. Do **not** switch to provider/resource/essay/compare.
