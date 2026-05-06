/**
 * URL Inspection batch for indexing_status = submitted (after Indexing API ping).
 * Same as POST /api/internal/seo/scan-indexing — for Railway cron without HTTP.
 *
 *   npx dotenv -e .env.local -- npx tsx scripts/cron-scan-indexing.ts
 */
import { runScholarshipIndexInspectionBatch } from '@/lib/seo/scholarshipIndexInspectionWorker';
import {
  createRunId,
  emitJobDone,
  emitJobFailed,
  emitJobProgress,
  emitJobStart,
  type JobCounters
} from './job-markers';

const DEFAULT_BATCH = 50;
const SERVICE_NAME = 'Сео индексация';
const JOB_NAME = 'scan-indexing';
const RUN_ID = createRunId();
const STARTED_AT_MS = Date.now();

async function main() {
  emitJobStart({ service: SERVICE_NAME, job: JOB_NAME, runId: RUN_ID });
  console.log('[cron-scan-indexing]', new Date().toISOString(), 'start');
  const limit = Number(process.env.URL_INSPECTION_SUBMITTED_BATCH ?? DEFAULT_BATCH);
  const result = await runScholarshipIndexInspectionBatch({
    statuses: ['submitted'],
    limit: Number.isFinite(limit) && limit > 0 ? limit : DEFAULT_BATCH
  });
  const success = result.results.filter((item) => item.indexed && !item.skipped).length;
  const failed = result.results.filter((item) => Boolean(item.skipped)).length;
  const processed = result.results.length;
  const counters: JobCounters = {
    processed,
    success,
    failed,
    skipped: Math.max(0, processed - success - failed)
  };
  const ms = Date.now() - STARTED_AT_MS;
  emitJobProgress({ service: SERVICE_NAME, job: JOB_NAME, runId: RUN_ID }, counters);
  console.log(
    '[cron-scan-indexing]',
    new Date().toISOString(),
    `done ${ms}ms`,
    JSON.stringify(result)
  );
  emitJobDone({ service: SERVICE_NAME, job: JOB_NAME, runId: RUN_ID }, ms, counters);
}

main().catch((e) => {
  const counters: JobCounters = { processed: 0, success: 0, failed: 0, skipped: 0 };
  emitJobProgress({ service: SERVICE_NAME, job: JOB_NAME, runId: RUN_ID }, counters);
  emitJobFailed(
    { service: SERVICE_NAME, job: JOB_NAME, runId: RUN_ID },
    Date.now() - STARTED_AT_MS,
    counters,
    e
  );
  console.error('[cron-scan-indexing]', new Date().toISOString(), 'fatal', e);
  process.exit(1);
});
