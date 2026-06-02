# Stage 5E-9 relaxed autopilot handoff (2026-05-23)

## Copy for ChatGPT

ScholarshipTop **scholarship_detail-only** relaxed autopilot (waves 21–30) completed.

1. **Start:** 1001 ES / 1001 FR detail sitemap (QA PASS).
2. **Selector:** Tiered audit — **17,015** Tier A publishable (was ~503 under strict 5k-cap selector). CSV: `i18n-stage5e-9-scholarship-candidate-pool-expanded-2026-05-23.csv`.
3. **Waves:** 21–30 accepted (**500** scholarships, **1000** rows, `$0` OpenAI).
4. **Final sitemap:** **1201 ES / 1201 FR** (+200 XML vs +500 DB publishes — audit eligibility gap).
5. **Gates:** validation, DB publish, route smoke, HTML, regressions — all green per wave.
6. **Fixes:** start-wave resume mapping (`70516ff`); `publishedAt` hour overflow for wave ≥24.
7. **Remaining:** ~16.8k Tier A candidates; continue wave **31+** with `stage5e-scholarship-autopilot-relaxed-wave-{N}`.
8. **Forbidden scope honored:** no provider/resource/essay/compare, no /en, no auth/payment.

**Rollback wave N:**

```sql
delete from public.content_translations
where source_type = 'scholarship_detail'
  and locale in ('es', 'fr')
  and machine_model = 'stage5e-scholarship-autopilot-relaxed-wave-{N}';
```

**Resume command:**

```powershell
$env:I18N_PILOT_ALLOW_DB_WRITES='1'
$env:I18N_PILOT_ALLOW_PRODUCTION='1'
$env:I18N_SCHOLARSHIP_AUTOPILOT='1'
npx tsx scripts/i18n/scholarship-detail-autopilot/run-relaxed-autopilot.ts --target=500 --wave-size=50 --start-wave=31
```
