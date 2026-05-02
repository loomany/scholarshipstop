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

const startedAtMs = Date.now();
const startedAtIso = new Date(startedAtMs).toISOString();

async function main() {
  console.log('[cron-grant-notifications]', startedAtIso, 'start');
  const result = await runGrantNotificationDispatch();
  const ms = Date.now() - startedAtMs;
  const finishedAtIso = new Date().toISOString();
  console.log(
    '[cron-grant-notifications]',
    finishedAtIso,
    `done ${ms}ms`,
    JSON.stringify(result)
  );
  await notifyGrantNotificationCronComplete(result, {
    startedAtIso,
    finishedAtIso,
    durationMs: ms
  });
}

main().catch(async (e) => {
  const failedAtIso = new Date().toISOString();
  console.error('[cron-grant-notifications]', failedAtIso, 'fatal', e);
  await notifyGrantNotificationCronFatal(e, {
    startedAtIso,
    durationMs: Date.now() - startedAtMs
  });
  process.exit(1);
});
