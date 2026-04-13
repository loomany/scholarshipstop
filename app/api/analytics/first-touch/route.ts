import { NextResponse } from 'next/server';

import { formatVisitorSourceDisplay } from '@/lib/analytics/utmSourceDisplay';
import { createServiceRoleSupabaseClient } from '@/lib/supabase/serviceRoleClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function resolveTelegramChatId(): string | null {
  const direct = process.env.TELEGRAM_CHAT_ID?.trim();
  if (direct) return direct;

  const single = process.env.TELEGRAM_ADMIN_ID?.trim();
  if (single) return single;

  const list = process.env.TELEGRAM_ADMIN_IDS?.trim();
  if (list) {
    const first = list.split(',')[0]?.trim();
    if (first) return first;
  }

  return null;
}

type Body = {
  visitor_id?: unknown;
  landing_url?: unknown;
  referrer?: unknown;
  utm_source?: unknown;
  utm_medium?: unknown;
  utm_campaign?: unknown;
  utm_content?: unknown;
};

function sendNewVisitorTelegramHtml(payload: {
  utmSource: string;
  utmContent: string;
  landingUrl: string;
  referrer: string;
}): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = resolveTelegramChatId();
  if (!token || !chatId) {
    console.warn(
      '[analytics/first-touch] skip Telegram: set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID (or TELEGRAM_ADMIN_IDS)'
    );
    return Promise.resolve();
  }

  const sourceDisplay = formatVisitorSourceDisplay(payload.utmSource, payload.utmContent, {
    referrer: payload.referrer,
    landingUrl: payload.landingUrl
  });

  const text = [
    '<b>New Visitor on ScholarshipTop!</b>',
    '',
    `<b>Source:</b> ${escapeHtml(sourceDisplay)}`,
    `<b>Landing:</b> ${escapeHtml(payload.landingUrl)}`
  ].join('\n');

  const url = `https://api.telegram.org/bot${encodeURIComponent(token)}/sendMessage`;

  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true
    })
  }).then(async (res) => {
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error('[analytics/first-touch] Telegram send failed', res.status, errText);
    }
  });
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const visitorId =
    typeof body.visitor_id === 'string' ? body.visitor_id.trim() : '';
  if (!visitorId || !UUID_V4_RE.test(visitorId)) {
    return NextResponse.json({ error: 'Invalid visitor_id' }, { status: 400 });
  }

  const landing_url =
    typeof body.landing_url === 'string' ? body.landing_url.trim() : '';
  if (!landing_url || landing_url.length > 4000) {
    return NextResponse.json({ error: 'Invalid landing_url' }, { status: 400 });
  }

  const referrer =
    typeof body.referrer === 'string' ? body.referrer.trim().slice(0, 4000) : '';
  const utm_source =
    typeof body.utm_source === 'string' ? body.utm_source.trim().slice(0, 500) : '';
  const utm_medium =
    typeof body.utm_medium === 'string' ? body.utm_medium.trim().slice(0, 500) : '';
  const utm_campaign =
    typeof body.utm_campaign === 'string'
      ? body.utm_campaign.trim().slice(0, 500)
      : '';
  const utm_content =
    typeof body.utm_content === 'string' ? body.utm_content.trim().slice(0, 500) : '';

  const supabase = createServiceRoleSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const { data, error } = await supabase
    .from('anonymous_visitor_first_touch')
    .insert({
      visitor_id: visitorId,
      landing_url,
      referrer: referrer || null,
      utm_source: utm_source || null,
      utm_medium: utm_medium || null,
      utm_campaign: utm_campaign || null,
      utm_content: utm_content || null
    })
    .select('id')
    .maybeSingle();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ success: true, status: 'duplicate' });
    }
    console.error('[analytics/first-touch] insert error', error);
    return NextResponse.json({ error: 'Insert failed' }, { status: 500 });
  }

  if (!data?.id) {
    return NextResponse.json({ success: true, status: 'duplicate' });
  }

  void sendNewVisitorTelegramHtml({
    utmSource: utm_source,
    utmContent: utm_content,
    landingUrl: landing_url,
    referrer
  }).catch((e) => {
    console.error('[analytics/first-touch] telegram async error', e);
  });

  return NextResponse.json({ success: true, status: 'new' });
}
