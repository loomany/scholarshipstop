/**
 * URL Inspection batch for scholarships with indexing_status = pending.
 * Same logic as POST /api/internal/seo/check-index-worker — run on Railway cron
 * via `tsx` to avoid Cloudflare HTTP timeouts on long runs.
 *
 *   npx dotenv -e .env.local -- npx tsx scripts/cron-check-index-worker.ts
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, Google Search Console /
 * URL Inspection credentials, GOOGLE_INDEXING_* for site URL, optional URL_INSPECTION_MAX_PER_RUN.
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
const JOB_NAME = 'check-index-worker';
const RUN_ID = createRunId();
const STARTED_AT_MS = Date.now();

async function main() {
  emitJobStart({ service: SERVICE_NAME, job: JOB_NAME, runId: RUN_ID });
  console.log('[cron-check-index-worker]', new Date().toISOString(), 'start');
  const limit = Number(process.env.URL_INSPECTION_PENDING_BATCH ?? DEFAULT_BATCH);
  const result = await runScholarshipIndexInspectionBatch({
    statuses: ['pending'],
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
    '[cron-check-index-worker]',
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
  console.error('[cron-check-index-worker]', new Date().toISOString(), 'fatal', e);
  process.exit(1);
});
