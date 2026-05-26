# Stage 5E-18 — Railway worker resume state fix (2026-05-25)

## Incident summary

Railway service `scholarship-i18n-worker` restarted after a failed wave with **unchanged env** `I18N_WORKER_START_WAVE=188`. The wrapper treated env as the source of truth, re-spawned the child at wave **188**, and appended more `content_translations` rows under the same `machine_model` (`stage5e-scholarship-autopilot-relaxed-wave-188`). DB verify then failed with **`DB rows 1000 != 300`** because verify counted **all** rows for that `machine_model`, not only the current batch `source_id`s.

## Root cause

1. **Resume**: `START_WAVE` from env was passed directly to the child on every container start.
2. **Verify**: `verifyDbWave` compared total `machine_model` row count to expected batch size.
3. **State**: No durable `next_wave` — lock released on exit, progress lost on restart.
4. **Railway**: Restart policy re-ran the same deployment with the same env after exit code ≠ 0.

## Fix (code)

| Area | Change |
|------|--------|
| Resume | `actualStartWave = max(requestedStartWave, nextSafeStartWave)`; `I18N_WORKER_RESUME_MODE=auto\|strict` (default **auto**) |
| Progress | New table `i18n_scholarship_worker_progress` (migration `20260525120000`) |
| Idempotency | `resolveRunnableStartWave` skips **complete** / **polluted_valid** waves; child pre-wave guard; no append without `I18N_WORKER_FORCE_START_WAVE=1` |
| Verify | `verifyDbWave(..., expectedSourceIds)` — batch-only + pollution warning |
| Exit | Strict env mismatch → exit **0** + message; partial wave → exit **1**; lock always released in `finally` |

## Pre-run audit (read-only; run before next Railway deploy)

**Operator:** apply migration `20260525120000_i18n_scholarship_worker_progress.sql` to production Supabase, then run:

```bash
npm run i18n:scholarship-autopilot:status
npm run i18n:scholarship-autopilot:audit-repeat
```

### Expected checks (from Stage 5E-17 baseline + wave 188 incident)

| Check | Action |
|-------|--------|
| Lock held | Must be **no** before starting worker |
| ES/FR sitemap | Record live counts (baseline ~13051/13051 after wave 187) |
| Wave 188 rows | Count under `relaxed-wave-188`; if **> 300** and published → **polluted_valid**, do **not** rollback |
| Wave 189+ | Scan 189–200 for any `machine_model` rows |
| Latest clean wave | `findLatestAcceptedRelaxedWave` → last coherent wave |
| **nextSafeStartWave** | `max(state.next_wave, latestAccepted + 1)` after migration |
| Rollback | **Only** if partial/broken rows break public pages — **not** for polluted-valid published waves |

### Rollback policy

- **Do not** rollback valid published scholarship_detail rows.
- **Do not** touch main Site, auth, payment, Lemon, or `/en`.
- Rollback **only** broken partial rows that break public routes or safety.

## Next safe Railway env (after deploy + migration)

```env
I18N_WORKER_START_WAVE=<nextSafeStartWave from audit>
I18N_WORKER_RESUME_MODE=auto
I18N_WORKER_TARGET=300
I18N_WORKER_WAVE_SIZE=150
I18N_WORKER_MAX_RUNTIME_MINUTES=600
I18N_WORKER_REQUIRE_LOCK=1
```

**Do not set:**

- `I18N_WORKER_FORCE_START_WAVE=1`
- `I18N_WORKER_MAX_WAVES=1` (unless intentional one-wave test)

**Railway service settings:**

- Auto-deploy **OFF**
- Restart policy **Never** / one-shot
- Public domain **OFF**

## Verification after deploy

1. Dry-run locally: `I18N_WORKER_DRY_RUN=1` + production guards as needed.
2. First prod test: `I18N_WORKER_TARGET=300`, single worker run.
3. Confirm on restart simulation: env `START_WAVE` stale → worker logs warn and uses `nextSafeStartWave` / `state.next_wave`.
4. Confirm wave with existing rows is skipped, not appended.

## Tests

```bash
npx tsx --test lib/i18n/__tests__/workerResume.test.ts lib/i18n/__tests__/scholarshipAutopilotWorkerConfig.test.ts
npx tsc --noEmit
npm run build
```
