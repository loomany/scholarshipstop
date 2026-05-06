# Job Success Markers Audit (Railway)

Audit scope: `Скрипты`, `Сео генерация`, `Сео индексация`, `Сео Аудит`, `Контент Хаб`, `Рассылка`, `Рассылка провайдеры`.

Method: read-only review of Railway `startCommand`/cron config and referenced entrypoint files.  
No runtime code changes in this step.

## Snapshot

| service | command | entry file | has start marker | has done marker | has counts | has duration | current observability level | recommended marker format |
|---|---|---|---|---|---|---|---|---|
| Скрипты | `bash scripts/railway-cron.sh all` | `scripts/railway-cron.sh` -> `scripts/enrich-all-providers.ts`, `scripts/run-essay-pipeline-full.ts`, `scripts/enqueue-manual-essay-guides.ts`, `scripts/run-manual-essay-guides.ts`, `scripts/audit-manual-essay-guides.ts` | Partial | Partial | Partial | Partial | Medium | Add explicit per-subjob `JOB_START/PROGRESS/DONE/FAILED` with shared `runId` |
| Сео генерация | `bash scripts/railway-cron.sh seo-generation-http` | `scripts/railway-cron.sh` -> `scripts/railway-cron-post.mjs` (HTTP to SEO endpoints) | Yes | Partial | Partial | Partial | Medium | Wrap each HTTP subtask with unified markers and include endpoint result counters |
| Сео индексация | `bash scripts/railway-cron.sh google-indexing-flush && bash scripts/railway-cron.sh seo-url-inspection` | `scripts/railway-cron.sh` -> `scripts/cron-google-indexing-flush.ts`, `scripts/cron-check-index-worker.ts`, `scripts/cron-scan-indexing.ts` | Yes | Yes | Partial | Yes | Medium/High | Keep existing start/done; normalize payload keys to processed/success/failed/skipped |
| Сео Аудит | `npm run audit:jsonld-sitemap:prod` | `scripts/audit-jsonld-sitemap.ts` | Partial | No explicit final success marker | Partial | No | Medium/Low | Add one run envelope marker set with totals + explicit `exit` |
| Контент Хаб | `npm run content:run-once` | `services/content-hub/src/jobs/runContentJob.ts` (runtime entry is `dist/jobs/runContentJob.js`) | Partial | Partial | Partial | No | Medium | Add top-level run markers around whole run; keep per-topic logs as progress |
| Рассылка | `bash scripts/railway-cron.sh grant-notifications` | `scripts/railway-cron.sh` -> `scripts/cron-grant-notifications.ts` | Yes | Yes | Yes | Yes | High | Already close; add canonical marker keys and explicit `exit=0` in success line |
| Рассылка провайдеры | `npx --yes tsx scripts/send-provider-outreach-emails.ts && echo "Outreach finished successfully..." && tail -f /dev/null` | `scripts/send-provider-outreach-emails.ts` | Yes | Yes | Yes | No | High (job) / Low (service process semantics) | Keep script markers; remove ambiguity by logging final duration and explicit terminal run marker before sleep |

## Service-by-service audit notes

### Скрипты

- **Job purpose:** batch operational workloads: provider enrichment, essay queue pipeline, manual essay enqueue/run/audit.
- **Current markers:** `railway-cron.sh` has run-level start/end (`run start`, `run end`) and per-TS task `tsx START/OK/WARN`.
- **Counts:** present but fragmented inside sub-scripts:
  - `enrich-all-providers.ts` logs processed queue counts and per-item `DONE/FAIL/SKIP`.
  - `run-essay-pipeline-full.ts` logs JSON progress per round and terminal `done: true`.
  - `enqueue-manual-essay-guides.ts` logs `parsed/inserted/skipped`.
  - `run-manual-essay-guides.ts` logs final `{ processed }`.
  - `audit-manual-essay-guides.ts` logs `queue_status_counts`, `recent_failures`, etc.
- **Duration:** only some sub-jobs have implicit timing; no unified run duration for entire `all`.
- **Exit code visibility:** visible via process exit and shell-level WARN/ERROR behavior, but not consistently emitted as structured final field.

### Сео генерация

- **Job purpose:** invoke SEO generation endpoints (`worker-generate`, `meta-generate`) via authenticated HTTP.
- **Current markers:** `Starting task`, POST URL, helper-level `START POST`, `HTTP <status> <ms>`, response body dump, and `OK`/`FAIL`.
- **Counts:** only if endpoint response body contains counters; not normalized/guaranteed at wrapper level.
- **Duration:** yes per HTTP call in `railway-cron-post.mjs` (`<ms>`).
- **Exit code visibility:** yes (`process.exit(1)` on non-2xx/fetch error), surfaced by wrapper WARN/ERROR logs.

