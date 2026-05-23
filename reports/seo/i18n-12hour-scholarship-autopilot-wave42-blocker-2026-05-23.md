# 12-hour scholarship autopilot — Wave 42 blocker (2026-05-23)

## Verdict: **RESOLVED** (code fix applied)

## Stop reason
`wave 42 validation fail rate 64.0% > 15%`

## Root cause
32/50 wave-42 candidates had DAAD-scraped `deadline_text` blobs containing `daad.de/go/en/...`. Deterministic overlay copy preserved the full blob, tripping forbidden phrase `/\/en\//i` in `validateScholarshipPilotSeedRows`.

Example slug: `hanns-seidel-foundation-phd-scholarships-10000132`

## Fix
- `sanitizePilotDeadlineText()` in `fetchScholarshipPilotFacts.ts` — keep human deadline line, drop scraped boilerplate
- Tightened `/en/` validator to ScholarshipTop locale leaks only (not external official URLs)

## Production state at stop
- ES/FR sitemap: **1751 / 1751** (wave 41 accepted; wave 42 not published)
- Net-new this run: **+50 scholarships / +100 rows**

## Resume
```powershell
$env:I18N_PILOT_ALLOW_DB_WRITES='1'
$env:I18N_PILOT_ALLOW_PRODUCTION='1'
$env:I18N_SCHOLARSHIP_AUTOPILOT='1'
npx tsx scripts/i18n/scholarship-detail-autopilot/run-relaxed-autopilot.ts --start-wave=42 --target=1950 --wave-size=50
```

## Rollback (wave 41 only, if needed)
```sql
delete from public.content_translations
where source_type = 'scholarship_detail'
  and locale in ('es', 'fr')
  and machine_model = 'stage5e-scholarship-autopilot-relaxed-wave-41';
```
