/**
 * Grant notifications dispatch (email + Telegram) without public HTTP hop.
 * Run from Railway cron via local tsx to avoid Cloudflare 524 timeouts.
 *
 *   npx tsx scripts/cron-grant-notifications.ts
 */
import { runGrantNotificationDispatch } from '@/lib/notifications/runGrantNotificationDispatch';
import {
  notifyGrantNotificationCronComplete,
  notifyGrantNotificationCronFatal
} from '@/lib/telegram/grantNotificationCronReport';
import {
  createRunId,
  emitJobDone,
  emitJobFailed,
  emitJobProgress,
  emitJobStart,
  type JobCounters
} from './job-markers';

const startedAtMs = Date.now();
const startedAtIso = new Date(startedAtMs).toISOString();
const SERVICE_NAME = 'Рассылка';
const JOB_NAME = 'grant-notifications';
const RUN_ID = createRunId();
const counters: JobCounters = { processed: 0, success: 0, failed: 0, skipped: 0 };

async function main() {
  emitJobStart({ service: SERVICE_NAME, job: JOB_NAME, runId: RUN_ID }, startedAtIso);
  console.log('[cron-grant-notifications]', startedAtIso, 'start');
  const result = await runGrantNotificationDispatch();
  counters.processed = result.scholarshipsConsidered;
  counters.success = result.emailSent + result.telegramSent;
  counters.failed = result.errors;
  counters.skipped = result.skippedDup;
  emitJobProgress({ service: SERVICE_NAME, job: JOB_NAME, runId: RUN_ID }, counters);
  const ms = Date.now() - startedAtMs;
  const finishedAtIso = new Date().toISOString();
  console.log(
    '[cron-grant-notifications]',
    finishedAtIso,
    `done ${ms}ms`,
    JSON.stringify(result)
  );
  if (!result.ok) {
    const error = new Error(result.message || 'grant notifications dispatch returned ok=false');
    emitJobFailed({ service: SERVICE_NAME, job: JOB_NAME, runId: RUN_ID }, ms, counters, error);
    await notifyGrantNotificationCronFatal(error, {
      startedAtIso,
      durationMs: ms
    });
    process.exit(1);
  }
  emitJobDone({ service: SERVICE_NAME, job: JOB_NAME, runId: RUN_ID }, ms, counters);
  await notifyGrantNotificationCronComplete(result, {
    startedAtIso,
    finishedAtIso,
    durationMs: ms
  });
}

main().catch(async (e) => {
  emitJobProgress({ service: SERVICE_NAME, job: JOB_NAME, runId: RUN_ID }, counters);
  emitJobFailed(
    { service: SERVICE_NAME, job: JOB_NAME, runId: RUN_ID },
    Date.now() - startedAtMs,
    counters,
    e
  );
  const failedAtIso = new Date().toISOString();
  console.error('[cron-grant-notifications]', failedAtIso, 'fatal', e);
  await notifyGrantNotificationCronFatal(e, {
    startedAtIso,
    durationMs: Date.now() - startedAtMs
  });
  process.exit(1);
});
