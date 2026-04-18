/**
 * URL Inspection batch for generated SEO pages (compare pages + geo hubs).
 * Intended for Railway daily cron with a hard default of 100 URLs per run.
 *
 *   npx dotenv -e .env.local -- npx tsx scripts/cron-seo-page-inspection.ts
 */
import { runSeoPageInspectionQueueBatch } from '@/lib/seo/seoPageInspectionQueue';

const DEFAULT_BATCH = 100;

async function main() {
  const t0 = Date.now();
  const raw = process.env.SEO_PAGE_URL_INSPECTION_BATCH ?? `${DEFAULT_BATCH}`;
  const limit = Math.max(1, Math.min(100, Math.floor(Number(raw)) || DEFAULT_BATCH));
  console.log('[cron-seo-page-inspection]', new Date().toISOString(), 'start', { limit });
  const result = await runSeoPageInspectionQueueBatch(limit);
  const ms = Date.now() - t0;
  console.log(
    '[cron-seo-page-inspection]',
    new Date().toISOString(),
    `done ${ms}ms`,
    JSON.stringify(result)
  );
}

main().catch((e) => {
  console.error('[cron-seo-page-inspection]', new Date().toISOString(), 'fatal', e);
  process.exit(1);
});
