# Stage 6: Job Markers for Service `Рассылка`

## Updated entrypoints

From `reports/job-success-markers-audit.md`, real Railway/job entrypoint for this service:

- `bash scripts/railway-cron.sh grant-notifications` -> `scripts/cron-grant-notifications.ts`

Updated only:

- `scripts/cron-grant-notifications.ts`

No helper/lib/business modules were changed.

## JOB_* envelope changes

Unified via `scripts/job-markers.ts`:

- `JOB_START`
- `JOB_PROGRESS`
- `JOB_DONE`
- `JOB_FAILED`

Added run-level fields:

- `runId`
- `durationMs`
- canonical counters (`processed/success/failed/skipped`)

## Counters mapping (exact/approximate)

Mapped from `runGrantNotificationDispatch()` result:

- `processed = scholarshipsConsidered`
- `success = emailSent + telegramSent`
- `failed = errors`
- `skipped = skippedDup`

Quality:

- **Approximate** for `processed` vs delivery attempts: `scholarshipsConsidered` is top-level business scope, while sends are channel-level actions.
- **Exact** relative to returned dispatch summary fields.

## Failure semantics

- Exception path (`main().catch`) emits `JOB_FAILED` and exits `process.exit(1)`.
- Explicit failed result (`result.ok === false`) now emits `JOB_FAILED`, sends fatal Telegram report, then `process.exit(1)`.
- Success path emits `JOB_DONE ... exit=0` and keeps successful flow unchanged.

## Diff summary

Updated file:

- `scripts/cron-grant-notifications.ts`

Key changes:

- imported `job-markers` helper
- initialized service/job/run metadata + counters
- emitted `JOB_START` at launch
- emitted `JOB_PROGRESS` after dispatch result
- added explicit failed-result branch (`!result.ok`) with `JOB_FAILED` + non-zero exit
- emitted `JOB_DONE` on success
- catch branch now emits `JOB_PROGRESS` and `JOB_FAILED` before fatal handling

## Tests/checks

Executed:

- `npx tsx --test scripts/__tests__/job-markers.test.ts` ✅
- `npx tsc --noEmit` ✅
- lints for updated entrypoint ✅

## What was NOT touched

- email business logic
- templates/content rendering
- SQL semantics / Supabase writes
- auth/payments/Lemon/RLS

No deploy performed.
