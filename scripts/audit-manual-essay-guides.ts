import { createClient } from '@supabase/supabase-js';

import { addToIndexingQueue, essayIndexingUrl } from '@/lib/seo/googleIndexingQueue';
import type { Database } from '@/types_db';
import {
  createRunId,
  emitJobDone,
  emitJobFailed,
  emitJobProgress,
  emitJobStart,
  type JobCounters
} from './job-markers';

const SERVICE_NAME = 'Скрипты';
const JOB_NAME = 'audit-manual-essay-guides';
const RUN_ID = createRunId();
const STARTED_AT_MS = Date.now();

function requiredEnv(name: string): string {
  const primary = process.env[name]?.trim();
  const value =
    primary ||
    (name === 'NEXT_PUBLIC_SUPABASE_URL'
      ? process.env.SUPABASE_URL?.trim()
      : undefined);
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function fetchAllPublishedEssaySitemapRows(
  supabase: ReturnType<typeof createClient<Database>>
): Promise<{ slug: string; updated_at: string | null }[]> {
  const out: { slug: string; updated_at: string | null }[] = [];
  const batchSize = 500;
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('essays')
      .select('slug, updated_at')
      .eq('is_published', true)
      .order('updated_at', { ascending: false, nullsFirst: false })
      .range(from, from + batchSize - 1);
    if (error) throw new Error(error.message);
    const batch = (data ?? []).filter((row) => Boolean(row.slug?.trim()));
    out.push(...batch);
    if ((data ?? []).length < batchSize) break;
    from += batchSize;
  }
  return out;
}

async function main() {
  emitJobStart({ service: SERVICE_NAME, job: JOB_NAME, runId: RUN_ID });
  const enqueueMissed = process.argv.includes('--enqueue-missed-indexing');
  const supabase = createClient<Database>(
    requiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false } }
  );

  const { data: queueRows, error: queueError } = await supabase
    .from('manual_essay_generation_queue')
    .select('id,status,topic,created_essay_id,error_message')
    .order('updated_at', { ascending: false });
  if (queueError) throw new Error(queueError.message);

  const { data: essayRows, error: essayError } = await supabase
    .from('essays')
    .select('id,slug,title,is_published,hub_category_slug,manual_topic')
    .eq('hub_category_slug', 'international-students');
  if (essayError) throw new Error(essayError.message);

  const sitemapRows = await fetchAllPublishedEssaySitemapRows(supabase);
  const sitemapSlugs = new Set(sitemapRows.map((row) => row.slug.trim()));
  const manualPublished = (essayRows ?? []).filter(
    (row) => row.is_published && row.slug?.trim() && row.manual_topic?.trim()
  );
  const missingFromSitemap = manualPublished.filter(
    (row) => !sitemapSlugs.has(row.slug.trim())
  );
  const queueStatusCounts = (queueRows ?? []).reduce<Record<string, number>>(
    (acc, row) => {
      acc[row.status] = (acc[row.status] ?? 0) + 1;
      return acc;
    },
    {}
  );

  if (enqueueMissed) {
    for (const row of manualPublished) {
      await addToIndexingQueue(essayIndexingUrl(row.slug.trim()), {
        kind: 'essay',
        source: 'manual-essay-guides-audit'
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        queue_status_counts: queueStatusCounts,
        manual_published: manualPublished.length,
        missing_from_sitemap: missingFromSitemap.map((row) => row.slug),
        enqueue_missed_indexing: enqueueMissed,
        recent_failures: (queueRows ?? [])
          .filter((row) => row.status === 'failed')
          .slice(0, 10)
          .map((row) => ({
            topic: row.topic,
            error: row.error_message?.slice(0, 240) ?? null
          }))
      },
      null,
      2
    )
  );
  const processed = Object.values(queueStatusCounts).reduce((sum, value) => sum + value, 0);
  const failed = queueStatusCounts.failed ?? 0;
  const skipped = queueStatusCounts.pending ?? 0;
  const counters: JobCounters = {
    processed,
    success: Math.max(0, processed - failed - skipped),
    failed,
    skipped
  };
  emitJobProgress({ service: SERVICE_NAME, job: JOB_NAME, runId: RUN_ID }, counters);
  emitJobDone(
    { service: SERVICE_NAME, job: JOB_NAME, runId: RUN_ID },
    Date.now() - STARTED_AT_MS,
    counters
  );
}

main().catch((error) => {
  const counters: JobCounters = { processed: 0, success: 0, failed: 0, skipped: 0 };
  emitJobFailed(
    { service: SERVICE_NAME, job: JOB_NAME, runId: RUN_ID },
    Date.now() - STARTED_AT_MS,
    counters,
    error
  );
  console.error(error);
  process.exit(1);
});
