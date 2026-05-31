import 'server-only';

import { SEO_ROUTE_STATE_SLUG_TO_CODE } from '@/lib/scholarships/seoTags/routeSegmentMaps';

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
