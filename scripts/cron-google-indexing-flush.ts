/**
 * Flush pending rows from public.google_indexing_queue via Google Indexing API.
 * Same as POST /api/internal/google-indexing with action=flush — for Railway cron without HTTP.
 *
 *   npx dotenv -e .env.local -- npx tsx scripts/cron-google-indexing-flush.ts
 *
 * Env: GOOGLE_INDEXING_CLIENT_EMAIL, GOOGLE_INDEXING_PRIVATE_KEY; optional GOOGLE_INDEXING_FLUSH_LIMIT (default 100).
 */
import { flushGoogleIndexingQueue } from '@/lib/seo/googleIndexingQueue';
import {
  createRunId,
  emitJobDone,
  emitJobFailed,
  emitJobProgress,
  emitJobStart,
  type JobCounters
} from './job-markers';

const SERVICE_NAME = 'Сео индексация';
const JOB_NAME = 'google-indexing-flush';
const RUN_ID = createRunId();
const STARTED_AT_MS = Date.now();

async function main() {
  const raw = process.env.GOOGLE_INDEXING_FLUSH_LIMIT ?? '100';
  const limit = Math.max(1, Math.min(200, Math.floor(Number(raw)) || 100));
  emitJobStart({ service: SERVICE_NAME, job: JOB_NAME, runId: RUN_ID });
  console.log('[cron-google-indexing-flush]', new Date().toISOString(), 'start', { limit });
  const result = await flushGoogleIndexingQueue(limit);
  const ms = Date.now() - STARTED_AT_MS;
  const counters: JobCounters = {
    processed: result.processed ?? 0,
    success: result.sent ?? 0,
    failed: result.failed ?? 0,
    skipped: Math.max(0, (result.processed ?? 0) - (result.sent ?? 0) - (result.failed ?? 0))
  };
  emitJobProgress({ service: SERVICE_NAME, job: JOB_NAME, runId: RUN_ID }, counters);
  console.log(
    '[cron-google-indexing-flush]',
    new Date().toISOString(),
    `done ${ms}ms`,
    JSON.stringify(result)
  );
  if (!result.ok) {
    emitJobFailed(
      { service: SERVICE_NAME, job: JOB_NAME, runId: RUN_ID },
      ms,
      counters,
      result.skipped ?? 'flush failed'
    );
    process.exit(1);
  }
  emitJobDone({ service: SERVICE_NAME, job: JOB_NAME, runId: RUN_ID }, ms, counters);
}

main().catch((e) => {
  const counters: JobCounters = { processed: 0, success: 0, failed: 0, skipped: 0 };
  emitJobFailed(
    { service: SERVICE_NAME, job: JOB_NAME, runId: RUN_ID },
    Date.now() - STARTED_AT_MS,
    counters,
    e
  );
  console.error('[cron-google-indexing-flush]', new Date().toISOString(), 'fatal', e);
  process.exit(1);
});
