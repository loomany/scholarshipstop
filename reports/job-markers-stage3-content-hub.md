# Stage 3: Job Markers for Service `Контент Хаб`

## Entry points reviewed from audit

From `reports/job-success-markers-audit.md`:

- Railway command: `npm run content:run-once`
- Runtime entrypoint: `services/content-hub/src/jobs/runContentJob.ts` (compiled to `dist/jobs/runContentJob.js`)

Only this real Railway job entrypoint was updated.

## Updated entrypoints

- `services/content-hub/src/jobs/runContentJob.ts`

Added unified envelope markers:

- `JOB_START`
- `JOB_PROGRESS`
- `JOB_DONE`
- `JOB_FAILED`

Added fields:

- `runId`
- `durationMs`
- `processed/success/failed/skipped`
- final status marker and exit semantics

## Counters (exact vs approximate)

Current counter mapping in `runContentJob.ts`:

- `processed`: increments when `processOneTopic()` returns `published` or `deferred`
- `success`: increments when result is `published`
- `failed`: increments on uncaught loop error / fatal exception paths
- `skipped`: increments on `empty` (queue drained) and `deferred`

Counter quality:

- **Approximate** for `deferred`/`skipped` split: `deferred` can represent multiple business outcomes (review_needed, retryable/transient, non-fatal fallback), so it is mapped to `skipped` at envelope level.
- **Exact** for `published` success count from returned `processOneTopic()` status.

## Failure semantics

- Exception in `main` catch:
  - emits `JOB_FAILED`
  - exits with `process.exit(1)`
- Uncaught errors inside continuous loop:
  - counted into `failed`
  - emit `JOB_PROGRESS`
  - loop behavior preserved (continues as before)
- Success completion:
  - emits `JOB_DONE ... exit=0`

## What was NOT touched

- Content generation business logic
- prompts / AI generation logic
- matching logic
- SQL semantics / database schema
- auth/payments/Lemon/RLS
- SEO generation/indexing logic in other services

## Tests and checks

Executed:

- `npx tsx --test scripts/__tests__/job-markers.test.ts` ✅
- `npx tsc --noEmit` ✅
- Lint diagnostics for changed file ✅

## Diff summary

Updated file:

- `services/content-hub/src/jobs/runContentJob.ts`

Main changes:

- added marker envelope helpers in-file (`JOB_*` format)
- added run metadata (`runId`, start time, duration)
- added aggregated counters
- changed fatal exit handling from `process.exitCode = 1` to explicit `process.exit(1)` for strict failed-run semantics

No deploy performed.
