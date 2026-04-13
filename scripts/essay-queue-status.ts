/**
 * One-off diagnostics: recent essay_generation_queue rows + latest published essays.
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/essay-queue-status.ts
 */
import { createClient } from '@supabase/supabase-js';

import type { Database } from '@/types_db';

function serviceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) throw new Error('Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  return createClient<Database>(url, key);
}

async function main() {
  const supabase = serviceSupabase();

  const { data: queueRows, error: qe } = await supabase
    .from('essay_generation_queue')
    .select('id, scholarship_id, status, error_message, created_essay_id, created_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(25);

  if (qe) throw new Error(qe.message);

  const { data: recentEssays, error: ee } = await supabase
    .from('essays')
    .select('id, slug, title, created_at')
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(8);

  if (ee) throw new Error(ee.message);

  const processing = (queueRows ?? []).filter((r) => r.status === 'processing');
  const oldestProcessing = processing.sort(
    (a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()
  )[0];

  console.log(
    JSON.stringify(
      {
        hint: {
          stuck_processing:
            'Rows left in processing usually mean the worker crashed or timed out before completing. claimNextPending only picks pending — stuck processing does not block pending, but ties up those scholarships until reset.',
          cron: 'Vercel cron hits /api/cron/process-essay-queue hourly; needs CRON_SECRET or ESSAY_CRON_SECRET and ESSAY_GENERATION_DISABLED unset on Vercel.'
        },
        latestPublishedEssays: recentEssays ?? [],
        recentQueueRows: queueRows ?? [],
        stuckProcessingOldestUpdatedAt: oldestProcessing?.updated_at ?? null
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
