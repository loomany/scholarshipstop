# Stage 2: Job Markers for Service `Скрипты`

Scope source: `reports/job-success-markers-audit.md`

Service command:

- `bash scripts/railway-cron.sh all`

Service entrypoints covered in this stage:

- `scripts/enrich-all-providers.ts`
- `scripts/run-essay-pipeline-full.ts`
- `scripts/enqueue-manual-essay-guides.ts`
- `scripts/run-manual-essay-guides.ts`
- `scripts/audit-manual-essay-guides.ts`

## What was updated

All 5 entrypoints now emit a unified envelope via `scripts/job-markers.ts`:

- `JOB_START` with stable `runId`
- `JOB_PROGRESS` with counters
- `JOB_DONE` on success (`exit=0` in marker)
- `JOB_FAILED` on failures (`process.exit(1)` preserved)

Added in each entrypoint:

- `runId` (`createRunId()`)
- `start timestamp` (`Date.now()` baseline)
- `durationMs` on terminal markers
- per-script counters where data is available

## Counters availability by entrypoint

### `scripts/enqueue-manual-essay-guides.ts`

- **processed:** parsed topics
- **success:** inserted rows
- **failed:** `0` (script throws on DB failures)
- **skipped:** parsed but not inserted (already present / deduped)
- **quality:** exact for this job output model

### `scripts/run-manual-essay-guides.ts`

- **processed:** published count from run loop
- **success:** published count
- **failed:** `0` at envelope level (hard failures go to `JOB_FAILED`)
- **skipped:** `0` (not explicitly surfaced by this script)
- **quality:** partial (script result only exposes published total)

### `scripts/audit-manual-essay-guides.ts`

- **processed:** sum of `queue_status_counts`
- **failed:** `queue_status_counts.failed`
- **skipped:** `queue_status_counts.pending`
- **success:** `processed - failed - skipped`
- **quality:** approximate (status buckets mapped to canonical counters)

### `scripts/run-essay-pipeline-full.ts`

- **processed:** number of rounds executed
- **success:** number of completed essay publish phases tracked by script
- **failed:** `1` on terminal failure path, else `0`
- **skipped:** `processed - success`
- **quality:** approximate (round-level pipeline can include non-terminal operational states)

### `scripts/enrich-all-providers.ts`

- **processed:** providers iterated in enrichment loop
- **success:** rows completed with DB update success
- **failed:** DB update failures (`upErr`)
- **skipped:** validation/quality/display-name skips
- **quality:** approximate for early-exit branches before queue loop (these runs keep zero counters by design)

## Failure semantics status

- Exception path now emits `JOB_FAILED` and keeps non-zero exit (`process.exit(1)`).
- Explicit failed status branches in `run-essay-pipeline-full.ts` were converted to thrown errors, so they also emit `JOB_FAILED` consistently.
- Success path emits `JOB_DONE`.

## Risky files intentionally not touched

- `scripts/railway-cron.sh` (shell orchestration logic)
- SEO generation/indexing job files for other services
- DB schema/migrations and SQL
- auth/payments/Lemon/RLS code paths

## Tests and checks run

- `npx tsx --test scripts/__tests__/job-markers.test.ts` -> pass
- `npx tsc --noEmit` -> pass

## Diff summary

Updated:

- `scripts/enrich-all-providers.ts`
- `scripts/run-essay-pipeline-full.ts`
- `scripts/enqueue-manual-essay-guides.ts`
- `scripts/run-manual-essay-guides.ts`
- `scripts/audit-manual-essay-guides.ts`

No deploy performed in this stage.
