import 'server-only';

import { normalizeScholarshipDynamicParam } from '@/app/scholarships/scholarshipLongTailPresets';
import { parseUsStateHubFromCanonicalPath } from '@/lib/seo/stateHubParse';
import {
  SEO_ROUTE_STATE_SLUG_TO_CODE,
  SEO_ROUTE_STATE_SLUG_TO_LABEL
} from '@/lib/scholarships/seoTags/routeSegmentMaps';

import { matchSchoolForInstitution } from './schoolEnrichment';
import {
  getStateAffordability,
  getTopStateAffordabilityHighlights,
  stateDisplayName,
  type StateAffordabilityHighlight
} from './stateAffordability';
import type { SchoolEnrichment, StateAffordability } from './types';

export type ScholarshipStateContext = {
  stateCode: string;
  stateName: string;
  stateRow: StateAffordability;
  highlights: StateAffordabilityHighlight[];
};

export type ScholarshipUniversityContext = {
  stateContext: ScholarshipStateContext | null;
  schoolRow: SchoolEnrichment | null;
};

function stateSlugHasAffordabilityData(stateSlug: string): boolean {
  const code = SEO_ROUTE_STATE_SLUG_TO_CODE[stateSlug.toLowerCase()];
  return Boolean(code && getStateAffordability(code));
}

/**
 * Resolve a US state slug for the scholarship affordability sidebar on listing routes.
 * Works for promoted state-hub chrome and lighter dynamic `/scholarships/{state}` templates.
 */
export function resolveAffordabilitySidebarStateSlug(input: {
  canonicalPath: string;
  segments?: string[];
  locationLabels?: string[] | null;
}): string | null {
  const hubCtx = parseUsStateHubFromCanonicalPath(input.canonicalPath);
  if (hubCtx && stateSlugHasAffordabilityData(hubCtx.stateSlug)) {
    return hubCtx.stateSlug;
  }

  const segmentCandidates = [
    ...(input.segments ?? []).map((segment) =>
      normalizeScholarshipDynamicParam(segment)
    ),
    ...input.canonicalPath
      .trim()
      .replace(/^\/+/, '')
      .split('/')
      .filter(Boolean)
      .map((segment) => normalizeScholarshipDynamicParam(segment))
  ];

  for (const slug of segmentCandidates) {
    if (stateSlugHasAffordabilityData(slug)) return slug;
  }

  const labels = input.locationLabels?.map((label) => label.trim()).filter(Boolean) ?? [];
  if (labels.length === 1) {
    const label = labels[0]!;
    const slugEntry = Object.entries(SEO_ROUTE_STATE_SLUG_TO_LABEL).find(
      ([, stateLabel]) => stateLabel === label
    );
    if (slugEntry && stateSlugHasAffordabilityData(slugEntry[0])) {
      return slugEntry[0];
    }
  }

  return null;
}

function resolveStateCodeFromSlugOrCode(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;

  if (raw.length === 2) {
    const code = raw.toUpperCase();
    return getStateAffordability(code) ? code : null;
  }

  const code = SEO_ROUTE_STATE_SLUG_TO_CODE[raw.toLowerCase()];
  return code && getStateAffordability(code) ? code : null;
}

export function resolveScholarshipStateContext(
  stateSlugOrCode: string
): ScholarshipStateContext | null {
  const stateCode = resolveStateCodeFromSlugOrCode(stateSlugOrCode);
  if (!stateCode) return null;

  const stateRow = getStateAffordability(stateCode);
  if (!stateRow) return null;

  const highlights = getTopStateAffordabilityHighlights(stateRow);
  if (!highlights.length) return null;

  return {
    stateCode,
    stateName: stateDisplayName(stateCode),
    stateRow,
    highlights
  };
}

export function resolveScholarshipUniversityContext(input: {
  stateSlugOrCode: string;
  universityDisplayName?: string | null;
}): ScholarshipUniversityContext {
  const stateContext = resolveScholarshipStateContext(input.stateSlugOrCode);
  const stateCode =
    stateContext?.stateCode ??
    resolveStateCodeFromSlugOrCode(input.stateSlugOrCode);

  const name = input.universityDisplayName?.trim();
  const schoolRow =
    name && stateCode ?
      matchSchoolForInstitution({ name, state: stateCode })
    : null;

  return { stateContext, schoolRow };
}

export function hasScholarshipUniversitySidebarContent(
  context: ScholarshipUniversityContext
): boolean {
  return Boolean(context.schoolRow || context.stateContext);
}
