/**
 * Parse state × topic × degree hub URLs (3 segments) for SEO hub copy + UI labels.
 */

import {
  LONG_TAIL_LINK_LABELS,
  type LongTailSlug
} from '@/app/scholarships/scholarshipLongTailPresets';
import { SEO_ROUTE_EDUCATION_SEGMENTS } from '@/lib/scholarships/seoTags/routeSegmentMaps';
import { PROGRAMMATIC_SPECIALTY_SLUGS } from '@/lib/seo/programmaticSeoHubCombos';
import { SEO_ROUTE_STATE_SLUG_TO_LABEL } from '@/lib/scholarships/seoTags/routeSegmentMaps';
import { parsePathSegmentsToTokens } from '@/lib/scholarships/seoScholarshipRouteTokens';

const SPECIALTY_SET = new Set<string>(PROGRAMMATIC_SPECIALTY_SLUGS);

const DEGREE_SEGMENT_LABELS: Record<string, string> = {
  undergraduate: 'Undergraduate',
  'high-school': 'High school',
  graduate: 'Graduate',
  mba: 'MBA',
  phd: 'PhD',
  'community-college': 'Community college',
  'trade-school': 'Trade school',
  'high-school-senior': 'High school senior'
};

function educationIdToUrlSegment(id: string): string | null {
  const inv = Object.entries(SEO_ROUTE_EDUCATION_SEGMENTS).find(
    ([, v]) => v === id
  );
  return inv?.[0] ?? null;
}

function labelForDegreeSegment(seg: string): string {
  return DEGREE_SEGMENT_LABELS[seg] ?? seg.split('-').join(' ');
}

/**
 * When canonical path is exactly 3 segments (state × degree/topic × topic/degree),
 * return structured labels for hub generation.
 */
export function parseProgrammaticTripleSeoHub(
  canonicalPath: string
): {
  stateSlug: string;
  stateLabel: string;
  topicSlug: LongTailSlug;
  topicLabel: string;
  degreeSegment: string;
  degreeLabel: string;
} | null {
  const parts = canonicalPath
    .trim()
    .replace(/^\/+/, '')
    .split('/')
    .filter(Boolean);
  if (parts.length !== 3) return null;

  const tokens = parsePathSegmentsToTokens(parts);
  if (!tokens || tokens.length !== 3) return null;

  let stateSlug: string | null = null;
  let stateLabel: string | null = null;
  let topicSlug: LongTailSlug | null = null;
  let degreeSegment: string | null = null;

  for (const t of tokens) {
    if (t.kind === 'location') {
      stateLabel = t.label;
    }
    if (t.kind === 'legacy_preset') {
      if (SPECIALTY_SET.has(t.slug)) {
        topicSlug = t.slug as LongTailSlug;
      } else {
        degreeSegment = t.slug;
      }
    }
    if (t.kind === 'education') {
      degreeSegment = educationIdToUrlSegment(t.id) ?? t.id.replace(/_/g, '-');
    }
  }

  if (!stateLabel || !topicSlug || !degreeSegment) return null;

  const invState = Object.entries(SEO_ROUTE_STATE_SLUG_TO_LABEL).find(
    ([, lab]) => lab === stateLabel
  );
  stateSlug = invState?.[0] ?? null;
  if (!stateSlug) return null;

  return {
    stateSlug,
    stateLabel,
    topicSlug,
    topicLabel: LONG_TAIL_LINK_LABELS[topicSlug],
    degreeSegment,
    degreeLabel: labelForDegreeSegment(degreeSegment)
  };
}
