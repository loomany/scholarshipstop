import type { Metadata } from 'next';

import { isSeoNoiseQuery } from '@/app/scholarships/scholarshipSeoNoiseQuery';
import { getCanonical } from '@/lib/seo/canonical';

type HubSeoCopy = { title: string; description: string };

/**
 * SEO title + description for clean `/scholarships/hub/{segment}` URLs.
 * Keys are normalized lowercase path segments (see `normalizeScholarshipDynamicParam`).
 */
export const SCHOLARSHIP_HUB_SEGMENT_SEO: Record<string, HubSeoCopy> = {
  matches: {
    title: 'Find Scholarships That Match Your Profile',
    description:
      'Browse scholarships matched to your profile, eligibility, education level, and goals.'
  },
  'easy-apply': {
    title: 'Easy Apply Scholarships',
    description:
      'Find scholarships with simpler applications, fewer requirements, and faster ways to apply.'
  },
  'international-friendly': {
    title: 'Scholarships for international students',
    description:
      'Explore scholarships that may be open to international students, non-U.S. citizens, or students studying in the United States.'
  },
  'hot-deadlines': {
    title: 'Scholarships With Upcoming Deadlines',
    description:
      'Find scholarships closing soon and prioritize applications before deadlines pass.'
  },
  'best-recommendation': {
    title: 'Best recommendations',
    description:
      'Complete your scholarship profile to get better recommendations and receive alerts when new matching grants are added.'
  },
  saved: {
    title: 'Saved Scholarships',
    description:
      'Review scholarships you saved and continue your applications on ScholarshipTop.'
  },
  ignored: {
    title: 'Scholarships Marked Not Relevant',
    description:
      'Scholarships you marked as not relevant are listed here on ScholarshipTop.'
  }
};

const FALLBACK_HUB: HubSeoCopy = {
  title: 'Find Scholarships',
  description:
    'Browse scholarships, filter by eligibility and deadlines, and apply on ScholarshipTop.'
};

/**
 * Any non-empty allowlisted hub listing query string (filters, pagination, tab, aud, …)
 * means the URL is not the clean canonical hub document for indexing.
 */
export function scholarshipHubListingQueryIsNonCanonical(
  searchParams?: Record<string, string | string[] | undefined>
): boolean {
  return isSeoNoiseQuery(searchParams);
}

export function buildScholarshipHubRouteMetadata(opts: {
  hubSegment: string;
  searchParams?: Record<string, string | string[] | undefined>;
}): Metadata {
  const key = opts.hubSegment.trim().toLowerCase();
  const copy = SCHOLARSHIP_HUB_SEGMENT_SEO[key] ?? FALLBACK_HUB;
  const path = `/scholarships/hub/${encodeURIComponent(opts.hubSegment)}`;
  const canonicalUrl = getCanonical(path);
  const nonClean = scholarshipHubListingQueryIsNonCanonical(opts.searchParams);

  return {
    title: copy.title,
    description: copy.description,
    alternates: { canonical: canonicalUrl },
    robots: nonClean
      ? { index: false, follow: true }
      : { index: true, follow: true },
    openGraph: {
      title: copy.title,
      description: copy.description,
      url: canonicalUrl,
      type: 'website'
    },
    twitter: {
      card: 'summary_large_image',
      title: copy.title,
      description: copy.description
    }
  };
}
