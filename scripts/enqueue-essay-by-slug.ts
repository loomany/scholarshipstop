/**
 * One-off: enqueue essay generation for a scholarship slug and bump FIFO priority
 * (oldest created_at runs first — we set a very old timestamp so this job is next).
 *
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/enqueue-essay-by-slug.ts gramlich-nursing-scholarship-au6nvtka3qtl
 */
import { createClient } from '@supabase/supabase-js';

import type { Database } from '@/types_db';

const PRIORITY_CREATED_AT = '2000-01-01T00:00:00.000Z';

function serviceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error('Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient<Database>(url, key);
}

async function main() {
  const slugArg = process.argv.slice(2).find((a) => !a.startsWith('-'))?.trim();
  if (!slugArg) {
    console.error('Usage: npx tsx scripts/enqueue-essay-by-slug.ts <scholarship-slug>');
    process.exit(1);
  }

  const supabase = serviceSupabase();

  const { data: s, error: sErr } = await supabase
    .from('scholarships')
    .select('id, title, slug, is_active')
    .eq('slug', slugArg)
    .maybeSingle();

  if (sErr) throw new Error(sErr.message);
  if (!s?.id) {
    console.log(JSON.stringify({ ok: false, error: 'scholarship_not_found', slug: slugArg }, null, 2));
    process.exit(1);
  }

  const { data: link, error: lErr } = await supabase
    .from('scholarship_essays')
    .select('essay_id')
    .eq('scholarship_id', s.id)
    .limit(1)
    .maybeSingle();

  if (lErr) throw new Error(lErr.message);
  if (link?.essay_id) {
    const { data: essay } = await supabase
      .from('essays')
      .select('slug, title')
      .eq('id', link.essay_id)
      .maybeSingle();
    console.log(
      JSON.stringify(
        {
          ok: true,
          skipped: 'already_has_essay',
          scholarshipId: s.id,
          essay: essay ?? { id: link.essay_id }
        },
        null,
        2
      )
    );
    return;
  }

  const { data: existingQ, error: qErr } = await supabase
    .from('essay_generation_queue')
    .select('id, status, created_at')
    .eq('scholarship_id', s.id)
    .in('status', ['pending', 'processing'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (qErr) throw new Error(qErr.message);

  let queueId: string;

  if (existingQ?.id) {
    queueId = existingQ.id;
    const { error: upErr } = await supabase
      .from('essay_generation_queue')
      .update({ created_at: PRIORITY_CREATED_AT, updated_at: new Date().toISOString() })
      .eq('id', queueId);
    if (upErr) throw new Error(upErr.message);
  } else {
    const { data: ins, error: insErr } = await supabase
      .from('essay_generation_queue')
      .insert({ scholarship_id: s.id, status: 'pending' })
      .select('id')
      .single();
    if (insErr) throw new Error(insErr.message);
    queueId = ins!.id!;
    const { error: upErr } = await supabase
      .from('essay_generation_queue')
      .update({ created_at: PRIORITY_CREATED_AT })
      .eq('id', queueId);
    if (upErr) throw new Error(upErr.message);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        scholarshipId: s.id,
        title: s.title,
        slug: s.slug,
        queueRowId: queueId,
        priorityCreatedAt: PRIORITY_CREATED_AT,
        note: 'This pending job should be claimed next (FIFO by created_at).'
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
