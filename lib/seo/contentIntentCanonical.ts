export type ContentIntentRouteKind = 'essay' | 'resource' | 'compare';

export type ContentIntentCanonical = {
  canonicalPath: string;
  reason: string;
};

const NO_ESSAY_DISCOVERY_SLUGS = new Set([
  'no-essay-scholarships',
  'no-essay-scholarships-guide',
  'scholarships-with-no-essay',
  'easy-scholarships-no-essay',
  'easy-no-essay-scholarships'
]);

const CLOSING_SOON_DISCOVERY_SLUGS = new Set([
  'scholarships-closing-soon',
  'scholarships-closing-soon-guide',
  'last-minute-scholarships',
  'scholarships-with-upcoming-deadlines'
]);

function normalizeSlug(slug: string): string {
  return slug
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, '');
}

/**
 * Keep discovery/search-intent winners on scholarship listing pages. Editorial
 * explainers with distinct comparison or how-to intent can remain indexable.
 */
export function scholarshipIntentCanonicalForContentRoute(
  kind: ContentIntentRouteKind,
  slug: string
): ContentIntentCanonical | null {
  const normalized = normalizeSlug(slug);
  if (!normalized) return null;

  if (NO_ESSAY_DISCOVERY_SLUGS.has(normalized)) {
    return {
      canonicalPath: '/scholarships/no-essay',
      reason: `${kind}_overlaps_no_essay_scholarship_discovery`
    };
  }

  if (CLOSING_SOON_DISCOVERY_SLUGS.has(normalized)) {
    return {
      canonicalPath: '/scholarships/closing-soon',
      reason: `${kind}_overlaps_closing_soon_scholarship_discovery`
    };
  }

  return null;
}
