# Stage 5E-6 autopilot Wave 1 recovery (2026-05-23)

## Decision: **Ready for Wave 2** (not started — user STOP on scaling)

Wave 1 is verified end-to-end on **persisted DB rows**. Do **not** trust the earlier retry smoke that regenerated `selectCandidates()`.

---

## 1. Deploy `d312a70`

| Check | Result |
|-------|--------|
| `origin/main` HEAD | `d312a70` — feat(i18n): scholarship detail autopilot pipeline and DB-published route gate |
| Route gate | DB-published `scholarship_detail` (no allowlist gate) — **required** for autopilot URLs |

**Live:** `origin/main` is at `d312a70`. Production smoke against Wave 1 DB slugs **PASS** (routes + sitemap 166), which confirms the DB-published gate is active for these rows.

**Local-only (uncommitted):** `fetchWithRetry` in `smoke-wave.ts` and `--smoke-only-wave` loading from DB/CSV in `run-autopilot.ts` + `load-persisted-wave.ts`. Not required for this recovery; recommend committing before the next full autopilot run to avoid `ECONNRESET` false failures.

---

## 2. Production DB — `stage5e-scholarship-autopilot-wave-1`

Query: `source_type = scholarship_detail`, `locale in (es, fr)`, `machine_model = stage5e-scholarship-autopilot-wave-1`. Slugs resolved via `scholarships.id` join (DB has no `source_slug` column).

| Metric | Expected | Actual |
|--------|----------|--------|
| Total rows | 100 | **100** |
| ES | 50 | **50** |
| FR | 50 | **50** |
| Distinct `source_id` | 50 | **50** |
| Distinct scholarship slugs | 50 | **50** |
| Status | all `published` | **100 × published** |
| `quality_score` | ≥ 85 | **100 × 90** |

Full slug list: [i18n-stage5e-6-autopilot-wave-1-db-audit-2026-05-23.md](./i18n-stage5e-6-autopilot-wave-1-db-audit-2026-05-23.md) (50 slugs).

Publish CSV (same slugs): [i18n-stage5e-6-autopilot-wave-1-rows-2026-05-23.csv](./i18n-stage5e-6-autopilot-wave-1-rows-2026-05-23.csv).

**Site totals after Wave 1:** 332 `scholarship_detail` rows (166 ES + 166 FR) — see [baseline](./i18n-stage5e-6-autopilot-baseline-2026-05-23.md).

---

## 3. Smoke-only fix

`--smoke-only-wave=N` now:

1. Loads slugs from DB (`machine_model = stage5e-scholarship-autopilot-wave-{N}`) + `scholarships` join.
2. Falls back to `reports/seo/i18n-stage5e-6-autopilot-wave-{N}-rows-*.csv` only if DB has no rows.
3. **Does not** call `selectCandidates()` or shift wave assignment.

Scripts: `load-persisted-wave.ts`, `verify-wave-db.ts`.

---

## 4. Smoke-only Wave 1 (persisted rows)

```text
npx tsx scripts/i18n/scholarship-detail-autopilot/run-autopilot.ts --target=500 --wave-size=50 --smoke-only-wave=1
```

| Check | Result |
|-------|--------|
| Slug source | **db** (50 scholarships, 100 rows) |
| Sample routes EN/ES/FR | **200** (10-slug sample, evenly spaced across persisted list) |
| Sitemap ES | **166** (expected ≥ 166) |
| Sitemap FR | **166** (expected ≥ 166) |
| `/en` | **404** |
| Unseeded ES/FR slugs | **404** |
| HTML ES/FR (5-slug sample) | **OK** |
| Category / resource / provider regression | **OK** |
| IQ markers | **OK** |
| Verdict | **PASS** |

Report: [i18n-stage5e-6-autopilot-wave-1-seed-smoke-2026-05-23.md](./i18n-stage5e-6-autopilot-wave-1-seed-smoke-2026-05-23.md).

**Sample slugs exercised (route smoke, ~every 5th of 50):** includes `alberta-graduate-excellence-scholarship-ages-at-university-of-calgary-20-alberta-graduate-excellence-scho`, `reisher-transfer-scholarship-at-university-of-colorado-boulder-2026-reisher-transfer-scholarship-at-`, `sports-scholarship-level-1-at-heriot-watt-university-2026-sports-scholarship-level-at-heri`, `cambridge-trust-international-scholarship-at-university-of-cambridge-202-cambridge-international-scholars`, `environment-graduate-student-award-at-university-of-waterloo-2026-environment-graduate-student-awa`, and five others — full set in db-audit.

---

## 5. Prior failure (context)

| Event | Cause |
|-------|--------|
| First autopilot run post-seed | `ECONNRESET` during HTTP smoke (transient network) |
| Ad-hoc `--smoke-only-wave=1` before fix | Regenerated candidate list → **invalid 404s** |

---

## 6. Next step (when scaling resumes)

**Do not run until explicitly approved** (per STOP):

```powershell
$env:I18N_PILOT_ALLOW_DB_WRITES='1'
$env:I18N_PILOT_ALLOW_PRODUCTION='1'
$env:I18N_SCHOLARSHIP_AUTOPILOT='1'
npx tsx scripts/i18n/scholarship-detail-autopilot/run-autopilot.ts --target=500 --wave-size=50 --start-wave=2
```

**Rollback** (only if a future smoke shows real content/route breakage):

```sql
delete from public.content_translations
where source_type = 'scholarship_detail'
  and locale in ('es', 'fr')
  and machine_model = 'stage5e-scholarship-autopilot-wave-1';
```

---

## Summary

| Item | Status |
|------|--------|
| `d312a70` on `main` | Yes |
| Wave 1 DB rows | **Match expected (100 / 50+50 / published / q=90)** |
| Persisted-slug smoke | **PASS** |
| Sitemap | **166 ES + 166 FR** |
| Wave 2 | **Not started** — safe to resume when you lift STOP |
