/**
 * Grant notifications dispatch (email + Telegram) without public HTTP hop.
 * Run from Railway cron via local tsx to avoid Cloudflare 524 timeouts.
 *
 *   npx tsx scripts/cron-grant-notifications.ts
 */
import { runGrantNotificationDispatch } from '@/lib/notifications/runGrantNotificationDispatch';

async function main() {
  const t0 = Date.now();
  console.log('[cron-grant-notifications]', new Date().toISOString(), 'start');
  const result = await runGrantNotificationDispatch();
  const ms = Date.now() - t0;
  console.log(
    '[cron-grant-notifications]',
    new Date().toISOString(),
    `done ${ms}ms`,
    JSON.stringify(result)
  );
}

main().catch((e) => {
  console.error('[cron-grant-notifications]', new Date().toISOString(), 'fatal', e);
  process.exit(1);
});
