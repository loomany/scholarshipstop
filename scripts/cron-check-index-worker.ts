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

const DEFAULT_BATCH = 50;

async function main() {
  const t0 = Date.now();
  console.log('[cron-check-index-worker]', new Date().toISOString(), 'start');
  const limit = Number(process.env.URL_INSPECTION_PENDING_BATCH ?? DEFAULT_BATCH);
  const result = await runScholarshipIndexInspectionBatch({
    statuses: ['pending'],
    limit: Number.isFinite(limit) && limit > 0 ? limit : DEFAULT_BATCH
  });
  const ms = Date.now() - t0;
  console.log(
    '[cron-check-index-worker]',
    new Date().toISOString(),
    `done ${ms}ms`,
    JSON.stringify(result)
  );
}

main().catch((e) => {
  console.error('[cron-check-index-worker]', new Date().toISOString(), 'fatal', e);
  process.exit(1);
});
