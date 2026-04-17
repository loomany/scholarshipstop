/**
 * URL Inspection batch for indexing_status = submitted (after Indexing API ping).
 * Same as POST /api/internal/seo/scan-indexing — for Railway cron without HTTP.
 *
 *   npx dotenv -e .env.local -- npx tsx scripts/cron-scan-indexing.ts
 */
import { runScholarshipIndexInspectionBatch } from '@/lib/seo/scholarshipIndexInspectionWorker';

const DEFAULT_BATCH = 50;

async function main() {
  const t0 = Date.now();
  console.log('[cron-scan-indexing]', new Date().toISOString(), 'start');
  const limit = Number(process.env.URL_INSPECTION_SUBMITTED_BATCH ?? DEFAULT_BATCH);
  const result = await runScholarshipIndexInspectionBatch({
    statuses: ['submitted'],
    limit: Number.isFinite(limit) && limit > 0 ? limit : DEFAULT_BATCH
  });
  const ms = Date.now() - t0;
  console.log(
    '[cron-scan-indexing]',
    new Date().toISOString(),
    `done ${ms}ms`,
    JSON.stringify(result)
  );
}

main().catch((e) => {
  console.error('[cron-scan-indexing]', new Date().toISOString(), 'fatal', e);
  process.exit(1);
});
