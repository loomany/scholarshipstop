import { NextResponse } from 'next/server';

import { notifyEnvTelegramAdminsPlainText } from '@/lib/telegram/bot';
import { escapeTelegramHtml } from '@/lib/telegram/resourceNotifyCore';

export const runtime = 'nodejs';

function isAiNavigatorClickNotifyEnabled(): boolean {
  const v = process.env.AI_NAVIGATOR_CLICK_TELEGRAM_NOTIFY?.trim().toLowerCase();
  return !(v === '0' || v === 'false' || v === 'no' || v === 'off');
}

function sanitizePublicPath(raw: unknown): string {
  if (typeof raw !== 'string') return '/';
  let decoded = raw.trim().slice(0, 1000);
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

function sanitizeSnippet(raw: unknown, max = 280): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(/\s+/g, ' ').trim().slice(0, max);
}

function siteBaseOrigin(): URL {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.SITE_URL?.trim() ||
    'https://scholarshiptop.com/';
  try {
    return new URL(raw.includes('://') ? raw : `https://${raw}`);
  } catch {
    return new URL('https://scholarshiptop.com/');
  }
}

function maskedClientIp(forwarded: string | null): string {
  const h = forwarded?.trim() ?? '';
  if (!h) return '—';
  const first = h.split(',')[0]?.trim();
  if (!first) return '—';
  const v4 = first.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3})\.\d{1,3}$/);
  if (v4) return `${v4[1]}.*`;
  if (first.includes(':')) return `${first.slice(0, Math.min(first.length, 24))}…`;
  return first.slice(0, 42);
}

/**
 * Lightweight beacon from homepage AI Navigator orb. Alerts admins subscribed to Telegram
 * traffic notifications (same audience as visitor/traffic tooling).
 */
export async function POST(request: Request): Promise<Response> {
  try {
    if (!isAiNavigatorClickNotifyEnabled()) {
      return new NextResponse(null, { status: 204 });
    }

    let body: unknown = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }
    const o = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};

    const path = sanitizePublicPath(o.pathname);
    const referrer = sanitizeSnippet(o.referrer, 220);

    const origin = siteBaseOrigin();
    let canonicalPage = `${origin.origin}${path}`;
    try {
      const u = new URL(path, `${origin.origin}/`);
      if (u.origin === origin.origin) canonicalPage = u.href;
      else canonicalPage = `${origin.origin}${path}`;
    } catch {
      canonicalPage = `${origin.origin}${path}`;
    }

    const ua = sanitizeSnippet(request.headers.get('user-agent') ?? '', 200);
    const ip = maskedClientIp(request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip'));
    const when = new Date().toISOString();

    const tgLines = [
      '<b>ScholarshipTop Navigator</b> — клик по AI на сайте',
      'Пользователь идёт в GPT в новой вкладке или в приложение (как решит платформа).',
      '',
      `<b>Страница</b> → <code>${escapeTelegramHtml(path)}</code>`,
      `<b>canonical</b> → <code>${escapeTelegramHtml(canonicalPage.slice(0, 480))}</code>`,
      referrer ? `<b>Referrer</b> → ${escapeTelegramHtml(referrer)}` : null,
      '',
      `<b>UTC</b> → <code>${escapeTelegramHtml(when)}</code>`,
      `<b>UA</b> (обрезан) → ${escapeTelegramHtml(ua || '—')}`,
      `<b>IP</b> (маска) → ${escapeTelegramHtml(ip)}`
    ].filter((line): line is string => line !== null && line !== '');

    await notifyEnvTelegramAdminsPlainText(tgLines.join('\n'), 'traffic', undefined, {
      parse_mode: 'HTML'
    });
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    console.error('[telemetry/ai-navigator-click]', e);
    return new NextResponse(null, { status: 204 });
  }
}
