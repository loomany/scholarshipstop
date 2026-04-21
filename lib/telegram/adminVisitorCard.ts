import 'server-only';

import { formatTrafficChannelLabel } from '@/lib/analytics/resolveTrafficChannel';
import type { TrafficChannel } from '@/lib/analytics/resolveTrafficChannel';
import { getEmailSiteOrigin } from '@/lib/email/emailSiteOrigin';
import { escapeTelegramHtml } from '@/lib/telegram/resourceNotifyCore';

const KARAGANDA_TZ = 'Asia/Qaraganda';

export type VisitorCardTouch = {
  visitor_id: string;
  landing_url: string;
  traffic_channel: string | null;
  created_at: string;
  is_likely_bot: boolean | null;
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  click_id: string | null;
  user_agent_snapshot: string | null;
};

export type VisitorCardAttribution = {
  user_id: string | null;
  first_seen_at: string;
  last_seen_at: string;
  first_source: string | null;
  first_medium: string | null;
  first_campaign: string | null;
  first_referrer: string | null;
  first_landing_path: string | null;
  last_source: string | null;
  last_medium: string | null;
  last_campaign: string | null;
  last_referrer: string | null;
  last_landing_path: string | null;
};

export type VisitorPageViewRow = {
  path: string;
  kind: string;
  seen_at: string;
};

type ProfileLite = {
  created_at: string;
  first_name: string | null;
  last_name: string | null;
};

type AuthUserLite = {
  email: string | null;
};

function toLandingPath(rawUrl: string): string {
  try {
    return new URL(rawUrl).pathname || '/';
  } catch {
    return rawUrl || '/';
  }
}

