import {
  checkUrlIndexStatus,
  isUrlInspectionIndexedInGoogle
} from '@/lib/seo/googleSearchConsole';
import { scholarshipIndexingUrl } from '@/lib/seo/googleIndexingQueue';
import { createServiceRoleSupabaseClient } from '@/lib/supabase/serviceRoleClient';
import { notifyAdminsScholarshipIndexed } from '@/lib/telegram/bot';

/** Hard cap per HTTP invocation (Google URL Inspection daily quota ~2000; spread across crons). */
export const URL_INSPECTION_ABSOLUTE_MAX_PER_RUN = 100;

export type ScholarshipIndexInspectionStatus = 'pending' | 'submitted';

export type ScholarshipIndexInspectionResult = {
  id: string;
  url: string;
  verdict?: string;
  indexed: boolean;
  skipped?: string;
};

export type RunScholarshipIndexInspectionBatchParams = {
  statuses: ScholarshipIndexInspectionStatus[];
  /** Capped by {@link URL_INSPECTION_ABSOLUTE_MAX_PER_RUN} and env URL_INSPECTION_MAX_PER_RUN. */
  limit: number;
};

function resolveBatchLimit(requested: number): number {
  const fromEnv = Number(process.env.URL_INSPECTION_MAX_PER_RUN?.trim());
  const cap = Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : requested;
  return Math.max(1, Math.min(URL_INSPECTION_ABSOLUTE_MAX_PER_RUN, cap));
}

/**
 * Runs URL Inspection for scholarships in given statuses; updates `last_index_check` on every attempt.
 * When Google reports indexed (PASS / URL_IS_ON_GOOGLE / coverage), sets `indexing_status` = `indexed` and notifies admins (category `seo`).
 */
export async function runScholarshipIndexInspectionBatch(
  params: RunScholarshipIndexInspectionBatchParams
): Promise<{
  scanned: number;
  results: ScholarshipIndexInspectionResult[];
  limitApplied: number;
}> {
  const admin = createServiceRoleSupabaseClient();
  if (!admin) {
    throw new Error('Server missing Supabase service role');
  }

  const limitApplied = resolveBatchLimit(params.limit);
  const statuses = params.statuses;

  const { data: rows, error: selErr } = await admin
    .from('scholarships')
    .select('id, slug, title, indexing_status')
    .in('indexing_status', statuses)
    .eq('is_active', true)
    .order('last_index_check', { ascending: true, nullsFirst: true })
    .order('updated_at', { ascending: true })
    .limit(limitApplied);

  if (selErr) {
    throw new Error(selErr.message);
  }

  const list = rows ?? [];
  const results: ScholarshipIndexInspectionResult[] = [];
  const statusLabel = statuses.join(',');

  console.log(
    '[scholarshipIndexInspection] batch selected',
    JSON.stringify({
      statuses,
      requestedLimit: params.limit,
      limitApplied,
      selected: list.length
    })
  );

  if (list.length === 0) {
    console.log(
      '[scholarshipIndexInspection] nothing to inspect',
      JSON.stringify({ statuses: statusLabel })
    );
  }

  for (let idx = 0; idx < list.length; idx += 1) {
    const row = list[idx]!;
    const url = scholarshipIndexingUrl({
      id: row.id,
      slug: row.slug
    });
    console.log(
      '[scholarshipIndexInspection] inspect start',
      JSON.stringify({
        statuses: statusLabel,
        index: idx + 1,
        total: list.length,
        id: row.id,
        url
      })
    );
    const inspection = await checkUrlIndexStatus(url);
    const now = new Date().toISOString();

    if (!inspection.ok) {
      await admin
        .from('scholarships')
        .update({ last_index_check: now, updated_at: now })
        .eq('id', row.id);
      results.push({
        id: row.id,
        url,
        indexed: false,
        skipped: inspection.error
      });
      console.warn(
        '[scholarshipIndexInspection] inspect error',
        JSON.stringify({
          statuses: statusLabel,
          index: idx + 1,
          total: list.length,
          id: row.id,
          error: inspection.error
        })
      );
      continue;
    }

    const indexed = isUrlInspectionIndexedInGoogle(inspection);

    if (!indexed) {
      await admin
        .from('scholarships')
        .update({ last_index_check: now, updated_at: now })
        .eq('id', row.id);
      results.push({
        id: row.id,
        url,
        verdict: inspection.verdict,
        indexed: false
      });
      console.log(
        '[scholarshipIndexInspection] not indexed yet',
        JSON.stringify({
          statuses: statusLabel,
          index: idx + 1,
          total: list.length,
          id: row.id,
          verdict: inspection.verdict
        })
      );
      continue;
    }

    const title = row.title?.trim() || 'Scholarship';
    const { error: upErr } = await admin
      .from('scholarships')
      .update({
        indexing_status: 'indexed',
        last_index_check: now,
        updated_at: now
      })
      .eq('id', row.id);

    if (upErr) {
      console.error('[scholarshipIndexInspection] update indexed failed', row.id, upErr.message);
      results.push({
        id: row.id,
        url,
        verdict: inspection.verdict,
        indexed: true,
        skipped: upErr.message
      });
      continue;
    }

    await notifyAdminsScholarshipIndexed({ title, url });

    results.push({
      id: row.id,
      url,
      verdict: inspection.verdict,
      indexed: true
    });

    console.log(
      '[scholarshipIndexInspection] marked indexed',
      JSON.stringify({
        statuses: statusLabel,
        index: idx + 1,
        total: list.length,
        id: row.id,
        verdict: inspection.verdict
      })
    );

    if ((idx + 1) % 5 === 0 || idx + 1 === list.length) {
      const indexedCount = results.filter((item) => item.indexed).length;
      const skippedCount = results.filter((item) => Boolean(item.skipped)).length;
      console.log(
        '[scholarshipIndexInspection] progress',
        JSON.stringify({
          statuses: statusLabel,
          processed: idx + 1,
          total: list.length,
          indexed: indexedCount,
          skipped: skippedCount
        })
      );
    }
  }

  return { scanned: list.length, results, limitApplied };
}
