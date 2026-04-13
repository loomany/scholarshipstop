/**
 * Сводка: сколько грантов с эссе в каталоге vs сколько опубликованных гайдов в хабе.
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/diagnose-essay-catalog-counts.ts
 */
import { createClient } from '@supabase/supabase-js';

import type { Database } from '@/types_db';

const CATEGORIES = [
  'education',
  'miscellaneous',
  'arts',
  'stem',
  'community',
  'law',
  'humanities',
  'medical',
  'disability',
  'safety'
] as const;

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

  const q1 = await supabase
    .from('scholarships')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)
    .eq('essay_required', true);
  if (q1.error) throw new Error(q1.error.message);
  const activeEssayFlag = q1.count ?? 0;

  const q2 = await supabase
    .from('scholarships')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)
    .eq('requires_essay', true);
  if (q2.error) throw new Error(q2.error.message);
  const activeRequiresEssay = q2.count ?? 0;

  const q3 = await supabase
    .from('scholarships')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)
    .or('requires_essay.eq.true,essay_required.eq.true');
  if (q3.error) throw new Error(q3.error.message);
  const activeEither = q3.count ?? 0;

  const q4 = await supabase
    .from('scholarships')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)
    .eq('essay_required', true)
    .in('category_slug', [...CATEGORIES]);
  if (q4.error) throw new Error(q4.error.message);
  const activeEssayInListedCats = q4.count ?? 0;

  const { count: pubEssays, error: ePub } = await supabase
    .from('essays')
    .select('id', { count: 'exact', head: true })
    .eq('is_published', true);
  if (ePub) throw new Error(ePub.message);

  const { count: pubWithSlug, error: eSlug } = await supabase
    .from('essays')
    .select('id', { count: 'exact', head: true })
    .eq('is_published', true)
    .not('slug', 'is', null);
  if (eSlug) throw new Error(eSlug.message);

  const { count: links, error: eL } = await supabase
    .from('scholarship_essays')
    .select('essay_id', { count: 'exact', head: true });
  if (eL) throw new Error(eL.message);

  const statuses = ['pending', 'processing', 'completed', 'failed'] as const;
  const byStatus: Record<string, number> = {};
  for (const st of statuses) {
    const { count, error } = await supabase
      .from('essay_generation_queue')
      .select('id', { count: 'exact', head: true })
      .eq('status', st);
    if (error) throw new Error(error.message);
    if ((count ?? 0) > 0) byStatus[st] = count ?? 0;
  }

  console.log(
    JSON.stringify(
      {
        explanation: {
          catalog_essay_grants:
            'Scholarships in DB that are active and marked as requiring an essay (flags essay_required and/or requires_essay).',
          published_essay_hub_guides:
            'Rows in `essays` with is_published=true — these are the “ready” how-to articles on /essays, not one guide per grant.',
          gap:
            'The export script essay-grants-full-list.md filters essay_required=true AND fixed categories — compare activeEssayInListedCategories.'
        },
        scholarships_active_essay_required_true: activeEssayFlag,
        scholarships_active_requires_essay_true: activeRequiresEssay,
        scholarships_active_either_flag: activeEither,
        scholarships_active_essay_required_in_export_categories:
          activeEssayInListedCats,
        essays_published_total: pubEssays,
        essays_published_with_non_null_slug: pubWithSlug,
        scholarship_essays_link_rows_total: links,
        essay_generation_queue_by_status: byStatus
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
