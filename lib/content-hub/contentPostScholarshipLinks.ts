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
    const slug = typeof o.slug === 'string' ? o.slug.trim() : '';
    const reason = typeof o.reason === 'string' ? o.reason.trim() : '';

    if (isExternalHttpUrl(url)) {
      out.push({ kind: 'external', title, url, reason });
    } else {
      if (!slug) continue;
      out.push({ kind: 'internal', title, slug, reason });
    }

    if (out.length >= MAX_LINKS) break;
  }
  return out;
}
