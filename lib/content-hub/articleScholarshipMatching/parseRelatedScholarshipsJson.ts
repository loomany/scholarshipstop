import type { Json } from '@/types_db';

import { parseContentPostScholarshipLinks } from '@/lib/content-hub/contentPostScholarshipLinks';

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

/**
 * Cards at the bottom of `/resources/[slug]` use this list.
 *
 * **Connect Hub contract:** either write `related_scholarships` as a JSON array of
 * `{ slug, title, score?, reason?, award_amount_text?, deadline_text? }`, or write
 * `scholarship_links` with `{ title, slug, reason?, url? }` where catalog rows include
 * `slug` (absolute `https://…/scholarships/{slug}` in `url` is OK — parsed as internal).
 * Optional: run `npm run content:backfill-related-from-links` after bulk imports to copy
 * legacy links into `related_scholarships` for analytics and scholarship-page cross-links.
 */
export function resolveRelatedScholarshipsForContentPost(
  relatedScholarships: Json | null | undefined,
  scholarshipLinks: Json | null | undefined
): RelatedScholarshipStored[] {
  const fromRelated = parseRelatedScholarshipsJson(relatedScholarships);
  if (fromRelated.length > 0) return fromRelated;

  const links = parseContentPostScholarshipLinks(scholarshipLinks);
  const seen = new Set<string>();
  const out: RelatedScholarshipStored[] = [];
  for (const link of links) {
    if (link.kind !== 'internal') continue;
    const slug = link.slug.trim();
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    out.push({
      slug,
      title: link.title.trim(),
      score: 0,
      reason:
        link.reason.trim() ? link.reason.trim() : 'Related scholarship',
      award_amount_text: null,
      deadline_text: null
    });
  }
  return out;
}
