import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types_db';

/** Page size for candidate scans (PostgREST `range` batches). */
const CANDIDATE_PAGE = 200;

/**
 * Max scholarships to scan per phase (essay-flagged, then fallback “any active”).
 * Prevents unbounded pagination if the catalog is huge. Override via `ESSAY_ENQUEUE_MAX_SCAN`.
 */
function maxScanRows(): number {
  const raw = process.env.ESSAY_ENQUEUE_MAX_SCAN?.trim();
  const n = raw ? Number(raw) : 20_000;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 20_000;
}

type CandidateRow = { id: string; title: string | null; slug: string | null };

/** PostgREST default max rows per request is 1000; load everything for correct eligibility. */
const ID_PAGE = 1000;

async function loadAllScholarshipIdsWithEssay(
  supabase: SupabaseClient<Database>
): Promise<Set<string>> {
  const out = new Set<string>();
  for (let from = 0; ; from += ID_PAGE) {
    const { data, error } = await supabase
      .from('scholarship_essays')
      .select('scholarship_id')
      .order('scholarship_id', { ascending: true })
      .range(from, from + ID_PAGE - 1);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    for (const r of rows) {
      if (r.scholarship_id) out.add(r.scholarship_id);
    }
    if (rows.length < ID_PAGE) break;
  }
  return out;
}

async function loadQueuedScholarshipIdsPendingOrProcessing(
  supabase: SupabaseClient<Database>
): Promise<Set<string>> {
  const out = new Set<string>();
  for (let from = 0; ; from += ID_PAGE) {
    const { data, error } = await supabase
      .from('essay_generation_queue')
      .select('scholarship_id')
      .in('status', ['pending', 'processing', 'awaiting_hero'])
      .order('id', { ascending: true })
      .range(from, from + ID_PAGE - 1);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    for (const r of rows) {
      if (r.scholarship_id) out.add(r.scholarship_id);
    }
    if (rows.length < ID_PAGE) break;
  }
  return out;
}

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
    .in('status', ['pending', 'processing', 'awaiting_hero']);
  if (cErr) throw new Error(cErr.message);

  const withEssay = await loadAllScholarshipIdsWithEssay(supabase);
  const inQueue = await loadQueuedScholarshipIdsPendingOrProcessing(supabase);

  const eligible = (rows: CandidateRow[]) =>
    rows.filter((s) => s.id && !withEssay.has(s.id) && !inQueue.has(s.id));

  const scanForNext = async (
    essayFlagsOnly: boolean
  ): Promise<CandidateRow | null> => {
    const cap = maxScanRows();
    for (let from = 0; from < cap; from += CANDIDATE_PAGE) {
      const to = Math.min(from + CANDIDATE_PAGE - 1, cap - 1);
      let q = supabase
        .from('scholarships')
        .select('id, title, slug')
        .eq('is_active', true)
        .not('title', 'is', null);
      if (essayFlagsOnly) {
        q = q.or('requires_essay.eq.true,essay_required.eq.true');
      }
      const { data, error } = await q
        .order('updated_at', { ascending: false })
        .range(from, to);
      if (error) throw new Error(error.message);
      const batch = (data ?? []) as CandidateRow[];
      const pick = eligible(batch)[0];
      if (pick) return pick;
      if (batch.length < CANDIDATE_PAGE) break;
    }
    return null;
  };

  /** Prefer essay-tagged grants, then any active grant still missing a hub guide. */
  const next =
    (await scanForNext(true)) ?? (await scanForNext(false)) ?? undefined;
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
