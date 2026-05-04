import { SEO_ROUTE_STATE_SLUG_TO_CODE } from '@/lib/scholarships/seoTags/routeSegmentMaps';

/**
 * Returns USPS code when `segment` is a canonical scholarship SEO state slug
 * (e.g. `texas` → `TX`). Excludes `nationwide` (not a USPS code in this map).
 */
export function getProvidersHubStateCodeFromPathSegment(
  raw: string
): string | null {
  const seg = decodeURIComponent(raw).trim().toLowerCase();
  return SEO_ROUTE_STATE_SLUG_TO_CODE[seg] ?? null;
}
