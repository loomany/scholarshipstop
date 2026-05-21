import type { Metadata } from 'next';

import { HomePageContent } from '@/components/home/HomePageContent';
import { buildStage2EnglishPilotAlternates } from '@/lib/i18n/englishAlternates';
import { getCanonical } from '@/lib/seo/canonical';
import { SITE_BRAND } from '@/lib/seo/siteTitle';

const homeCanonical = getCanonical('/');

/** Page segment for root `title.template` (`ScholarshipTop | %s`). */
const homeTitleSegment = 'Get Matched With Scholarships in 2 Minutes';

const homeDescription =
  `${SITE_BRAND} — answer a few quick questions and find scholarships you can apply for today.`;

const homeOgTitle = `${SITE_BRAND} | ${homeTitleSegment}`;

/** Canonical URL for `/` only (sub-routes define their own). */
export const metadata: Metadata = {
  title: homeTitleSegment,
  description: homeDescription,
  alternates: buildStage2EnglishPilotAlternates('/'),
  openGraph: {
    title: homeOgTitle,
    description: homeDescription,
    url: homeCanonical,
    type: 'website',
    siteName: SITE_BRAND,
    locale: 'en_US',
    images: [
      {
        url: '/logo-preview.png',
        width: 1200,
        height: 630,
        alt: `${SITE_BRAND} Logo`
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: homeOgTitle,
    description: homeDescription,
    images: ['/logo-preview.png']
  }
};

/** Align with `/resources` and `/essays` index revalidation for hub content. */
export const revalidate = 300;

export default function HomePage() {
  return <HomePageContent locale="en" />;
}
