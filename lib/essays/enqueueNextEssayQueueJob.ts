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

/** Transient gateway / network strings often seen when PostgREST or Cloudflare hiccups. */
const RETRYABLE_ERROR_SUBSTRINGS = [
  '502',
  '503',
  '504',
  'bad gateway',
  'cloudflare',
  'etimedout',
  'econnreset',
  'econnrefused',
  'fetch failed',
  'network request failed',
  'socket hang up',
  'timeout',
  'service unavailable',
  'temporarily unavailable'
] as const;

function postgrestMessageLooksRetryable(message: string | undefined | null): boolean {
  if (!message?.trim()) return false;
  const m = message.toLowerCase();
  return RETRYABLE_ERROR_SUBSTRINGS.some((s) => m.includes(s));
}

function enqueueSupabaseMaxAttempts(): number {
  const raw = process.env.ESSAY_ENQUEUE_SUPABASE_MAX_ATTEMPTS?.trim();
  const n = raw ? Number(raw) : 5;
  return Number.isFinite(n) && n >= 1 ? Math.min(Math.floor(n), 12) : 5;
}

function enqueueSupabaseRetryBaseMs(): number {
  const raw = process.env.ESSAY_ENQUEUE_SUPABASE_RETRY_BASE_MS?.trim();
  const n = raw ? Number(raw) : 1000;
  return Number.isFinite(n) && n >= 100 ? Math.min(Math.floor(n), 30_000) : 1000;
}

/**
 * Retries a PostgREST call when `error.message` looks like a transient HTTP/network failure
 * (e.g. Cloudflare 502 HTML body), not for logical/RLS errors.
 */
type PostgrestResult = { error: { message: string } | null };

async function executePostgrestWithRetries<T extends PostgrestResult>(
  operation: string,
  run: () => Promise<T>
): Promise<T> {
  const attempts = enqueueSupabaseMaxAttempts();
  const baseMs = enqueueSupabaseRetryBaseMs();
  let last: T | undefined;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    last = await run();
    if (!last.error) return last;
    const msg = last.error.message;
    if (!postgrestMessageLooksRetryable(msg)) return last;
    if (attempt >= attempts) return last;

    const delay = Math.min(baseMs * 2 ** (attempt - 1), 20_000);
    if (process.env.ESSAY_ENQUEUE_DEBUG_RETRIES === '1') {
      // eslint-disable-next-line no-console
      console.warn(
        `[essay-enqueue] PostgREST retry "${operation}" ${attempt}/${attempts} after ${delay}ms:`,
        msg.slice(0, 240)
      );
    }
    await new Promise((r) => setTimeout(r, delay));
  }

  return last!;
}

/** PostgREST default max rows per request is 1000; load everything for correct eligibility. */
const ID_PAGE = 1000;

async function loadAllScholarshipIdsWithEssay(
  supabase: SupabaseClient<Database>
): Promise<Set<string>> {
  const out = new Set<string>();
  for (let from = 0; ; from += ID_PAGE) {
    const { data, error } = await executePostgrestWithRetries(
      `scholarship_essays.range:${from}`,
      async () =>
        await supabase
          .from('scholarship_essays')
          .select('scholarship_id')
          .order('scholarship_id', { ascending: true })
          .range(from, from + ID_PAGE - 1)
    );
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
    const { data, error } = await executePostgrestWithRetries(
      `essay_generation_queue.active_ids.range:${from}`,
      async () =>
        await supabase
          .from('essay_generation_queue')
          .select('scholarship_id')
          .in('status', ['pending', 'processing', 'awaiting_hero'])
          .order('id', { ascending: true })
          .range(from, from + ID_PAGE - 1)
    );
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
  const { count: pendingBefore, error: cErr } = await executePostgrestWithRetries(
    'essay_generation_queue.pending_count',
    async () =>
      await supabase
        .from('essay_generation_queue')
        .select('id', { count: 'exact', head: true })
        .in('status', ['pending', 'processing', 'awaiting_hero'])
  );
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
      const { data, error } = await executePostgrestWithRetries(
        `scholarships.scan:${essayFlagsOnly ? 'essay' : 'any'}:${from}-${to}`,
        async () =>
          await q.order('updated_at', { ascending: false }).range(from, to)
      );
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

  const { data: failedPrev, error: fPrevErr } = await executePostgrestWithRetries(
    `essay_generation_queue.failed_prev:${next.id}`,
    async () =>
      await supabase
        .from('essay_generation_queue')
        .select('id')
        .eq('scholarship_id', next.id)
        .eq('status', 'failed')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
  );
  if (fPrevErr) throw new Error(fPrevErr.message);

  const title = (next.title ?? '').slice(0, 200);
  const slug = next.slug ?? null;
  const pending = pendingBefore ?? 0;

  if (failedPrev?.id) {
    const { error: upErr } = await executePostgrestWithRetries(
      `essay_generation_queue.requeue_failed:${failedPrev.id}`,
      async () =>
        await supabase
          .from('essay_generation_queue')
          .update({
            status: 'pending',
            error_message: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', failedPrev.id)
    );
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

  const { error: insErr } = await executePostgrestWithRetries(
    `essay_generation_queue.insert:${next.id}`,
    async () =>
      await supabase.from('essay_generation_queue').insert({
        scholarship_id: next.id,
        status: 'pending'
      })
  );
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
