import { NextResponse } from 'next/server';

import { runGrantNotificationDispatch } from '@/lib/notifications/runGrantNotificationDispatch';

export const dynamic = 'force-dynamic';
/** Matches other long-running cron-style routes; default serverless timeout is too low for this job. */
export const maxDuration = 300;

function isAuthorized(request: Request): boolean {
  const secret =
    process.env.GRANT_NOTIFICATION_CRON_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    '';
  if (!secret) return false;
  const auth = request.headers.get('authorization')?.trim();
  return auth === `Bearer ${secret}`;
}

/**
 * POST /api/internal/grant-notifications/run
 * Authorization: Bearer ${GRANT_NOTIFICATION_CRON_SECRET} (or CRON_SECRET fallback)
 *
 * Processes recently created/updated scholarships and sends email/Telegram digests per user prefs.
 */
export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runGrantNotificationDispatch();
    return NextResponse.json(result);
  } catch (e) {
    console.error('[grant-notifications/run]', e);
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : 'Unexpected error'
      },
      { status: 500 }
    );
  }
}
