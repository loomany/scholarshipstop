# 12-hour scholarship_detail autopilot — master report (2026-05-24)

## Summary

| Metric | Value |
|--------|-------|
| **Starting ES/FR sitemap** | **1701 / 1701** |
| **Final ES/FR sitemap** | **3701 / 3701** |
| **Net-new scholarships** | **+2000** |
| **ES+FR rows added** | **+4000** |
| **Waves attempted** | 42 (41–80 range) |
| **Waves accepted** | 40 (waves 41–80, all green) |
| **Waves failed/skipped** | 2 (wave 42 validation pre-fix; wave 63 transient publish — rolled back) |
| **OpenAI cost** | **$0** |
| **Build/tsc/tests** | PASS at checkpoints (npm run build, tsc, 95 i18n tests) |
| **Remaining Tier A pool** | ~13,838 |

## Run segments

| Segment | Waves | Net-new | Final sitemap | Notes |
|---------|-------|---------|---------------|-------|
| 1 | 41 | +50 | 1751 | Green |
| 2 | 42 (blocked) | 0 | 1751 | DAAD deadline `/en/` false positive — fixed |
| 3 | 42–62 | +1050 | 2801 | Green after deadline fix |
| 4 | 63 (partial) | 0 | 2801 | Transient Supabase upsert — 75 rows rolled back |
| 5 | 63–72 | +500 | 3301 | Green; checkpoint PASS |
| 6 | 73–80 | +400 | **3701** | Green; target +2000 from 1701 **complete** |

## Checkpoints (all PASS)

- `i18n-12hour-scholarship-autopilot-waves-42-51-checkpoint-2026-05-23.md` → 2251/2251
- `i18n-12hour-scholarship-autopilot-waves-52-61-checkpoint-2026-05-23.md` → 2751/2751
- `i18n-12hour-scholarship-autopilot-waves-63-72-checkpoint-2026-05-23.md` → 3301/3301

## Code fixes applied

1. `baseline-12hour.ts` — IQ fetch uses absolute URL (not `BASE`-prefixed)
2. `fetchScholarshipPilotFacts.ts` — `sanitizePilotDeadlineText()` strips DAAD scraped boilerplate
3. `validateScholarshipPilotSeedRows.ts` — `/en/` check targets ScholarshipTop locale leaks only
4. `publish-wave.ts` — 4× retry on transient upsert failures
5. `fetch-translated-source-ids.ts` — 4× retry on paginated fetch
6. `rollback-wave.ts` — `--relaxed` flag for relaxed machine_model

## Rollbacks performed

- Wave 63 partial publish: **75 rows deleted** (`stage5e-scholarship-autopilot-relaxed-wave-63`), re-run clean

## Rollback SQL (per wave)

```sql
delete from public.content_translations
where source_type = 'scholarship_detail'
  and locale in ('es', 'fr')
  and machine_model = 'stage5e-scholarship-autopilot-relaxed-wave-{N}';
```

## Rollback SQL (full run waves 41–80)

```sql
delete from public.content_translations
where source_type = 'scholarship_detail'
  and locale in ('es', 'fr')
  and machine_model ~ '^stage5e-scholarship-autopilot-relaxed-wave-(4[1-9]|[5-7][0-9]|80)$';
```

## Production anomalies

- Two transient Supabase `fetch failed` errors (wave 63 publish, wave 73 pre-flight) — resolved with retry + rollback/resume
- No `/en` routes, no review_required in sitemap, no English fallback observed in spot checks

## Recommendation

**Continue another +500** (waves 81–90 → sitemap 4201/4201) when ready. Pool ~13.8k Tier A remains; gates and tooling are stable after DAAD deadline + retry hardening.
