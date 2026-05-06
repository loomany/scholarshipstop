# Stage 7: Job Markers for Service `Рассылка провайдеры`

## Updated entrypoints

From `reports/job-success-markers-audit.md`, real Railway/job entrypoint:

- `npx --yes tsx scripts/send-provider-outreach-emails.ts && ...`

Updated only:

- `scripts/send-provider-outreach-emails.ts`

No helper/libs were modified.

## JOB_* envelope changes

Unified via `scripts/job-markers.ts`:

- `JOB_START`
- `JOB_PROGRESS`
- `JOB_DONE`
- `JOB_FAILED`

Implementation notes:

- single `runId` per script invocation
- terminal marker emitted from `process.on('exit')` to cover all existing `process.exit(...)` branches without changing business flow
- `durationMs` always included in terminal marker

## Counters mapping (exact/approximate)

Unified counters object:

- `processed`
- `success`
- `failed`
- `skipped`

Per mode mapping:

- `--test-samples`:
  - processed = sample count
  - success = sentResend
  - failed = fail
  - skipped = skippedUnsub
- `--test` single send:
  - processed = 1
  - success/failed/skipped mapped from tally (`sent` / `failed` / `skipped_unsubscribed`)
- bulk list mode:
  - processed = `slice.length`
  - success = `sentResend`
  - failed = `fail`
  - skipped = `skippedUnsub + skippedCampaign`
- dry-run branches:
  - processed = planned recipients
  - success = 0
  - failed = 0
  - skipped = processed

Quality:

- **Exact** for final summary counts in completed branches.
- **Approximate** for early-abort fatal branches (e.g., campaign-log lookup/insert failure), where run stops mid-stream and counters reflect last captured state.

## Failure semantics

- exception path (`main().catch`) -> `JOB_FAILED` + `process.exit(1)`
- explicit failed result branches (existing `process.exit(1)` paths and non-zero `exitCode`) -> terminal `JOB_FAILED`
- success (`exitCode=0`) -> terminal `JOB_DONE exit=0`

## Diff summary

Updated file:

- `scripts/send-provider-outreach-emails.ts`

Main changes:

- added `job-markers` import and run metadata (`SERVICE_NAME`, `JOB_NAME`, `RUN_ID`, start time)
- added unified counters state
- added terminal marker emission hook (`process.on('exit')`)
- added `JOB_START` at script start
- mapped existing run summaries into unified counters in test/test-samples/bulk branches
- captured explicit fatal reasons into `lastFailure` in critical early-abort branches

## Tests/checks

Executed:

- `npx tsx --test scripts/__tests__/job-markers.test.ts` ✅
- `npx tsc --noEmit` ✅
- lints for updated entrypoint ✅

## What was NOT touched

- provider mailing business logic
- templates and email content generation
- SQL semantics / Supabase writes behavior
- auth/payments/Lemon/RLS

No deploy performed.
