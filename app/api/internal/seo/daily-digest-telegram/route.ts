import { NextResponse } from 'next/server';

import { runSeoHubDailyTelegramDigest } from '@/lib/telegram/seoHubDailyDigest';
import { getURL } from '@/utils/helpers';

export const dynamic = 'force-dynamic';

function isAuthorized(request: Request): boolean {
  const secret =
    process.env.SEO_DAILY_DIGEST_CRON_SECRET?.trim() ||
    process.env.GRANT_NOTIFICATION_CRON_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    '';
  if (!secret) return false;
  const auth = request.headers.get('authorization')?.trim();
  return auth === `Bearer ${secret}`;
}

/**
 * POST /api/internal/seo/daily-digest-telegram
 * Authorization: Bearer ${SEO_DAILY_DIGEST_CRON_SECRET} or GRANT_NOTIFICATION_CRON_SECRET or CRON_SECRET
 *
 * Sends one Telegram message per admin (category seo) listing SEO hub pages
 * touched in the last 24 hours (queue + hub cache).
 */
export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const baseUrl = getURL().replace(/\/$/, '');
    const result = await runSeoHubDailyTelegramDigest({ baseUrl });
    return NextResponse.json(result);
  } catch (e) {
    console.error('[seo/daily-digest-telegram]', e);
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : 'Unexpected error'
      },
      { status: 500 }
    );
  }
}
