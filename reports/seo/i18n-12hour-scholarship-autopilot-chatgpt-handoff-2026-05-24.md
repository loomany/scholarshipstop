# 12-hour scholarship autopilot — ChatGPT handoff (2026-05-24)

Copy for ChatGPT:

## Result: **+2000 net-new scholarships COMPLETE**

- **Starting ES/FR sitemap:** 1701 / 1701
- **Final ES/FR sitemap:** 3701 / 3701
- **Net-new scholarships:** +2000 (+4000 ES+FR rows)
- **Waves accepted:** 40 (waves 41–80, machine_model `stage5e-scholarship-autopilot-relaxed-wave-{N}`)
- **Waves failed then recovered:** wave 42 (DAAD deadline validation — code fixed), wave 63 (transient DB upsert — rolled back 75 rows, re-run clean)
- **OpenAI cost:** $0 (deterministic overlays only)
- **Build/tsc/i18n tests:** PASS at 10-wave checkpoints
- **Checkpoints:** 42–51 (2251), 52–61 (2751), 63–72 (3301) — all PASS
- **Remaining Tier A pool:** ~13,838
- **No production regressions:** category/resource/provider/IQ smokes green; no `/en`, no review_required in sitemap

## Blockers fixed this run

1. Baseline IQ check used wrong URL join (`fetchText` + absolute IQ URL)
2. DAAD `deadline_text` blobs contained `daad.de/go/en/...` → added `sanitizePilotDeadlineText()`
3. Transient Supabase network errors → upsert + paginated-ID fetch retries; relaxed rollback `--relaxed`

## Next recommendation

Continue **+500 scholarships** (waves 81–90, target sitemap 4201/4201):

```powershell
$env:I18N_PILOT_ALLOW_DB_WRITES='1'
$env:I18N_PILOT_ALLOW_PRODUCTION='1'
$env:I18N_SCHOLARSHIP_AUTOPILOT='1'
npx tsx scripts/i18n/scholarship-detail-autopilot/run-relaxed-autopilot.ts --start-wave=81 --target=500 --wave-size=50
```

## Rollback last wave only

```sql
delete from public.content_translations
where source_type = 'scholarship_detail'
  and locale in ('es', 'fr')
  and machine_model = 'stage5e-scholarship-autopilot-relaxed-wave-80';
```

## Commits

- `6f9e1e8` — 12-hour baseline + checkpoint runner
- `d74c304` — DAAD deadline sanitization
- `703a01f` — publish upsert retry + relaxed rollback
