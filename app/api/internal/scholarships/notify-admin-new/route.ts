import { NextResponse } from 'next/server';

import {
  pingGoogleIndexingDirect,
  scholarshipIndexingUrl
} from '@/lib/seo/googleIndexingQueue';
import { createServiceRoleSupabaseClient } from '@/lib/supabase/serviceRoleClient';
import { notifyEnvTelegramAdminsNewScholarship } from '@/lib/telegram/bot';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/internal/scholarships/notify-admin-new
 * Authorization: Bearer ${SCHOLARSHIP_NEW_ADMIN_NOTIFY_SECRET}
 *
 * Call from Supabase **Database Webhook** on `public.scholarships` INSERT (or manually for tests).
 * Sends a Telegram message only to chats in TELEGRAM_ADMIN_IDS / TELEGRAM_ADMIN_ID (not `telegram_users`).
 * Then pings Google Indexing API for the public scholarship URL (direct, no local JSON queue).
 *
 * Supabase payload shape: `{ type, table, schema, record }` — we read `record`.
 * Manual / curl body: `{ "id": "uuid", "title": "...", "slug": "..." }`
 */
function isAuthorized(request: Request): boolean {
  const secret =
    process.env.SCHOLARSHIP_NEW_ADMIN_NOTIFY_SECRET?.trim() ||
    process.env.TELEGRAM_WEBHOOK_SECRET?.trim() ||
    '';
  if (!secret) return false;
  const auth = request.headers.get('authorization')?.trim();
  return auth === `Bearer ${secret}`;
}

type ScholarshipRowLike = {
  id?: unknown;
  slug?: unknown;
  title?: unknown;
  source?: unknown;
  source_id?: unknown;
  url?: unknown;
  official_source_name?: unknown;
};

function pickRecord(body: unknown): ScholarshipRowLike | null {
  if (!body || typeof body !== 'object') return null;
  const o = body as Record<string, unknown>;
  if (o.record && typeof o.record === 'object') {
    return o.record as ScholarshipRowLike;
  }
  if (typeof o.id === 'string') {
    return o as ScholarshipRowLike;
  }
  return null;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const record = pickRecord(body);
  const id = record && typeof record.id === 'string' ? record.id : null;
  if (!record || !id) {
    return NextResponse.json(
      { error: 'Missing record.id (Supabase webhook should send record with id)' },
      { status: 400 }
    );
  }

  const slug =
    typeof record.slug === 'string' && record.slug.trim()
      ? record.slug.trim()
      : null;
  const title =
    typeof record.title === 'string' && record.title.trim()
      ? record.title.trim()
      : null;
  const source =
    typeof record.source === 'string' && record.source.trim()
      ? record.source.trim()
      : null;
  const sourceId =
    typeof record.source_id === 'string' && record.source_id.trim()
      ? record.source_id.trim()
      : null;
  const originalUrl =
    typeof record.url === 'string' && record.url.trim()
      ? record.url.trim()
      : null;
  const officialSourceName =
    typeof record.official_source_name === 'string' &&
    record.official_source_name.trim()
      ? record.official_source_name.trim()
      : null;

  await notifyEnvTelegramAdminsNewScholarship({
    id,
    slug,
    title,
    source,
    sourceId,
    originalUrl,
    officialSourceName
  });

  const scholarshipUrl = scholarshipIndexingUrl({ id, slug });
  const googleIndexing = await pingGoogleIndexingDirect(scholarshipUrl);

  const admin = createServiceRoleSupabaseClient();
  if (admin) {
    const indexing_status = googleIndexing.ok ? 'submitted' : 'pending';
    const { error: idxErr } = await admin
      .from('scholarships')
      .update({
        indexing_status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);
    if (idxErr) {
      console.error(
        '[notify-admin-new] scholarships indexing_status update failed',
        idxErr.message
      );
    }
  }

  return NextResponse.json({ ok: true, googleIndexing });
}
