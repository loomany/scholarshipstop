import { NextResponse } from 'next/server';

import { runWeeklyFreeDigestDispatch } from '@/lib/notifications/runWeeklyFreeDigest';

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
 * POST /api/internal/weekly-free-digest/run
 * Weekly digest for free users (profile match threshold + dedup per ET week).
 */
export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runWeeklyFreeDigestDispatch();
    return NextResponse.json(result);
  } catch (e) {
    console.error('[weekly-free-digest/run]', e);
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : 'Unexpected error'
      },
      { status: 500 }
    );
  }
}
