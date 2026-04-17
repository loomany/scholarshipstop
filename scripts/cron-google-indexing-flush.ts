/**
 * Flush pending rows from public.google_indexing_queue via Google Indexing API.
 * Same as POST /api/internal/google-indexing with action=flush — for Railway cron without HTTP.
 *
 *   npx dotenv -e .env.local -- npx tsx scripts/cron-google-indexing-flush.ts
 *
 * Env: GOOGLE_INDEXING_CLIENT_EMAIL, GOOGLE_INDEXING_PRIVATE_KEY; optional GOOGLE_INDEXING_FLUSH_LIMIT (default 200).
 */
import { flushGoogleIndexingQueue } from '@/lib/seo/googleIndexingQueue';

async function main() {
  const t0 = Date.now();
  const raw = process.env.GOOGLE_INDEXING_FLUSH_LIMIT ?? '200';
  const limit = Math.max(1, Math.min(200, Math.floor(Number(raw)) || 200));
  console.log('[cron-google-indexing-flush]', new Date().toISOString(), 'start', { limit });
  const result = await flushGoogleIndexingQueue(limit);
  const ms = Date.now() - t0;
  console.log(
    '[cron-google-indexing-flush]',
    new Date().toISOString(),
    `done ${ms}ms`,
    JSON.stringify(result)
  );
}

main().catch((e) => {
  console.error('[cron-google-indexing-flush]', new Date().toISOString(), 'fatal', e);
  process.exit(1);
});
