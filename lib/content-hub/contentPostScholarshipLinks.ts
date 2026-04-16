import type { Json } from '@/types_db';

export type ContentPostScholarshipLink =
  | {
      kind: 'internal';
      title: string;
      slug: string;
      reason: string;
    }
  | {
      kind: 'external';
      title: string;
      url: string;
      reason: string;
    };

const MAX_LINKS = 6;

function isExternalHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

/**
 * Connect Hub stores absolute `https://scholarshiptop.com/scholarships/{slug}` URLs together
 * with a catalog `slug`. Old logic treated any https URL as "external", so bottom cards
 * (which only render internal slugs) stayed empty.
 */
function slugFromScholarshipPageUrl(urlStr: string): string | null {
  try {
    const u = new URL(urlStr);
    const raw = u.pathname.replace(/\/$/, '') || '/';
    const m = raw.match(/^\/scholarships\/(.+)$/);
    if (!m?.[1]) return null;
    return decodeURIComponent(m[1]).trim() || null;
  } catch {
    return null;
  }
}

export function parseContentPostScholarshipLinks(
  value: Json | null | undefined
): ContentPostScholarshipLink[] {
  if (!value || !Array.isArray(value)) return [];
  const out: ContentPostScholarshipLink[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const title = typeof o.title === 'string' ? o.title.trim() : '';
    if (!title) continue;

    const url = typeof o.url === 'string' ? o.url.trim() : '';
    let slug = typeof o.slug === 'string' ? o.slug.trim() : '';
    const reason = typeof o.reason === 'string' ? o.reason.trim() : '';

    if (!slug && isExternalHttpUrl(url)) {
      slug = slugFromScholarshipPageUrl(url) ?? '';
    }

    if (slug) {
      out.push({ kind: 'internal', title, slug, reason });
    } else if (isExternalHttpUrl(url)) {
      out.push({ kind: 'external', title, url, reason });
    }

    if (out.length >= MAX_LINKS) break;
  }
  return out;
}
