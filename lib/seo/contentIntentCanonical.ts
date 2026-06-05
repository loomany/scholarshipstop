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

const CHATGPT_SCHOLARSHIP_SEARCH_PRIMARY_PATH =
  '/resources/how-to-use-chatgpt-to-search-for-scholarships' as const;

const CHATGPT_SCHOLARSHIP_SEARCH_SUPPORTING_SLUGS = new Set([
  'can-chatgpt-help-find-scholarships',
  'chatgpt-prompts-for-scholarship-search',
  'chatgpt-scholarship-prompts',
  'chatgpt-prompts-scholarship-search'
]);

function normalizeSlug(slug: string): string {
  return slug
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, '');
}

function decodeSlugSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
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

  if (
    kind === 'resource' &&
    CHATGPT_SCHOLARSHIP_SEARCH_SUPPORTING_SLUGS.has(normalized)
  ) {
    return {
      canonicalPath: CHATGPT_SCHOLARSHIP_SEARCH_PRIMARY_PATH,
      reason: 'resource_supports_chatgpt_scholarship_search_pillar'
    };
  }

  return null;
}

const INTERNAL_CONTENT_HREF_RE =
  /(href\s*=\s*)(["'])(\/(?:resources|essays|compare)\/[^"'?#]+(?:[?#][^"']*)?)\2/gi;

function routeKindFromPathPrefix(
  prefix: string
): ContentIntentRouteKind | null {
  if (prefix === 'resources') return 'resource';
  if (prefix === 'essays') return 'essay';
  if (prefix === 'compare') return 'compare';
  return null;
}

/**
 * Rewrite links to supporting noindex content routes so article body links point
 * at the canonical intent winner instead of spreading internal equity.
 */
export function canonicalizeContentIntentLinksInHtml(html: string): string {
  if (!html.includes('href')) return html;

  return html.replace(
    INTERNAL_CONTENT_HREF_RE,
    (full: string, prefix: string, quote: string, rawHref: string) => {
      const cleanPath = rawHref.split(/[?#]/, 1)[0]?.replace(/\/+$/g, '') ?? '';
      const match = /^\/(resources|essays|compare)\/([^/]+)$/i.exec(cleanPath);
      if (!match?.[1] || !match[2]) return full;

      const kind = routeKindFromPathPrefix(match[1].toLowerCase());
      if (!kind) return full;

      const canonical = scholarshipIntentCanonicalForContentRoute(
        kind,
        decodeSlugSegment(match[2])
      );
      if (!canonical) return full;

      return `${prefix}${quote}${canonical.canonicalPath}${quote}`;
    }
  );
}
