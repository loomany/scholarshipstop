import { NextResponse } from 'next/server';

import { notifyEnvTelegramAdminsNewScholarship } from '@/lib/telegram/bot';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/internal/scholarships/notify-admin-new
 * Authorization: Bearer ${SCHOLARSHIP_NEW_ADMIN_NOTIFY_SECRET}
 *
 * Call from Supabase **Database Webhook** on `public.scholarships` INSERT (or manually for tests).
 * Sends a Telegram message only to chats in TELEGRAM_ADMIN_IDS / TELEGRAM_ADMIN_ID (not `telegram_users`).
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

  await notifyEnvTelegramAdminsNewScholarship({ id, slug, title });

  return NextResponse.json({ ok: true });
}
