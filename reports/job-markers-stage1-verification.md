# Stage 1 Verification: SEO Indexing Job Markers

Scope:

- `scripts/cron-google-indexing-flush.ts`
- `scripts/cron-check-index-worker.ts`
- `scripts/cron-scan-indexing.ts`

Constraints followed:

- No code changes in this verification step.
- No deploy actions.
- No dangerous runtime operations (forced-failure checks only, via empty Supabase env).

## Dry-run availability

Checked all 3 entrypoints for `dry-run`/`--dry-run`: **not available**.

## Execution checks performed

Forced-failure mode used (safe): `NEXT_PUBLIC_SUPABASE_URL=''` and `SUPABASE_SERVICE_ROLE_KEY=''`.

### 1) `cron-google-indexing-flush.ts` (forced failure)

- `JOB_START`: present
- `JOB_PROGRESS`: present
- `JOB_FAILED`: present
- `runId` consistency inside run: yes (same `runId` across marker lines)
- `durationMs` in failed marker: present
- counters in markers: present
- process exit code: `1`
- `JOB_DONE`: not expected in failed run, not emitted

Observed marker lines:

- `JOB_START service="Сео индексация" job="google-indexing-flush" runId="8c98d12f-6708-4b60-8930-5fc4e088a8be" ...`
- `JOB_PROGRESS service="Сео индексация" job="google-indexing-flush" runId="8c98d12f-6708-4b60-8930-5fc4e088a8be" processed=0 success=0 failed=0 skipped=0`
- `JOB_FAILED service="Сео индексация" job="google-indexing-flush" runId="8c98d12f-6708-4b60-8930-5fc4e088a8be" durationMs=8 ...`

### 2) `cron-check-index-worker.ts` (forced failure)

- `JOB_START`: present
- `JOB_FAILED`: present
- `runId` consistency inside run: yes
- `durationMs` in failed marker: present
- counters in failed marker: present
- process exit code: `1`
- `JOB_PROGRESS`: **missing** (failure occurs before progress emission)
- `JOB_DONE`: not expected in failed run, not emitted

### 3) `cron-scan-indexing.ts` (forced failure)

- `JOB_START`: present
- `JOB_FAILED`: present
- `runId` consistency inside run: yes
- `durationMs` in failed marker: present
- counters in failed marker: present
- process exit code: `1`
- `JOB_PROGRESS`: **missing** (failure occurs before progress emission)
- `JOB_DONE`: not expected in failed run, not emitted

## Success-path verification status

Direct live success execution was intentionally not run in this step because no dry-run exists and these jobs use real DB/service-role integration.

Safe success verification method (pre-deploy on controlled env):

1. Use staging/isolated Railway environment with valid service-role credentials.
2. Run each entrypoint once with minimal batch limits:
   - `URL_INSPECTION_PENDING_BATCH=1`
   - `URL_INSPECTION_SUBMITTED_BATCH=1`
   - `GOOGLE_INDEXING_FLUSH_LIMIT=1`
3. Confirm per run:
   - `JOB_START` -> `JOB_PROGRESS` -> `JOB_DONE ... exit=0`
   - single stable `runId`
   - non-empty `durationMs`
   - counters present.

## Required commands run

- `npx tsx --test scripts/__tests__/job-markers.test.ts` -> pass
- `npx tsc --noEmit` -> pass

## Verdict

`NEEDS_FIX`

Reason:

- Stage requirement says `JOB_PROGRESS` must appear; currently in forced-failure runs it appears only for `cron-google-indexing-flush.ts`, but not for `cron-check-index-worker.ts` and `cron-scan-indexing.ts` when they fail early before progress logging.
