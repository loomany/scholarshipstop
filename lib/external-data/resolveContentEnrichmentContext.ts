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
  'best-scholarship-tracker-templates-students',
  'career-goals',
  'checklist',
  'easy-scholarships-guide',
  'examples',
  'financial-need',
  'how-to-find-scholarships',
  'how-to-apply-for-scholarships',
  'how-to-apply-for-scholarships-checklist',
  'leadership',
  'mistakes',
  'no-essay-scholarships',
  'no-essay-scholarships-guide',
  'outline',
  'personal-statement',
  'scholarship-documents-checklist',
  'scholarship-eligibility-explained',
  'scholarships-for-high-school-seniors',
  'scholarships-in-usa-for-international-students',
  'stem',
  'stem-scholarships-guide',
  'types-of-scholarships-usa-explained',
  'why-do-you-deserve-this-scholarship'
]);

/** Strict slug token → institution candidate for College Scorecard matching. */
const INSTITUTION_SLUG_HINTS: ReadonlyArray<{
  re: RegExp;
  candidate: string;
  state: string;
}> = [
  { re: /(?:^|[-_])harvard(?:[-_]|$)/i, candidate: 'Harvard University', state: 'MA' },
  { re: /(?:^|[-_])stanford(?:[-_]|$)/i, candidate: 'Stanford University', state: 'CA' },
  { re: /(?:^|[-_])yale(?:[-_]|$)/i, candidate: 'Yale University', state: 'CT' },
  {
    re: /(?:^|[-_])mit(?:[-_]|$)/i,
    candidate: 'Massachusetts Institute of Technology',
    state: 'MA'
  },
  { re: /(?:^|[-_])princeton(?:[-_]|$)/i, candidate: 'Princeton University', state: 'NJ' },
  { re: /(?:^|[-_])duke(?:[-_]|$)/i, candidate: 'Duke University', state: 'NC' },
  {
    re: /(?:^|[-_])ucla(?:[-_]|$)/i,
    candidate: 'University of California-Los Angeles',
    state: 'CA'
  },
  { re: /(?:^|[-_])nyu(?:[-_]|$)/i, candidate: 'New York University', state: 'NY' },
  {
    re: /(?:^|[-_])columbia(?:[-_]|$)/i,
    candidate: 'Columbia University in the City of New York',
    state: 'NY'
  },
  {
    re: /(?:^|[-_])georgetown(?:[-_]|$)/i,
    candidate: 'Georgetown University',
    state: 'DC'
  }
];

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

const USA_NATIONAL_SLUG =
  /(?:^|[-_/])(?:usa|united-states)(?:[-_/]|$)|(?:^|[-_/]).*-international-students(?:[-_/]|$)/i;

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

function hasStateSlugSignal(slug: string): boolean {
  return collectStateCodesFromSlug(slug, true).size > 0;
}

function isUsaNationalTopicSlug(slug: string): boolean {
  const normalized = normalizeSlugToken(slug.replace(/_/g, '-'));
  if (!normalized) return false;
  if (hasStateSlugSignal(normalized)) return false;
  return USA_NATIONAL_SLUG.test(normalized);
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

  if (slug && isUsaNationalTopicSlug(slug)) {
    return null;
  }

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

function resolveInstitutionFromSlug(
  slug: string | null | undefined
): { name: string; state: string } | null {
  const normalized = normalizeSlugToken(slug?.replace(/_/g, '-') ?? '');
  if (!normalized || isGenericTopicSlug(normalized)) return null;

  for (const hint of INSTITUTION_SLUG_HINTS) {
    if (!hint.re.test(normalized)) continue;
    const matched = matchSchoolForInstitution({
      name: hint.candidate,
      state: hint.state
    });
    if (matched) {
      return { name: hint.candidate, state: hint.state };
    }
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
  const fromSlug = resolveInstitutionFromSlug(input.slug);
  if (fromSlug) return fromSlug.name;

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
  const slugInstitution = resolveInstitutionFromSlug(input.slug);

  const stateCode =
    resolveStateCodeFromExplicitInput(input.stateCode) ??
    slugInstitution?.state ??
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
        state: slugInstitution?.state ?? stateCode
      })
    : null;

  return { stateCode: stateCode ?? null, stateRow, cityRow, schoolRow };
}

export function hasDisplayableContentContext(
  context: ResolvedContentEnrichmentContext,
  hints?: Pick<ContentEnrichmentHints, 'slug'>
): boolean {
  const slug = hints?.slug?.trim().toLowerCase() ?? '';

  if (slug && isGenericTopicSlug(slug)) {
    return false;
  }

  if (slug && isUsaNationalTopicSlug(slug)) {
    return Boolean(context.schoolRow);
  }

  if (context.schoolRow) return true;

  if (context.stateRow && getTopStateAffordabilityHighlights(context.stateRow).length > 0) {
    return true;
  }

  return false;
}
