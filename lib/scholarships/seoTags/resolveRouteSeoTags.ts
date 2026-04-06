/**
 * Deterministic resolution: SEO route path → canonical `seo_tags` + location slugs.
 * State / nationwide stay as URL slugs here; existing `location_tags` / manifest filters wire up later.
 */

import { normalizeScholarshipDynamicParam } from '@/app/scholarships/scholarshipLongTailPresets';
import { listUsStateSeoSlugs } from '@/lib/scholarships/seoScholarshipRouteTokens';
import type { SeoCanonicalTag } from '@/lib/scholarships/seoTags/vocabulary';
import { slugSegmentToTag } from '@/lib/scholarships/seoTags/slugSegmentToTag';

export type ResolvedRouteSeoTags = {
  /** Ordered unique canonical tags for this route (for future `seo_tags @>` queries). */
  seoTags: SeoCanonicalTag[];
  /**
   * Normalized segments that are US state / DC / nationwide slugs (not `seo_tags`).
   * Align with `STATE_SLUG_TO_LABEL` in `seoScholarshipRouteTokens.ts`.
   */
  locationSlugs: string[];
  /** Segments that are neither a known tag nor a known location slug. */
  unmappedSegments: string[];
};

const LOCATION_SLUG_SET: ReadonlySet<string> = new Set([
  ...Array.from(listUsStateSeoSlugs()),
  'nationwide'
]);

/**
 * @param canonicalPath — manifest `canonicalPath` (no leading `/`), e.g. `for-women/computer-science/no-gpa-requirement`
 */
export function resolveRouteSeoTags(canonicalPath: string): ResolvedRouteSeoTags {
  const trimmed = canonicalPath.trim().replace(/^\/+/, '');
  const segments = trimmed.split('/').filter(Boolean);

  const seoTags: SeoCanonicalTag[] = [];
  const locationSlugs: string[] = [];
  const unmappedSegments: string[] = [];
  const seenTag = new Set<SeoCanonicalTag>();

  for (const raw of segments) {
    const normalized = normalizeScholarshipDynamicParam(raw);
    if (!normalized) continue;

    const tag = slugSegmentToTag(normalized);
    if (tag) {
      if (!seenTag.has(tag)) {
        seenTag.add(tag);
        seoTags.push(tag);
      }
      continue;
    }

    if (LOCATION_SLUG_SET.has(normalized)) {
      locationSlugs.push(normalized);
      continue;
    }

    unmappedSegments.push(normalized);
  }

  return { seoTags, locationSlugs, unmappedSegments };
}
