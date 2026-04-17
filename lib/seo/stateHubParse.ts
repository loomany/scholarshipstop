import {
  LONG_TAIL_SLUG_SET,
  normalizeScholarshipDynamicParam
} from '@/app/scholarships/scholarshipLongTailPresets';
import { SEO_ROUTE_STATE_SLUG_TO_LABEL } from '@/lib/scholarships/seoTags/routeSegmentMaps';
import { listUsStateSeoSlugs } from '@/lib/scholarships/seoScholarshipRouteTokens';

const STATE_SLUG_SET = new Set(listUsStateSeoSlugs());

export type UsStateHubContext = {
  stateSlug: string;
  stateLabel: string;
  /** Second path segment when it is a long-tail topic (e.g. nursing), else null. */
  topicSlug: string | null;
};

function isStateSlug(raw: string): boolean {
  return STATE_SLUG_SET.has(normalizeScholarshipDynamicParam(raw));
}

/**
 * Detects `/scholarships/{state}` and `/scholarships/{state}/{long-tail-topic}` style hubs.
 */
export function parseUsStateHubFromCanonicalPath(
  canonicalPath: string
): UsStateHubContext | null {
  const parts = canonicalPath
    .trim()
    .replace(/^\/+/, '')
    .split('/')
    .filter(Boolean)
    .map((p) => normalizeScholarshipDynamicParam(p));

  if (parts.length === 1 && isStateSlug(parts[0]!)) {
    const stateSlug = parts[0]!;
    return {
      stateSlug,
      stateLabel: SEO_ROUTE_STATE_SLUG_TO_LABEL[stateSlug] ?? stateSlug,
      topicSlug: null
    };
  }

  if (parts.length === 2 && isStateSlug(parts[0]!)) {
    const stateSlug = parts[0]!;
    const second = parts[1]!;
    const topicSlug = LONG_TAIL_SLUG_SET.has(second) ? second : null;
    return {
      stateSlug,
      stateLabel: SEO_ROUTE_STATE_SLUG_TO_LABEL[stateSlug] ?? stateSlug,
      topicSlug
    };
  }

  return null;
}
