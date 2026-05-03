import { NextResponse } from 'next/server';

import { escapeTelegramHtml } from '@/lib/telegram/resourceNotifyCore';

export const runtime = 'nodejs';

function sanitizePublicPathname(raw: unknown): string {
  if (typeof raw !== 'string') return '/';
  let decoded = raw.trim().slice(0, 500);
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    /* keep truncated raw */
  }
  const t = decoded.replace(/\s+/g, '');
  if (!t || t.startsWith('//') || /^https?:\/\//i.test(t)) return '/';
  const withSlash = t.startsWith('/') ? t : `/${t}`;
  if (withSlash.includes('../') || withSlash.includes('\\')) return '/';
  return withSlash || '/';
}

/**
 * Fire-and-forget style alert when a session is attributed to ChatGPT / custom GPT traffic.
 * Always responds with 200 so client never surfaces hard errors; Telegram failures are logged only.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    let pathname = '/';
    try {
      const body = (await request.json()) as { pathname?: unknown };
      pathname = sanitizePublicPathname(body?.pathname);
    } catch {
      pathname = '/';
    }

    const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
    const chatId = process.env.TELEGRAM_CHAT_ID?.trim();

    if (!token || !chatId) {
      console.warn(
        '[api/track-gpt-visit] Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID; skip send'
      );
      return NextResponse.json({ ok: true, sent: false }, { status: 200 });
    }

    const safePath = escapeTelegramHtml(pathname);
    const text = [
      '🤖 <b>Новый переход из GPT!</b>',
      '',
      `📍 Страница: <code>${safePath}</code>`
    ].join('\n');

    const ctrl = new AbortController();
    const timeoutId = setTimeout(() => ctrl.abort(), 12_000);
    let telegramRes: Response;
    try {
      telegramRes = await fetch(
        `https://api.telegram.org/bot${token}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: 'HTML',
            disable_web_page_preview: true
          }),
          signal: ctrl.signal
        }
      );
    } finally {
      clearTimeout(timeoutId);
    }

    if (!telegramRes.ok) {
      const errText = await telegramRes.text().catch(() => '');
      console.error(
        '[api/track-gpt-visit] Telegram sendMessage failed',
        telegramRes.status,
        errText.slice(0, 500)
      );
    }

    return NextResponse.json({ ok: true, sent: telegramRes.ok }, { status: 200 });
  } catch (e) {
    console.error('[api/track-gpt-visit]', e);
    return NextResponse.json({ ok: true, sent: false }, { status: 200 });
  }
}
