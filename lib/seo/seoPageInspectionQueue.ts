import 'server-only';

import {
  checkUrlIndexStatus,
  isUrlInspectionIndexedInGoogle
} from '@/lib/seo/googleSearchConsole';
import { createServiceRoleSupabaseClient } from '@/lib/supabase/serviceRoleClient';

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_LIMIT = 100;
const ABSOLUTE_MAX = 100;

type InspectionQueueRow = {
  id: string;
  url: string;
  attempt_count: number;
};

function normalizeUrl(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;
  try {
    return new URL(raw).toString();
  } catch {
    return null;
  }
}

export async function enqueueSeoPageInspectionUrls(input: {
  urls: string[];
  source?: string;
}) {
  const admin = createServiceRoleSupabaseClient();
  if (!admin) {
    throw new Error('Server missing Supabase service role for SEO page inspection queue');
  }

  const source = input.source?.trim() || 'manual';
  const now = new Date().toISOString();
  const urls = [...new Set(input.urls.map(normalizeUrl).filter((v): v is string => Boolean(v)))];
  if (urls.length === 0) {
    return { ok: true, enqueued: 0, pending: 0, total: 0 };
  }

  const payload = urls.map((url) => ({
    url,
    source,
    status: 'pending' as const,
    added_at: now,
    updated_at: now,
    next_check_at: now,
    last_checked_at: null as string | null,
    last_error: null as string | null
  }));

  const { error } = await admin
    .from('seo_page_inspection_queue')
    .upsert(payload, { onConflict: 'url' });

  if (error) {
    throw new Error(error.message);
  }

  const [{ count: pendingCount }, { count: totalCount }] = await Promise.all([
    admin
      .from('seo_page_inspection_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending'),
    admin
      .from('seo_page_inspection_queue')
      .select('*', { count: 'exact', head: true })
  ]);

  return {
    ok: true,
    enqueued: urls.length,
    pending: pendingCount ?? 0,
    total: totalCount ?? 0
  };
}

function resolveLimit(raw?: number): number {
  return Math.max(1, Math.min(ABSOLUTE_MAX, Math.floor(raw ?? DEFAULT_LIMIT) || DEFAULT_LIMIT));
}

export async function runSeoPageInspectionQueueBatch(limit = DEFAULT_LIMIT) {
  const admin = createServiceRoleSupabaseClient();
  if (!admin) {
    throw new Error('Server missing Supabase service role for SEO page inspection queue');
  }

  const appliedLimit = resolveLimit(limit);
  const now = new Date();
  const nowIso = now.toISOString();

  const { data, error } = await admin
    .from('seo_page_inspection_queue')
    .select('id, url, attempt_count')
    .eq('status', 'pending')
    .lte('next_check_at', nowIso)
    .order('added_at', { ascending: true })
    .limit(appliedLimit);

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as InspectionQueueRow[];
  const results: Array<{
    id: string;
    url: string;
    indexed: boolean;
    verdict?: string;
    coverageState?: string;
    skipped?: string;
  }> = [];

  for (const row of rows) {
    const inspection = await checkUrlIndexStatus(row.url);
    const nextAttempts = (row.attempt_count ?? 0) + 1;

    if (!inspection.ok) {
      await admin
        .from('seo_page_inspection_queue')
        .update({
          status: 'pending',
          attempt_count: nextAttempts,
          last_checked_at: nowIso,
          next_check_at: new Date(now.getTime() + DAY_MS).toISOString(),
          last_error: inspection.error,
          last_verdict: null,
          last_coverage_state: null
        })
        .eq('id', row.id);

      results.push({
        id: row.id,
        url: row.url,
        indexed: false,
        skipped: inspection.error
      });
      continue;
    }

    const indexed = isUrlInspectionIndexedInGoogle(inspection);
    if (indexed) {
      await admin
        .from('seo_page_inspection_queue')
        .update({
          status: 'indexed',
          attempt_count: nextAttempts,
          last_checked_at: nowIso,
          next_check_at: nowIso,
          last_error: null,
          last_verdict: inspection.verdict,
          last_coverage_state: inspection.coverageState ?? null
        })
        .eq('id', row.id);

      results.push({
        id: row.id,
        url: row.url,
        indexed: true,
        verdict: inspection.verdict,
        coverageState: inspection.coverageState
      });
      continue;
    }

    await admin
      .from('seo_page_inspection_queue')
      .update({
        status: 'pending',
        attempt_count: nextAttempts,
        last_checked_at: nowIso,
        next_check_at: new Date(now.getTime() + DAY_MS).toISOString(),
        last_error: null,
        last_verdict: inspection.verdict,
        last_coverage_state: inspection.coverageState ?? null
      })
      .eq('id', row.id);

    results.push({
      id: row.id,
      url: row.url,
      indexed: false,
      verdict: inspection.verdict,
      coverageState: inspection.coverageState
    });
  }

  return {
    scanned: rows.length,
    limitApplied: appliedLimit,
    results
  };
}
