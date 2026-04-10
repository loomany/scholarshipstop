import { NextResponse } from 'next/server';

import { runGrantNotificationTestSample } from '@/lib/notifications/runGrantNotificationTestSample';

export const dynamic = 'force-dynamic';

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
 * POST /api/internal/grant-notifications/test-sample
 * Sends one sample grant card to env-configured test email / Telegram chat (cron QA).
 */
export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await runGrantNotificationTestSample();
  return NextResponse.json(result);
}