/** Telegram HTML `href` attribute: escape quotes and ampersands. */
function escapeHref(url: string): string {
  return url.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function siteOrigin(): string {
  return getEmailSiteOrigin().replace(/\/+$/, '');
}

function absoluteUrl(pathOrUrl: string): string {
  const p = (pathOrUrl || '/').trim();
  if (!p) return `${siteOrigin()}/`;
  if (p.startsWith('http://') || p.startsWith('https://')) return p;
  const path = p.startsWith('/') ? p : `/${p}`;
  return `${siteOrigin()}${path}`;
}

function pageLinkHtml(path: string): string {
  const pathNorm = path.startsWith('/') ? path : `/${path}`;
  const href = escapeHref(absoluteUrl(pathNorm));
  const label = escapeTelegramHtml(pathNorm.length > 64 ? `${pathNorm.slice(0, 61)}…` : pathNorm);
  return `<a href="${href}">${label}</a>`;
}

export function formatKaragandaDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const parts = new Intl.DateTimeFormat('ru-RU', {
    timeZone: KARAGANDA_TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(d);
  const get = (t: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === t)?.value ?? '';
  const dd = get('day');
  const mm = get('month');
  const yy = get('year');
  const hh = get('hour');
  const min = get('minute');
  return `${dd}.${mm}.${yy} ${hh}:${min}`;
}

export function summarizeUserAgent(ua: string | null | undefined): string {
  if (!ua?.trim()) return '—';
  const s = ua.trim();
  const isIOS = /iPhone|iPad|iPod/i.test(s);
  const isAndroid = /Android/i.test(s);
  const ver =
    s.match(/CPU (?:iPhone )?OS ([\d_]+)/i)?.[1]?.replace(/_/g, '.') ??
    s.match(/Android ([\d.]+)/i)?.[1] ??
    '';
  if (isIOS) {
    const safari = /Version\/([\d.]+)/i.exec(s);
    const chrome = /CriOS\/([\d.]+)/i.exec(s);
    const device = /iPad/i.test(s) ? 'iPad' : 'iPhone';
    const browser = chrome
      ? `Chrome ${chrome[1]}`
      : safari
        ? `Safari ${safari[1]}`
        : 'Safari';
    return ver ? `${device} · iOS ${ver} · ${browser}` : `${device} · ${browser}`;
  }
  if (isAndroid) {
    const chrome = /Chrome\/([\d.]+)/i.exec(s);
    return ver
      ? `Android ${ver}${chrome ? ` · Chrome ${chrome[1]}` : ''}`
      : `Android${chrome ? ` · Chrome ${chrome[1]}` : ''}`;
  }
  if (/Windows NT/i.test(s)) {
    const edge = /Edg\/([\d.]+)/i.exec(s);
    const chrome = /Chrome\/([\d.]+)/i.exec(s);
    if (edge) return `Windows · Edge ${edge[1]}`;
    if (chrome) return `Windows · Chrome ${chrome[1]}`;
    return 'Windows · браузер';
  }
  if (/Mac OS X/i.test(s)) {
    const chrome = /Chrome\/([\d.]+)/i.exec(s);
    const safari = /Version\/([\d.]+).*Safari/i.exec(s);
    if (chrome) return `macOS · Chrome ${chrome[1]}`;
    if (safari) return `macOS · Safari ${safari[1]}`;
    return 'macOS';
  }
  return s.length > 72 ? `${escapeTelegramHtml(s.slice(0, 69))}…` : escapeTelegramHtml(s);
}

function formatDurationRu(totalSec: number): string {
  if (!Number.isFinite(totalSec) || totalSec <= 0) return '0 сек';
  if (totalSec < 60) return `${totalSec} сек`;
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  if (minutes < 60) return seconds > 0 ? `${minutes} мин ${seconds} сек` : `${minutes} мин`;
  const hours = Math.floor(minutes / 60);
  const restMinutes = minutes % 60;
  if (restMinutes > 0) return `${hours} ч ${restMinutes} мин`;
  return `${hours} ч`;
}

function referrerLineHtml(referrer: string | null | undefined): string {
  const r = (referrer ?? '-').trim();
  if (!r || r === '-') return escapeTelegramHtml('-');
  if (r.startsWith('http://') || r.startsWith('https://')) {
    const short = r.length > 120 ? `${r.slice(0, 117)}…` : r;
    return `<a href="${escapeHref(r)}">${escapeTelegramHtml(short)}</a>`;
  }
  return escapeTelegramHtml(r.slice(0, 300));
}

function buildVisitedSection(
  pageViews: VisitorPageViewRow[],
  lastSeenIso: string
): string {
  const views = pageViews.filter((r) => r.kind === 'view');
  const leaves = pageViews.filter((r) => r.kind === 'leave');

  if (views.length === 0) {
    return 'Нет данных о переходах (ждём пинги с сайта).';
  }

  const asc = [...views].sort(
    (a, b) => new Date(a.seen_at).getTime() - new Date(b.seen_at).getTime()
  );
  const lastSeenMs = new Date(lastSeenIso).getTime();
  const lines: string[] = [];
  const maxRows = 22;
  const slice = asc.length > maxRows ? asc.slice(-maxRows) : asc;
  const skipped = asc.length - slice.length;
  const indexBase = skipped;

  for (let i = 0; i < slice.length; i++) {
    const row = slice[i]!;
    const t = formatKaragandaDateTime(row.seen_at);
    const next = slice[i + 1];
    let dwellLabel: string;
    if (next) {
      const sec = Math.max(
        0,
        Math.floor(
          (new Date(next.seen_at).getTime() - new Date(row.seen_at).getTime()) / 1000
        )
      );
      dwellLabel = `~${formatDurationRu(sec)} до следующего перехода`;
    } else {
      const sec = Math.max(
        0,
        Math.floor((lastSeenMs - new Date(row.seen_at).getTime()) / 1000)
      );
      dwellLabel = `~${formatDurationRu(sec)} до последней активности`;
    }
    lines.push(
      `${indexBase + i + 1}) ${pageLinkHtml(row.path)} · ${escapeTelegramHtml(t)} · ${escapeTelegramHtml(dwellLabel)}`
    );
  }

  if (skipped > 0) {
    lines.unshift(
      `<i>Показаны последние ${slice.length} из ${asc.length} переходов.</i>`
    );
  }

  if (leaves.length > 0) {
    const lastLeave = [...leaves].sort(
      (a, b) => new Date(b.seen_at).getTime() - new Date(a.seen_at).getTime()
    )[0]!;
    lines.push(
      '',
      `<b>Уход с сайта (по сигналу вкладки):</b> ${escapeTelegramHtml(formatKaragandaDateTime(lastLeave.seen_at))}`
    );
  }

  return lines.join('\n');
}

export function buildVisitorAdminCardHtml(input: {
  visitorId: string;
  touch: VisitorCardTouch;
  attribution: VisitorCardAttribution | null;
  pageViews: VisitorPageViewRow[];
  registeredUserId: string | null;
  authUser: AuthUserLite | null;
  profile: ProfileLite | null;
}): string {
  const { visitorId, touch, attribution, pageViews, registeredUserId, authUser, profile } =
    input;

  const firstSeen = attribution?.first_seen_at ?? touch.created_at;
  const lastSeen = attribution?.last_seen_at ?? touch.created_at;
  const durationSec = Math.max(
    0,
    Math.floor((new Date(lastSeen).getTime() - new Date(firstSeen).getTime()) / 1000)
  );
  const source = formatTrafficChannelLabel((touch.traffic_channel as TrafficChannel) ?? null);
  const qualityFlags = [
    touch.click_id ? 'paid-marker:yes' : 'paid-marker:no',
    (touch.referrer ?? '').toLowerCase().includes('google.com')
      ? 'google-referrer:yes'
      : 'google-referrer:no',
    touch.is_likely_bot ? 'bot:yes' : 'bot:no'
  ];

  const landingPath = toLandingPath(touch.landing_url);
  const landingLink = pageLinkHtml(landingPath);

  const visitedBlock = buildVisitedSection(pageViews, lastSeen);

  const lines = [
    '<b>Карточка пользователя (без ботов)</b>',
    `<i>Время: Караганда (${KARAGANDA_TZ}, UTC+5)</i>`,
    '',
    `<b>ID:</b> <code>${escapeTelegramHtml(visitorId)}</code>`,
    `<b>Источник:</b> ${escapeTelegramHtml(source)}`,
    `<b>Первый заход:</b> ${escapeTelegramHtml(formatKaragandaDateTime(firstSeen))}`,
    `<b>Последний заход:</b> ${escapeTelegramHtml(formatKaragandaDateTime(lastSeen))}`,
    `<b>Время на сайте:</b> ${escapeTelegramHtml(formatDurationRu(durationSec))}`,
    `<b>Статус регистрации:</b> ${registeredUserId ? 'Да' : 'Нет'}`,
    ...(registeredUserId
      ? [
          `<b>User ID:</b> <code>${escapeTelegramHtml(registeredUserId)}</code>`,
          `<b>Email:</b> ${escapeTelegramHtml(authUser?.email ?? '-')}`,
          `<b>Дата регистрации:</b> ${escapeTelegramHtml(formatKaragandaDateTime(profile?.created_at))}`,
          `<b>Имя:</b> ${escapeTelegramHtml(
            `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim() || '-'
          )}`
        ]
      : []),
    '',
    '<b>Переход / атрибуция</b>',
    `<b>Страница входа:</b> ${landingLink}`,
    `<b>Referrer:</b> ${referrerLineHtml(touch.referrer)}`,
    `<b>UTM:</b> source=${escapeTelegramHtml(touch.utm_source ?? '-')} medium=${escapeTelegramHtml(
      touch.utm_medium ?? '-'
    )} campaign=${escapeTelegramHtml(touch.utm_campaign ?? '-')}`,
    `<b>Click ID:</b> ${escapeTelegramHtml(touch.click_id ?? '-')}`,
    '',
    '<b>Качество сигнала</b>',
    `${escapeTelegramHtml(qualityFlags.join(' | '))}`,
    '',
    '<b>Страницы (кликабельные ссылки)</b>',
    visitedBlock,
    '',
    '<i>Длительность по строкам — оценка по времени до следующего перехода или до последнего пинга.</i>',
    '',
    `<b>Устройство:</b> ${summarizeUserAgent(touch.user_agent_snapshot)}`
  ];

  let text = lines.join('\n');
  if (text.length > 4000) {
    text = `${text.slice(0, 3980)}\n<i>…обрезано (лимит Telegram 4096)</i>`;
  }
  return text;
}
