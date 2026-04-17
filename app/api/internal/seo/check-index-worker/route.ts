import { NextResponse } from 'next/server';

import { runScholarshipIndexInspectionBatch } from '@/lib/seo/scholarshipIndexInspectionWorker';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Default rows per run (pending queue). Override with URL_INSPECTION_MAX_PER_RUN (capped at 100). */
const DEFAULT_PENDING_BATCH = 50;

function isAuthorized(request: Request): boolean {
  const secret = process.env.GOOGLE_INDEXING_SECRET?.trim();
  const auth = request.headers.get('authorization')?.trim();
  return Boolean(secret && auth === `Bearer ${secret}`);
}

/**
 * POST /api/internal/seo/check-index-worker
 * Authorization: Bearer ${GOOGLE_INDEXING_SECRET}
 *
 * Processes up to {@link DEFAULT_PENDING_BATCH} scholarships with `indexing_status = 'pending'`
 * (oldest / never-checked first). Uses URL Inspection API; on PASS updates to `indexed` and sends Telegram (seo).
 *
 * Pair with `scan-indexing` (submitted rows after Indexing API ping). Total inspections per cron = both batches;
 * keep under Google daily URL Inspection quota (~2000).
 */
export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { scanned, results, limitApplied } = await runScholarshipIndexInspectionBatch({
      statuses: ['pending'],
      limit: DEFAULT_PENDING_BATCH
    });

    return NextResponse.json({
      ok: true,
      mode: 'pending',
      scanned,
      limitApplied,
      results
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('[check-index-worker]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
