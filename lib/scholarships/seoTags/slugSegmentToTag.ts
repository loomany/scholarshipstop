/**
 * One URL path segment (e.g. from manifest `canonicalPath`) → canonical seo tag, or null.
 * Location / state segments return null; they are handled in `resolveRouteSeoTags`.
 */

import { normalizeScholarshipDynamicParam } from '@/app/scholarships/scholarshipLongTailPresets';
import { SEO_ROUTE_SEGMENT_TO_CANONICAL_TAG } from '@/lib/scholarships/seoTags/routeSegmentMaps';
import type { SeoCanonicalTag } from '@/lib/scholarships/seoTags/vocabulary';

export function slugSegmentToTag(rawSegment: string): SeoCanonicalTag | null {
  const s = normalizeScholarshipDynamicParam(rawSegment);
  if (!s) return null;
  const tag = SEO_ROUTE_SEGMENT_TO_CANONICAL_TAG[s];
  return tag ?? null;
}
