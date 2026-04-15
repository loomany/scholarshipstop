/**
 * Считает опубликованные эссе по полю `hero_is_real` (после миграции и опционально backfill).
 * Для оценки «по CDN» без колонки см. `backfill-essay-hero-is-real-flags.ts`.
 *
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/count-essay-hero-quality.ts
 */
import { createClient } from '@supabase/supabase-js';

import type { Database } from '@/types_db';

function serviceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error('Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient<Database>(url, key);
}

async function main() {
  const supabase = serviceSupabase();
  const { count: total, error: e1 } = await supabase
    .from('essays')
    .select('id', { count: 'exact', head: true })
    .eq('is_published', true);
  if (e1) throw new Error(e1.message);

  const { count: real, error: e2 } = await supabase
    .from('essays')
    .select('id', { count: 'exact', head: true })
    .eq('is_published', true)
    .eq('hero_is_real', true);
  if (e2) throw new Error(e2.message);

  const published = total ?? 0;
  const realN = real ?? 0;
  console.log(
    JSON.stringify(
      {
        published_total: published,
        hero_is_real_true: realN,
        placeholder_or_not_flagged: published - realN
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
