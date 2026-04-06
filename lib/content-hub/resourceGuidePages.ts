import {
  resourceGuideHref,
  type ResourceGuideSlug
} from '@/lib/scholarships/resourceGuideRoutes';

export type ResourceGuideCard = {
  slug: ResourceGuideSlug;
  title: string;
  description: string;
  /** One line after em dash in “Continue Reading” on DB articles + shared promos. */
  continueBlurb: string;
};

/** Canonical copy for Related Guides cards (all three guides). */
export const RESOURCE_GUIDE_CARDS: ResourceGuideCard[] = [
  {
    slug: 'how-to-apply-for-scholarships',
    title: 'How to Apply for Scholarships',
    description:
      'Practical steps to find opportunities, prep documents, and submit strong applications without drowning in busywork.',
    continueBlurb:
      'practical steps to organize your application process and avoid rookie mistakes'
  },
  {
    slug: 'scholarship-deadlines-explained',
    title: 'Scholarship Deadlines Explained',
    description:
      'How rolling vs fixed deadlines work, when to start, and simple ways to avoid missing dates.',
    continueBlurb:
      'simple ways to track deadlines and avoid missing key dates'
  },
  {
    slug: 'combine-multiple-scholarships',
    title: 'Can You Combine Multiple Scholarships?',
    description:
      'What “stacking” means, where schools draw the line, and how to stay within the rules.',
    continueBlurb:
      'understand how stacking scholarships works and which rules to watch'
  }
];

/** Stable guide links for end-of-article promo (excludes current slug when it matches a guide). */
export function resourceGuideContinueReadingForSlug(
  currentSlug: string
): { href: string; title: string; blurb: string }[] {
  const key = currentSlug.trim();
  return RESOURCE_GUIDE_CARDS.filter((c) => c.slug !== key).map((c) => ({
    href: resourceGuideHref(c.slug),
    title: c.title,
    blurb: c.continueBlurb
  }));
}

export function resourceGuideCardHref(slug: ResourceGuideSlug): string {
  return resourceGuideHref(slug);
}

/** Shared inline / end-block link styling helper (matches editorial prose links). */
export const resourceGuideLinkClassName =
  'font-medium text-blue-700 underline decoration-2 decoration-blue-600/55 underline-offset-[3px] transition-colors hover:text-blue-900 hover:decoration-blue-800/90 focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500';
