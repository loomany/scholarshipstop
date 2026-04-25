import { createClient } from '@supabase/supabase-js';

import { addToIndexingQueue, essayIndexingUrl } from '@/lib/seo/googleIndexingQueue';
import type { Database } from '@/types_db';

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
        queue_status_counts: (queueRows ?? []).reduce<Record<string, number>>(
          (acc, row) => {
            acc[row.status] = (acc[row.status] ?? 0) + 1;
            return acc;
          },
          {}
        ),
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
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
