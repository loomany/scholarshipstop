import { NextResponse } from 'next/server';

import { sendWeeklyFreeDigestPreview } from '@/lib/notifications/runWeeklyFreeDigest';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function isAuthorized(request: Request): boolean {
  const secret =
    process.env.WEEKLY_FREE_DIGEST_CRON_SECRET?.trim() ||
    process.env.GRANT_NOTIFICATION_CRON_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    '';
  if (!secret) return false;
  const auth = request.headers.get('authorization')?.trim();
  return auth === `Bearer ${secret}`;
}

/**
 * POST /api/internal/weekly-free-digest/preview
 * Body: { "to": "email@..." } — sample send; does not write weekly_free_digest_sent.
 */
export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let to = '';
  let profileUserId: string | undefined;
  try {
    const body = (await request.json()) as { to?: string; profileUserId?: string };
    to = typeof body.to === 'string' ? body.to.trim() : '';
    profileUserId =
      typeof body.profileUserId === 'string' ? body.profileUserId.trim() : undefined;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return NextResponse.json({ error: 'Body must include a valid "to" email' }, { status: 400 });
  }

  try {
    const result = await sendWeeklyFreeDigestPreview(to, {
      profileUserId: profileUserId ?? process.env.WEEKLY_FREE_DIGEST_PREVIEW_USER_ID?.trim()
    });
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, skipped: result.skipped, detail: result.detail },
        { status: result.skipped === 'No qualifying free user for preview' ? 404 : 400 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[weekly-free-digest/preview]', e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}
