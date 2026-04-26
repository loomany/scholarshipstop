import { processAiMetaQueueBatch } from '@/lib/seo/aiMetaDescriptionService';

const DEFAULT_BATCH = 20;

async function main() {
  const t0 = Date.now();
  const raw = process.env.SEO_AI_META_BATCH ?? `${DEFAULT_BATCH}`;
  const limit = Math.max(1, Math.min(100, Math.floor(Number(raw)) || DEFAULT_BATCH));
  console.log('[cron-seo-meta-generate]', new Date().toISOString(), 'start', {
    limit
  });
  const result = await processAiMetaQueueBatch(limit);
  const ms = Date.now() - t0;
  console.log(
    '[cron-seo-meta-generate]',
    new Date().toISOString(),
    `done ${ms}ms`,
    JSON.stringify(result)
  );
}

main().catch((e) => {
  console.error('[cron-seo-meta-generate]', new Date().toISOString(), 'fatal', e);
  process.exit(1);
});
