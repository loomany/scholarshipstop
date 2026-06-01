import 'server-only';

import type { ContentEnrichmentHints } from './resolveContentEnrichmentContext';
import type { ContextLinkItem } from './contentEnrichmentLinks';
import { getPremedTopicContext } from './premedTopicContext';

/** Comparison/list articles that mention medical in title but are not healthcare planning pages. */
export const HEALTHCARE_TOPIC_SUPPRESS_SLUGS = new Set([
  'best-scholarship-websites',
  'best-scholarship-websites-by-category',
  'best-scholarship-sites-for-women-stem-medical-law',
  'how-to-find-scholarships',
  'how-to-apply-for-scholarships',
  'scholarship-deadlines-explained',
  'combine-multiple-scholarships',
  'scholarships-for-international-students-guide'
]);

const HEALTHCARE_TOPIC_PATTERN =
  /\b(pre[-\s]?med|premed|medical|medicine|nursing|healthcare|health care|health workforce|public health|physician|clinical)\b/i;

export function shouldSuppressHealthcareTopicContext(
  slug: string | null | undefined
): boolean {
  const normalized = slug?.trim().toLowerCase();
  if (!normalized) return false;
  return HEALTHCARE_TOPIC_SUPPRESS_SLUGS.has(normalized);
}

export function shouldShowHealthcareTopicContext(
  hints: ContentEnrichmentHints
): boolean {
  const slug = hints.slug?.trim().toLowerCase();
  if (slug === 'career-goals') return true;
  if (shouldSuppressHealthcareTopicContext(slug)) return false;

  const haystack = [
    hints.slug,
    hints.title,
    hints.category,
    hints.subcategory,
    ...(hints.tags ?? [])
  ]
    .filter(Boolean)
    .join(' ');

  return HEALTHCARE_TOPIC_PATTERN.test(haystack);
}

/** Career-goals essay uses a broader healthcare planning topic, not first-match page_target index. */
export function resolveHealthcareEssayTopicContext(hints: ContentEnrichmentHints) {
  if (!shouldShowHealthcareTopicContext(hints)) return null;

  const normalized = hints.slug?.trim().toLowerCase();
  if (normalized === 'career-goals') {
    return (
      getPremedTopicContext('stem-to-medical-career-path') ??
      getPremedTopicContext('healthcare scholarships') ??
      getPremedTopicContext('career-goals')
    );
  }

  return (
    getPremedTopicContext(hints.slug) ??
    getPremedTopicContext(hints.title) ??
    getPremedTopicContext(hints.category)
  );
}

export function resolveHealthcareResourceTopicContext(
  hints: ContentEnrichmentHints
) {
  if (!shouldShowHealthcareTopicContext(hints)) return null;
  return (
    getPremedTopicContext(hints.slug) ??
    getPremedTopicContext(hints.title) ??
    getPremedTopicContext(hints.category)
  );
}

export const MEDICAL_GUIDE_LINK: ContextLinkItem = {
  href: '/resources/medical-scholarships-guide',
  label: 'Medical scholarships guide'
};

export const CAREER_GOALS_LINK: ContextLinkItem = {
  href: '/essays/career-goals',
  label: 'Career goals essay guide'
};

export const FINANCIAL_NEED_LINK: ContextLinkItem = {
  href: '/essays/financial-need',
  label: 'Financial need essay guide'
};

export const HOW_TO_FIND_LINK: ContextLinkItem = {
  href: '/resources/how-to-find-scholarships',
  label: 'How to find scholarships'
};

export const COMPARE_UNIVERSITIES_LINK: ContextLinkItem = {
  href: '/compare/universities',
  label: 'Compare universities'
};

export const MEDICAL_CATEGORY_LINK: ContextLinkItem = {
  href: '/scholarships/category/medical',
  label: 'Medicine scholarships'
};

export function buildMedicalClusterLinks(input: {
  surface: 'medical-guide' | 'career-goals' | 'provider-medical';
  stateSlug?: string | null;
  stateName?: string | null;
}): ContextLinkItem[] {
  const links: ContextLinkItem[] = [];

  switch (input.surface) {
    case 'medical-guide':
      links.push(
        CAREER_GOALS_LINK,
        FINANCIAL_NEED_LINK,
        HOW_TO_FIND_LINK,
        COMPARE_UNIVERSITIES_LINK,
        MEDICAL_CATEGORY_LINK
      );
      break;
    case 'career-goals':
      links.push(
        MEDICAL_GUIDE_LINK,
        FINANCIAL_NEED_LINK,
        HOW_TO_FIND_LINK,
        COMPARE_UNIVERSITIES_LINK
      );
      break;
    case 'provider-medical':
      if (input.stateSlug?.trim()) {
        links.push({
          href: `/scholarships/${encodeURIComponent(input.stateSlug.trim().toLowerCase())}`,
          label: input.stateName?.trim()
            ? `Scholarships in ${input.stateName.trim()}`
            : `Scholarships in ${input.stateSlug.trim()}`
        });
      }
      links.push(MEDICAL_GUIDE_LINK, COMPARE_UNIVERSITIES_LINK, CAREER_GOALS_LINK);
      break;
  }

  return links;
}
