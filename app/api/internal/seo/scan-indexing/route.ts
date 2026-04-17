import { NextResponse } from 'next/server';

import {
  checkUrlIndexStatus,
  isUrlInspectionIndexedInGoogle
} from '@/lib/seo/googleSearchConsole';
import { scholarshipIndexingUrl } from '@/lib/seo/googleIndexingQueue';
import { createServiceRoleSupabaseClient } from '@/lib/supabase/serviceRoleClient';
import { notifyEnvTelegramAdminsPlainText } from '@/lib/telegram/bot';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BATCH_LIMIT = 50;

function isAuthorized(request: Request): boolean {
  const secret = process.env.GOOGLE_INDEXING_SECRET?.trim();
  const auth = request.headers.get('authorization')?.trim();
  return Boolean(secret && auth === `Bearer ${secret}`);
}

/**
 * POST /api/internal/seo/scan-indexing
 * Authorization: Bearer ${GOOGLE_INDEXING_SECRET}
 *
 * URL Inspection quota: processes up to {@link BATCH_LIMIT} scholarships per run where
 * `indexing_status` is `pending` (not yet processed) or `submitted` (Indexing API ping ok, awaiting PASS).
 */
export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createServiceRoleSupabaseClient();
  if (!admin) {
    return NextResponse.json(
      { error: 'Server missing Supabase service role' },
      { status: 500 }
    );
  }

  const { data: rows, error: selErr } = await admin
    .from('scholarships')
    .select('id, slug, title, indexing_status')
    .in('indexing_status', ['pending', 'submitted'])
    .eq('is_active', true)
    .order('updated_at', { ascending: true })
    .limit(BATCH_LIMIT);

  if (selErr) {
    return NextResponse.json({ error: selErr.message }, { status: 500 });
  }

  const list = rows ?? [];
  const results: {
    id: string;
    url: string;
    verdict?: string;
    indexed: boolean;
    skipped?: string;
  }[] = [];

  for (const row of list) {
    const url = scholarshipIndexingUrl({
      id: row.id,
      slug: row.slug
    });
    const inspection = await checkUrlIndexStatus(url);
    const indexed = isUrlInspectionIndexedInGoogle(inspection);

    results.push({
      id: row.id,
      url,
      verdict: inspection.ok ? inspection.verdict : undefined,
      indexed,
      ...(!inspection.ok ? { skipped: inspection.error } : {})
    });

    if (!indexed) continue;

    const title = row.title?.trim() || 'Scholarship';
    const { error: upErr } = await admin
      .from('scholarships')
      .update({
        indexing_status: 'indexed',
        updated_at: new Date().toISOString()
      })
      .eq('id', row.id);

    if (upErr) {
      console.error('[scan-indexing] update indexed failed', row.id, upErr.message);
      continue;
    }

    await notifyEnvTelegramAdminsPlainText(
      `✅ Страница проиндексирована и появилась в выдаче: ${title} ${url}`,
      'seo'
    );
  }

  return NextResponse.json({
    ok: true,
    scanned: list.length,
    results
  });
}
