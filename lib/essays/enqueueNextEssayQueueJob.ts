import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types_db';

export type EnqueueNextEssayQueueJobResult =
  | {
      ok: true;
      kind: 'inserted';
      scholarshipId: string;
      title: string;
      slug: string | null;
      pendingInQueueBefore: number;
    }
  | {
      ok: true;
      kind: 'requeued_failed';
      scholarshipId: string;
      queueRowId: string;
      title: string;
      slug: string | null;
      pendingInQueueBefore: number;
    }
  | { ok: false; reason: 'no_eligible_scholarship' };

/**
 * Enqueues the next eligible scholarship (essay-heavy first, then any active without essay).
 * Matches the selection logic used by `scripts/queue-next-essay-and-run-once.ts`.
 */
export async function enqueueNextEssayQueueJob(
  supabase: SupabaseClient<Database>
): Promise<EnqueueNextEssayQueueJobResult> {
  const { count: pendingBefore, error: cErr } = await supabase
    .from('essay_generation_queue')
    .select('id', { count: 'exact', head: true })
    .in('status', ['pending', 'processing']);
  if (cErr) throw new Error(cErr.message);

  const { data: essayRows, error: eErr } = await supabase
    .from('scholarship_essays')
    .select('scholarship_id');
  if (eErr) throw new Error(eErr.message);
  const withEssay = new Set(
    (essayRows ?? []).map((r) => r.scholarship_id).filter(Boolean)
  );

  const { data: queuedRows, error: qErr } = await supabase
    .from('essay_generation_queue')
    .select('scholarship_id')
    .in('status', ['pending', 'processing']);
  if (qErr) throw new Error(qErr.message);
  const inQueue = new Set(
    (queuedRows ?? []).map((r) => r.scholarship_id).filter(Boolean)
  );

  const { data: candidates, error: sErr } = await supabase
    .from('scholarships')
    .select('id, title, slug')
    .eq('is_active', true)
    .or('requires_essay.eq.true,essay_required.eq.true')
    .not('title', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(200);

  if (sErr) throw new Error(sErr.message);

  let picks = (candidates ?? []).filter(
    (s) => s.id && !withEssay.has(s.id) && !inQueue.has(s.id)
  );

  if (picks.length === 0) {
    const { data: fallback, error: fbErr } = await supabase
      .from('scholarships')
      .select('id, title, slug')
      .eq('is_active', true)
      .not('title', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(200);
    if (fbErr) throw new Error(fbErr.message);
    picks = (fallback ?? []).filter(
      (s) => s.id && !withEssay.has(s.id) && !inQueue.has(s.id)
    );
  }

  const next = picks[0];
  if (!next?.id) {
    return { ok: false, reason: 'no_eligible_scholarship' };
  }

  const { data: failedPrev, error: fPrevErr } = await supabase
    .from('essay_generation_queue')
    .select('id')
    .eq('scholarship_id', next.id)
    .eq('status', 'failed')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (fPrevErr) throw new Error(fPrevErr.message);

  const title = (next.title ?? '').slice(0, 200);
  const slug = next.slug ?? null;
  const pending = pendingBefore ?? 0;

  if (failedPrev?.id) {
    const { error: upErr } = await supabase
      .from('essay_generation_queue')
      .update({
        status: 'pending',
        error_message: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', failedPrev.id);
    if (upErr) throw new Error(upErr.message);
    return {
      ok: true,
      kind: 'requeued_failed',
      scholarshipId: next.id,
      queueRowId: failedPrev.id,
      title,
      slug,
      pendingInQueueBefore: pending
    };
  }

  const { error: insErr } = await supabase.from('essay_generation_queue').insert({
    scholarship_id: next.id,
    status: 'pending'
  });
  if (insErr) throw new Error(insErr.message);

  return {
    ok: true,
    kind: 'inserted',
    scholarshipId: next.id,
    title,
    slug,
    pendingInQueueBefore: pending
  };
}
