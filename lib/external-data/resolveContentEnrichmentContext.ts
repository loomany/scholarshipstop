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

export type ContentEnrichmentHints = {
  slug?: string | null;
  title?: string | null;
  subtitle?: string | null;
  metaTitle?: string | null;
  category?: string | null;
  subcategory?: string | null;
  stateCode?: string | null;
  schoolName?: string | null;
  city?: string | null;
  tags?: string[] | null;
};

export type ResolvedContentEnrichmentContext = {
  stateCode: string | null;
  stateRow: StateAffordability | null;
  cityRow: CityAffordability | null;
  schoolRow: SchoolEnrichment | null;
};

/** Generic essay/resource slugs with no geographic signal — skip slug-based state inference. */
const GENERIC_TOPIC_SLUGS = new Set([
  'best-scholarship-websites',
  'career-goals',
  'checklist',
  'examples',
  'financial-need',
  'how-to-find-scholarships',
  'how-to-apply-for-scholarships',
  'leadership',
  'mistakes',
  'no-essay-scholarships',
  'outline',
  'personal-statement',
  'stem',
  'why-do-you-deserve-this-scholarship'
]);

const STATE_NAMES_BY_LENGTH = Object.entries(US_STATE_NAME_TO_CODE).sort(
  (a, b) => b[0].length - a[0].length
);

const STATE_SLUG_BOUNDARY_PATTERNS = Object.entries(SEO_ROUTE_STATE_SLUG_TO_CODE)
  .sort((a, b) => b[0].length - a[0].length)
  .map(([stateSlug, code]) => ({
    code,
    re: new RegExp(`(?:^|[-_/])${stateSlug.replace(/-/g, '\\-')}(?:[-_/]|$)`)
  }));

const INSTITUTION_IN_TITLE =
  /\b(?:at|for|from)\s+((?:the\s+)?[A-Za-z0-9][A-Za-z0-9\s.'&-]{2,90}?(?:University|College|Institute|Polytechnic|Academy)(?:\s+of\s+[A-Za-z0-9\s.'-]+)?)/i;

function normalizeSlugToken(value: string): string {
  return value.trim().toLowerCase();
}

function joinHintText(parts: Array<string | null | undefined>): string {
  return parts
    .map((p) => p?.trim())
    .filter(Boolean)
    .join(' ');
}

export function isGenericTopicSlug(slug: string | null | undefined): boolean {
  const s = slug?.trim().toLowerCase();
  if (!s) return false;
  return GENERIC_TOPIC_SLUGS.has(s);
}

function collectStateCodesFromSlug(slug: string, allowSlugInference: boolean): Set<string> {
  const normalized = normalizeSlugToken(slug.replace(/_/g, '-'));
  const matches = new Set<string>();
  if (!normalized || !allowSlugInference) return matches;

  for (const { code, re } of STATE_SLUG_BOUNDARY_PATTERNS) {
    if (re.test(normalized)) matches.add(code);
  }
  return matches;
}

function collectStateCodesFromText(text: string): Set<string> {
  const matches = new Set<string>();
  const lower = text.toLowerCase();
  if (!lower.trim()) return matches;

  for (const [name, code] of STATE_NAMES_BY_LENGTH) {
    if (lower.includes(name.toLowerCase())) {
      matches.add(code);
    }
  }

  return matches;
}

function resolveStateCodeFromExplicitInput(stateCode: string | null | undefined): string | null {
  const code = stateCode?.trim().toUpperCase();
  if (!code || code.length !== 2) return null;
  return getStateAffordability(code) ? code : null;
}

/** Conservative state detection — returns code only when unambiguous. */
export function resolveStateCodeFromContentHints(
  input: Pick<
    ContentEnrichmentHints,
    'slug' | 'title' | 'subtitle' | 'metaTitle' | 'category' | 'subcategory' | 'tags'
  >
): string | null {
  const slug = input.slug?.trim().toLowerCase() ?? '';
  const allowSlugInference = slug.length > 0 && !isGenericTopicSlug(slug);

  const slugMatches = collectStateCodesFromSlug(slug, allowSlugInference);
  if (slugMatches.size === 1) {
    return [...slugMatches][0] ?? null;
  }
  if (slugMatches.size > 1) return null;

  const textBundle = joinHintText([
    input.title,
    input.subtitle,
    input.metaTitle,
    input.category,
    input.subcategory,
    ...(input.tags ?? [])
  ]);

  const textMatches = collectStateCodesFromText(textBundle);
  if (textMatches.size === 1) {
    return [...textMatches][0] ?? null;
  }

  return null;
}

function extractSchoolCandidateFromText(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const matched = trimmed.match(INSTITUTION_IN_TITLE);
  if (matched?.[1]?.trim()) return matched[1].trim();

  const institutionLike =
    /\b(university|college|institute|polytechnic)\b/i.test(trimmed) &&
    trimmed.length <= 120;
  if (institutionLike && !/\b(scholarship|essay|guide|how to)\b/i.test(trimmed)) {
    return trimmed;
  }

  return null;
}

function resolveSchoolNameFromHints(
  input: ContentEnrichmentHints,
  stateCode: string | null
): string | null {
  const explicit = input.schoolName?.trim();
  if (explicit) return explicit;

  const textBundle = joinHintText([
    input.title,
    input.metaTitle,
    input.subtitle,
    ...(input.tags ?? [])
  ]);
  const candidate = extractSchoolCandidateFromText(textBundle);
  if (!candidate) return null;

  const matched = matchSchoolForInstitution({ name: candidate, state: stateCode });
  return matched ? candidate : null;
}

export function resolveContentEnrichmentContext(
  input: ContentEnrichmentHints
): ResolvedContentEnrichmentContext {
  const stateCode =
    resolveStateCodeFromExplicitInput(input.stateCode) ??
    resolveStateCodeFromContentHints(input);

  const stateRow = stateCode ? getStateAffordability(stateCode) : null;
  const cityRow =
    stateCode && input.city?.trim() ?
      getCityAffordability(input.city, stateCode)
    : null;

  const schoolCandidate = resolveSchoolNameFromHints(input, stateCode);
  const schoolRow =
    schoolCandidate ?
      matchSchoolForInstitution({
        name: schoolCandidate,
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
