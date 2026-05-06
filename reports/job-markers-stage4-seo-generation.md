# Stage 4: Job Markers for Service `Сео генерация`

## Entry points from audit

From `reports/job-success-markers-audit.md`:

- Railway command: `bash scripts/railway-cron.sh seo-generation-http`
- Existing path: `scripts/railway-cron.sh` -> `scripts/railway-cron-post.mjs` (HTTP calls)

## Updated real job entrypoints

- `scripts/railway-cron.sh` (only task routing/error semantics for `seo-generation-http`)
- `scripts/cron-seo-generation-http.ts` (new runtime entrypoint used by Railway task)

`task_seo_generation_http` now runs:

- `run_tsx_cron "cron-seo-generation-http" "scripts/cron-seo-generation-http.ts" 1`

The strict flag ensures non-zero exit propagates for failed SEO generation runs.

## JOB_* envelope implementation

In `scripts/cron-seo-generation-http.ts` (using `scripts/job-markers.ts`):

- `JOB_START` at run begin
- `JOB_PROGRESS` after each endpoint call
- `JOB_DONE ... exit=0` if all endpoint calls succeed
- `JOB_FAILED` + `process.exit(1)` on exception or any failed endpoint result

## Counters (exact vs approximate)

Endpoint calls in this job:

1. `/api/internal/seo/worker-generate`
2. `/api/internal/seo/meta-generate`

Counters mapping:

- `processed`: number of endpoint calls attempted (0..2)
- `success`: number of endpoint calls with HTTP 2xx
- `failed`: number of endpoint calls with non-2xx or fetch exception
- `skipped`: `0` (this flow has no internal skip branch)

Counter quality:

- **Exact at HTTP-call level**
- **Approximate for business objects generated** (response body shape differs by endpoint, so per-item generated counts are not normalized here)

## Failure semantics

- Exception path: `JOB_FAILED` emitted and `process.exit(1)`
- Explicit failed result (non-2xx response): counted as failure; final run emits `JOB_FAILED` + `process.exit(1)`
- Success path: emits `JOB_DONE ... exit=0`

## Tests/checks run

- `npx tsx --test scripts/__tests__/job-markers.test.ts` ✅
- `npx tsc --noEmit` ✅

## Diff summary

Updated:

- `scripts/railway-cron.sh`
  - `run_tsx_cron` now supports optional strict mode
  - `task_seo_generation_http` switched to strict tsx entrypoint execution

Added:

- `scripts/cron-seo-generation-http.ts`
  - unified JOB marker envelope
  - two endpoint calls preserved (`worker-generate`, `meta-generate`)
  - strict failure -> non-zero exit

## What was NOT touched

- SEO generation business logic in API handlers
- prompts
- URL generation
- SQL semantics / DB schema
- sitemap / canonical / robots / metadata logic
- auth/payments/Lemon/RLS

No deploy performed.
