import type { Json } from '@/types_db';

import type { RelatedScholarshipStored } from './types';

/** Parse `content_posts.related_scholarships` for the article page. */
export function parseRelatedScholarshipsJson(
  value: Json | null | undefined
): RelatedScholarshipStored[] {
  if (!value || !Array.isArray(value)) return [];
  const out: RelatedScholarshipStored[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const slug = typeof o.slug === 'string' ? o.slug.trim() : '';
    const title = typeof o.title === 'string' ? o.title.trim() : '';
    if (!slug || !title) continue;
    if (seen.has(slug)) continue;
    seen.add(slug);
    const score =
      typeof o.score === 'number' && !Number.isNaN(o.score) ? o.score : 0;
    const reason =
      typeof o.reason === 'string' && o.reason.trim()
        ? o.reason.trim()
        : 'Related scholarship';
    out.push({
      slug,
      title,
      score,
      reason,
      award_amount_text:
        typeof o.award_amount_text === 'string'
          ? o.award_amount_text.trim() || null
          : null,
      deadline_text:
        typeof o.deadline_text === 'string'
          ? o.deadline_text.trim() || null
          : null
    });
  }
  return out;
}
