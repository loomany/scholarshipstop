import {
  breadcrumbCategoryLabel,
  normalizeCategoryId,
  SCHOLARSHIP_CATEGORY_PAGE_HEADING,
  type ScholarshipCategoryId
} from '@/app/scholarships/scholarshipCategories';

/** Listing meta titles use this graduation/admissions year per SEO brief. */
export const CATEGORY_LISTING_META_YEAR = 2026;

function headingLabelForCategory(
  categoryId: ScholarshipCategoryId | null,
  slugFallback: string
): string {
  if (categoryId) return SCHOLARSHIP_CATEGORY_PAGE_HEADING[categoryId];
  return breadcrumbCategoryLabel(slugFallback);
}

/** Lowercase running text for descriptions, except acronyms like STEM. */
export function categoryListingBrowseWord(
  categoryId: ScholarshipCategoryId | null,
  slugFallback: string
): string {
  if (categoryId) {
    const h = SCHOLARSHIP_CATEGORY_PAGE_HEADING[categoryId];
    if (h === 'STEM') return 'STEM';
    return h.toLowerCase();
  }
  return breadcrumbCategoryLabel(slugFallback).toLowerCase();
}

/** SSR intro below H1 — medical uses dedicated copy; other slugs use the generic template. */
export function categoryListingIntroParagraph(
  canonicalSlug: string,
  categoryId: ScholarshipCategoryId | null
): string {
  if (categoryId === 'medical') {
    return 'Find medicine scholarships for students pursuing healthcare, nursing, pre-med, public health, and related fields. Compare deadlines, award amounts, GPA requirements, eligibility rules, and application steps before applying.';
  }
  const label = headingLabelForCategory(categoryId, canonicalSlug);
  return `Find ${label} scholarships for students looking for funding in this field. Compare deadlines, award amounts, GPA requirements, eligibility rules, and application steps before applying.`;
}

export function categoryListingMetaTitle(
  categoryId: ScholarshipCategoryId | null,
  slugFallback: string
): string {
  const label = headingLabelForCategory(categoryId, slugFallback);
  return `${label} Scholarships ${CATEGORY_LISTING_META_YEAR} – Apply Online`;
}

/** Snippet body (~140–160 chars for typical labels). */
export function categoryListingMetaDescription(
  categoryId: ScholarshipCategoryId | null,
  slugFallback: string
): string {
  const word = categoryListingBrowseWord(categoryId, slugFallback);
  return `Browse ${word} scholarships with deadlines, award amounts, GPA requirements, and eligibility details. Find scholarships you can apply for today.`;
}

/** H2 above the grant cards (listing column). */
export function categoryListingAvailableHeading(
  categoryId: ScholarshipCategoryId | null,
  slugFallback: string
): string {
  const label = headingLabelForCategory(categoryId, slugFallback);
  return `Available ${label} scholarships`;
}

/** Supporting line under H2 before filters-driven card stack. */
export function categoryListingAvailableIntro(
  categoryId: ScholarshipCategoryId | null,
  slugFallback: string
): string {
  const word = categoryListingBrowseWord(categoryId, slugFallback);
  return `Browse available ${word} scholarships below or use filters to refine your results by deadline, award amount, GPA, eligibility, and requirements.`;
}

/** Visible FAQ section heading (H2). */
export function categoryListingFaqSectionTitle(
  categoryId: ScholarshipCategoryId | null,
  slugFallback: string
): string {
  const w = categoryListingBrowseWord(categoryId, slugFallback);
  return `Frequently asked questions about ${w} scholarships`;
}

export function categoryListingFaqItems(categoryWordInQuestions: string): {
  question: string;
  answer: string;
}[] {
  return [
    {
      question: `How do I find ${categoryWordInQuestions} scholarships?`,
      answer: `Use this page to compare ${categoryWordInQuestions} scholarships by deadline, award amount, eligibility, requirements, and application details.`
    },
    {
      question: `Who can apply for ${categoryWordInQuestions} scholarships?`,
      answer:
        'Eligibility depends on each provider. Some scholarships may consider field of study, school level, GPA, location, citizenship, or financial need.'
    },
    {
      question: `Should I apply to more than one ${categoryWordInQuestions} scholarship?`,
      answer:
        'Yes. Applying to several relevant scholarships can improve your chances, especially when deadlines and requirements are manageable.'
    }
  ];
}
