import type { ScholarshipListResult } from '@/lib/scholarships/scholarshipListServer';

/**
 * When the exact (page-intent) filter matches zero rows but relaxed SEO fallback
 * still returns a very large catalog slice, the URL is a poor representation of the
 * SERP snippet — noindex + follow, with canonical widen (see layout metadata).
 */
export const SEO_BROAD_FALLBACK_NOINDEX_MIN = 1000;

export function seoBroadFallbackNoindexFromListResult(
  r: Pick<ScholarshipListResult, 'total' | 'seoFallback'>
): boolean {
  if (r.seoFallback?.exactTotal !== 0) return false;
  return r.total > SEO_BROAD_FALLBACK_NOINDEX_MIN;
}
