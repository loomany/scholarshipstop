import { NextResponse } from 'next/server';

import { escapeTelegramHtml } from '@/lib/telegram/resourceNotifyCore';

export const runtime = 'nodejs';

/** Parses comma-separated numeric Telegram chat ids (same convention as TELEGRAM_ADMIN_IDS). */
function parseNumericTelegramChatIds(raw: string | undefined | null): string[] {
  const s = raw?.trim();
  if (!s) return [];
  return s
    .split(',')
    .map((p) => Number(p.trim()))
    .filter((n) => Number.isFinite(n))
    .map((n) => String(Math.trunc(n)));
}

/**
 * Prefer TELEGRAM_CHAT_ID; if unset, reuse TELEGRAM_ADMIN_IDS / TELEGRAM_ADMIN_ID (prod often
 * has only those set — avoids silent no-op when GPT traffic hits).
 */
function resolveRecipientChatIds(): string[] {
  const explicit = parseNumericTelegramChatIds(process.env.TELEGRAM_CHAT_ID);
  if (explicit.length > 0) return [...new Set(explicit)];

  const fromMulti = parseNumericTelegramChatIds(process.env.TELEGRAM_ADMIN_IDS);
  const fromSingle = parseNumericTelegramChatIds(process.env.TELEGRAM_ADMIN_ID);
  return [...new Set([...fromMulti, ...fromSingle])];
}

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
    const chatIds = resolveRecipientChatIds();

    if (!token || chatIds.length === 0) {
      console.warn(
        '[api/track-gpt-visit] Missing TELEGRAM_BOT_TOKEN or no chat target (TELEGRAM_CHAT_ID, TELEGRAM_ADMIN_IDS / TELEGRAM_ADMIN_ID); skip send'
      );
      return NextResponse.json({ ok: true, sent: false }, { status: 200 });
    }

    const safePath = escapeTelegramHtml(pathname);
    const text = [
      '🤖 <b>Новый переход из GPT!</b>',
      '',
      `📍 Страница: <code>${safePath}</code>`
    ].join('\n');

    let anyOk = false;
    for (const chatId of chatIds) {
      const ctrl = new AbortController();
      const timeoutId = setTimeout(() => ctrl.abort(), 12_000);
      try {
        const telegramRes = await fetch(
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

        if (telegramRes.ok) {
          anyOk = true;
        } else {
          const errText = await telegramRes.text().catch(() => '');
          console.error(
            '[api/track-gpt-visit] Telegram sendMessage failed',
            { chatId, status: telegramRes.status, detail: errText.slice(0, 500) }
          );
        }
      } finally {
        clearTimeout(timeoutId);
      }
    }

    return NextResponse.json({ ok: true, sent: anyOk }, { status: 200 });
  } catch (e) {
    console.error('[api/track-gpt-visit]', e);
    return NextResponse.json({ ok: true, sent: false }, { status: 200 });
  }
}
