export const RSS_MIME_TYPE = 'application/rss+xml';
export const RSS_CONTENT_TYPE = `${RSS_MIME_TYPE}; charset=utf-8`;
export const RSS_REVALIDATE_SECONDS = 3600;
export const SITE_ORIGIN = 'https://scholarshiptop.com';

export type RssItem = {
  title: string;
  link: string;
  description: string;
  pubDate: Date | string;
  guid?: string;
  category?: string;
};

export type RssChannel = {
  title: string;
  description: string;
  link: string;
  feedUrl: string;
  items: RssItem[];
};

const DISALLOWED_PATH_PREFIXES = [
  '/api/',
  '/auth',
  '/account',
  '/dashboard',
  '/checkout',
  '/payments',
  '/onboarding',
  '/admin',
  '/login',
  '/sign-in',
  '/signin',
  '/sign-up',
  '/signup',
  '/profile',
  '/settings',
  '/essay/',
  '/essays/u/'
];

const DISALLOWED_HOST_PARTS = ['localhost', '127.0.0.1', 'staging', 'preview'];

export function absoluteSiteUrl(path: string): string {
  const clean = path.trim();
  if (!clean) return SITE_ORIGIN;
  if (/^https?:\/\//i.test(clean)) return clean;
  return `${SITE_ORIGIN}${clean.startsWith('/') ? clean : `/${clean}`}`;
}

export function isAllowedRssUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return false;
    if (url.hostname !== 'scholarshiptop.com') return false;
    if (DISALLOWED_HOST_PARTS.some((part) => url.hostname.includes(part))) {
      return false;
    }
    const path = url.pathname.toLowerCase();
    return !DISALLOWED_PATH_PREFIXES.some((prefix) => path.startsWith(prefix));
  } catch {
    return false;
  }
}

export function normalizeRssDate(value: Date | string): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function cleanRssText(value: string, fallback: string): string {
  const cleaned = normalizeText(value);
  return cleaned || fallback;
}

export function sortRssItemsByDate(items: RssItem[]): RssItem[] {
  return [...items].sort((a, b) => {
    const ad = normalizeRssDate(a.pubDate)?.getTime() ?? 0;
    const bd = normalizeRssDate(b.pubDate)?.getTime() ?? 0;
    return bd - ad || a.link.localeCompare(b.link);
  });
}

export function dedupeRssItems(items: RssItem[]): RssItem[] {
  const byGuid = new Map<string, RssItem>();
  for (const item of items) {
    const guid = item.guid?.trim() || item.link;
    const previous = byGuid.get(guid);
    if (!previous) {
      byGuid.set(guid, item);
      continue;
    }
    const prevDate = normalizeRssDate(previous.pubDate)?.getTime() ?? 0;
    const nextDate = normalizeRssDate(item.pubDate)?.getTime() ?? 0;
    if (nextDate > prevDate) byGuid.set(guid, item);
  }
  return Array.from(byGuid.values());
}

export function filterValidRssItems(items: RssItem[]): RssItem[] {
  return dedupeRssItems(
    items.filter((item) => {
      const title = item.title.trim();
      const description = item.description.trim();
      const guid = item.guid?.trim() || item.link.trim();
      return (
        Boolean(title) &&
        Boolean(description) &&
        Boolean(guid) &&
        isAllowedRssUrl(item.link) &&
        normalizeRssDate(item.pubDate) != null
      );
    })
  );
}

export function renderRssFeed(channel: RssChannel): string {
  const items = filterValidRssItems(channel.items);
  const latest =
    sortRssItemsByDate(items)[0] ??
    ({
      pubDate: new Date('2026-05-28T00:00:00.000Z')
    } as RssItem);
  const lastBuildDate = normalizeRssDate(latest.pubDate) ?? new Date();

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '<channel>',
    `<title>${escapeXml(cleanRssText(channel.title, 'ScholarshipTop'))}</title>`,
    `<link>${escapeXml(channel.link)}</link>`,
    `<description>${escapeXml(
      cleanRssText(channel.description, 'ScholarshipTop scholarship resources')
    )}</description>`,
    '<language>en-US</language>',
    `<lastBuildDate>${lastBuildDate.toUTCString()}</lastBuildDate>`,
    `<atom:link href="${escapeXml(
      channel.feedUrl
    )}" rel="self" type="${RSS_MIME_TYPE}" />`,
    ...sortRssItemsByDate(items).map((item) => {
      const date = normalizeRssDate(item.pubDate);
      const guid = item.guid?.trim() || item.link;
      return [
        '<item>',
        `<title>${escapeXml(cleanRssText(item.title, 'ScholarshipTop'))}</title>`,
        `<link>${escapeXml(item.link)}</link>`,
        `<guid isPermaLink="true">${escapeXml(guid)}</guid>`,
        `<pubDate>${(date ?? new Date()).toUTCString()}</pubDate>`,
        `<description>${escapeXml(
          cleanRssText(item.description, item.title)
        )}</description>`,
        item.category
          ? `<category>${escapeXml(cleanRssText(item.category, 'ScholarshipTop'))}</category>`
          : '',
        '</item>'
      ].filter(Boolean).join('');
    }),
    '</channel>',
    '</rss>'
  ].join('');
}