### Сео индексация

- **Job purpose:** flush Google Indexing queue and run URL Inspection batches for pending/submitted statuses.
- **Current markers:** each TS cron logs explicit `start` and `done {ms}ms`.
- **Counts:** payload is `JSON.stringify(result)` from worker functions; likely includes operational counters but schema is not standardized.
- **Duration:** explicit `done ${ms}ms` in each cron script.
- **Exit code visibility:** explicit fatal + `process.exit(1)` on errors.

### Сео Аудит

- **Job purpose:** sample sitemap URLs, validate JSON-LD blocks, optionally send Telegram report, optionally return non-zero on failures.
- **Current markers:** logs base/sample/inventory and prints report body.
- **Counts:** has `ok`, `failCount`, `parseErrors`, and sampled totals in output.
- **Duration:** no run-level duration metric.
- **Exit code visibility:** yes via `process.exit(nonzero && failCount > 0 ? 2 : 0)` and fatal paths.

### Контент Хаб

- **Job purpose:** generate/publish content items from queue (and optional startup reprocess), with per-topic multi-stage pipeline.
- **Current markers:** rich stage-level logs (`topic picked`, `article generated`, `done`, failure traces); no clear top-level `run start/run done` envelope.
- **Counts:** per-topic and loop outcomes exist (`published/deferred/empty`), but no final single-line run summary counters.
- **Duration:** no explicit duration per full invocation.
- **Exit code visibility:** fatal path sets `process.exitCode = 1`; success exits naturally with `0`.

### Рассылка

- **Job purpose:** local dispatch of grant notifications (email + Telegram) without public HTTP hop.
- **Current markers:** explicit `start`, `done <ms>`, `fatal`.
- **Counts:** `JSON.stringify(result)` includes `scholarshipsConsidered`, `emailSent`, `telegramSent`, `errors`, etc.
- **Duration:** explicit `durationMs`.
- **Exit code visibility:** explicit `process.exit(1)` on fatal.

### Рассылка провайдеры

- **Job purpose:** send provider outreach emails, including dry-run/test/sample modes and dedupe/unsubscribe handling.
- **Current markers:** clear run start context, per-recipient progress, final `Done. Sent ... Skipped ... Errors ...`.
- **Counts:** explicit `sentResend`, `skippedUnsubscribed`, `skippedCampaignDedupe`, `failed`.
- **Duration:** not emitted as run-level metric.
- **Exit code visibility:** explicit `process.exit(exitCode)` in all main branches.
- **Operational caveat:** service command intentionally sleeps (`tail -f /dev/null`) after success, so service health is decoupled from business completion unless marker parsing tracks script completion line.

## Unified marker format proposal

Use a single parseable format in every entrypoint (single-line, key/value, same keys across services):

- `JOB_START service=... job=... runId=... timestamp=...`
- `JOB_PROGRESS service=... job=... processed=... success=... failed=... skipped=...`
- `JOB_DONE service=... job=... runId=... durationMs=... processed=... success=... failed=... skipped=... exit=0`
- `JOB_FAILED service=... job=... runId=... durationMs=... processed=... success=... failed=... error=...`

Recommended additions for reliability:

- always emit `runId` once at start and reuse unchanged;
- keep counters monotonic (never decreasing);
- emit one terminal marker only (`JOB_DONE` or `JOB_FAILED`);
- always include `exit` in terminal marker (`0` for done, non-zero for failed);
- if one service runs multiple subjobs (`Скрипты`, `Сео индексация`), use `parentRunId` + per-subjob `runId`.

## Implementation plan by service (next step, no code yet)

1. **Рассылка**: low-risk normalization first (already closest to target); add canonical marker lines around existing result payload.
2. **Сео индексация**: standardize `result` JSON into canonical counters and emit terminal marker per subjob.
3. **Сео генерация**: add wrapper-level parsing of endpoint response to produce normalized counters even for HTTP mode.
4. **Рассылка провайдеры**: add duration and terminal marker before sleep; preserve current detailed recipient logs.
5. **Скрипты**: introduce parent run marker in `railway-cron.sh` and child markers in each invoked TS script.
6. **Контент Хаб**: add top-level invocation envelope + final run summary counters across processed topics.
7. **Сео Аудит**: add explicit start/done/failed envelope and duration around existing report generation.

Outcome after rollout: we can prove each job achieved business completion (not only container uptime) via machine-parseable `JOB_DONE/JOB_FAILED` markers with counters + duration + exit.
