# Stage 5: Job Markers for Service `Сео Аудит`

## Updated entrypoints

From `reports/job-success-markers-audit.md`, real Railway/job entrypoint for this service:

- `npm run audit:jsonld-sitemap:prod` -> `scripts/audit-jsonld-sitemap.ts`

Updated only:

- `scripts/audit-jsonld-sitemap.ts`

No helper/lib logic changes were made.

## Added JOB_* envelope

Added via `scripts/job-markers.ts`:

- `JOB_START`
- `JOB_PROGRESS`
- `JOB_DONE`
- `JOB_FAILED`

Also added:

- `runId`
- `durationMs`
- canonical counters (`processed/success/failed/skipped`)

## Counters (exact vs approximate)

Current mapping in `scripts/audit-jsonld-sitemap.ts`:

- `processed` = sampled target URLs count (`total`)
- `success` = URLs with valid JSON-LD checks (`ok`)
- `failed` = URLs with issues (`failCount`)
- `skipped` = `max(0, total - ok - failCount)`

Quality:

- **Exact:** `processed`, `success`, `failed` at page-audit result level.
- **Approximate:** `skipped` is effectively `0` in current flow, kept for schema completeness.

## Failure semantics

- Exception path (`main().catch`) now emits `JOB_FAILED` and exits `process.exit(1)`.
- Explicit failed result path (`JSONLD_AUDIT_EXIT_NONZERO` with `failCount > 0`) now emits `JOB_FAILED` and exits `process.exit(1)`.
- Success path emits `JOB_DONE ... exit=0` and exits `process.exit(0)`.

## Diff summary

Updated file:

- `scripts/audit-jsonld-sitemap.ts`

Key changes:

- imported `scripts/job-markers.ts` APIs
- initialized run metadata (`SERVICE_NAME`, `JOB_NAME`, `RUN_ID`, `STARTED_AT_MS`, counters)
- emitted `JOB_START` at beginning
- emitted `JOB_PROGRESS` after audit counts are computed
- replaced early `process.exit(1)` branches for token/chat/telegram errors with throws (centralized failure marker emission)
- normalized terminal outcomes:
  - explicit failed audit result -> `JOB_FAILED` + `process.exit(1)`
  - success -> `JOB_DONE` + `process.exit(0)`
  - exception -> `JOB_FAILED` + `process.exit(1)`

## Tests/checks

Executed:

- `npx tsx --test scripts/__tests__/job-markers.test.ts` ✅
- `npx tsc --noEmit` ✅
- lints for updated file ✅

## What was NOT touched

- SEO audit business logic (JSON-LD validation rules)
- URL generation/sampling behavior
- SQL semantics / DB
- sitemap/canonical/robots/metadata logic
- auth/payments/Lemon/RLS

No deploy performed.
