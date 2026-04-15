/**
 * Одноразово выставляет `essays.hero_is_real` по фактическому содержимому hero.webp в Storage (HEAD/GET),
 * чтобы сортировка /essays не требовала повторных запросов к CDN.
 *
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/backfill-essay-hero-is-real-flags.ts
 */
import { createClient } from '@supabase/supabase-js';

import { buildEssayHeroListPriorityById } from '@/lib/essays/essayHeroSortSignals';

import type { Database } from '@/types_db';

const PAGE = 500;
const UPDATE_CONCURRENCY = 40;

function serviceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error('Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient<Database>(url, key);
}

async function mapPool<T>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<void>
) {
  const chunk = Math.max(1, concurrency);
  for (let i = 0; i < items.length; i += chunk) {
    await Promise.all(items.slice(i, i + chunk).map((item) => fn(item)));
  }
}

async function main() {
  const supabase = serviceSupabase();
  const rows: { id: string; hero_image_url: string | null }[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('essays')
      .select('id, hero_image_url')
      .eq('is_published', true)
      .order('created_at', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const batch = (data ?? []) as typeof rows;
    rows.push(...batch);
    if (batch.length < PAGE) break;
    from += PAGE;
  }

  console.log(JSON.stringify({ step: 'classify_cdn', total: rows.length }, null, 2));
  const priorities = await buildEssayHeroListPriorityById(rows);

  let updated = 0;
  await mapPool(rows, UPDATE_CONCURRENCY, async (row) => {
    const isReal = priorities[row.id] === 1;
    const { error } = await supabase
      .from('essays')
      .update({
        hero_is_real: isReal,
        updated_at: new Date().toISOString()
      })
      .eq('id', row.id);
    if (error) throw new Error(error.message);
    updated += 1;
  });

  const realCount = Object.values(priorities).filter((p) => p === 1).length;
  console.log(
    JSON.stringify(
      {
        done: true,
        rows: rows.length,
        updated,
        hero_is_real_true: realCount,
        hero_is_real_false: rows.length - realCount
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
