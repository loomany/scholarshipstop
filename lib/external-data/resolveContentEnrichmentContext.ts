import 'server-only';

import { US_STATE_NAME_TO_CODE } from '@/lib/constants/usStates';
import { SEO_ROUTE_STATE_SLUG_TO_CODE } from '@/lib/scholarships/seoTags/routeSegmentMaps';

import { getCityAffordability } from './cityAffordability';
import { matchSchoolForInstitution } from './schoolEnrichment';
import {
  getStateAffordability,
  getTopStateAffordabilityHighlights
} from './stateAffordability';
import type { CityAffordability, SchoolEnrichment, StateAffordability } from './types';

export type ResolvedContentEnrichmentContext = {
  stateCode: string | null;
  stateRow: StateAffordability | null;
  cityRow: CityAffordability | null;
  schoolRow: SchoolEnrichment | null;
};

function normalizeSlugToken(value: string): string {
  return value.trim().toLowerCase();
}

/** Conservative state detection from slug/title only — returns code when unambiguous. */
export function resolveStateCodeFromContentHints(input: {
  slug?: string | null;
  title?: string | null;
}): string | null {
  const slug = input.slug?.trim().toLowerCase() ?? '';
  const title = input.title?.trim() ?? '';
  const slugMatches = new Set<string>();

  if (slug) {
    for (const part of slug.split(/[-_/]+/)) {
      const code = SEO_ROUTE_STATE_SLUG_TO_CODE[normalizeSlugToken(part)];
      if (code) slugMatches.add(code);
    }
  }

  if (slugMatches.size === 1) {
    return [...slugMatches][0] ?? null;
  }

  const titleMatches = new Set<string>();
  const titleLower = title.toLowerCase();
  for (const [name, code] of Object.entries(US_STATE_NAME_TO_CODE)) {
    if (titleLower.includes(name.toLowerCase())) {
      titleMatches.add(code);
    }
  }

  if (titleMatches.size === 1) {
    return [...titleMatches][0] ?? null;
  }

  return null;
}

export function resolveContentEnrichmentContext(input: {
  slug?: string | null;
  title?: string | null;
  schoolName?: string | null;
  stateCode?: string | null;
  city?: string | null;
}): ResolvedContentEnrichmentContext {
  const stateCode =
    input.stateCode?.trim().toUpperCase() ||
    resolveStateCodeFromContentHints({ slug: input.slug, title: input.title });

  const stateRow = stateCode ? getStateAffordability(stateCode) : null;
  const cityRow =
    stateCode && input.city?.trim() ?
      getCityAffordability(input.city, stateCode)
    : null;

  const schoolRow =
    input.schoolName?.trim() ?
      matchSchoolForInstitution({
        name: input.schoolName,
        state: stateCode
      })
    : null;

  return { stateCode: stateCode ?? null, stateRow, cityRow, schoolRow };
}

export function hasDisplayableContentContext(
  context: ResolvedContentEnrichmentContext
): boolean {
  if (context.schoolRow) return true;
  if (context.stateRow && getTopStateAffordabilityHighlights(context.stateRow).length > 0) {
    return true;
  }
  return false;
}
