import type { Metadata } from 'next';

import HomePageClient from './HomePageClient';
import HomeFinalCta from '@/components/home/HomeFinalCta';
import SiteFooter from '@/components/ui/Footer/SiteFooter';
import { SITE_BRAND } from '@/lib/seo/siteTitle';
import { getURL } from '@/utils/helpers';

const siteOrigin = getURL().replace(/\/+$/, '');
const homeCanonical = `${siteOrigin}/`;

/** Page segment for root `title.template` (`ScholarshipTop | %s`). */
const homeTitleSegment = 'Fully Funded Scholarships for International Students';

const homeDescription =
  `${SITE_BRAND} helps international students discover fully funded scholarships, compare deadlines and eligibility, and stay organized from search to application — in one focused hub.`;

const homeOgTitle = `${SITE_BRAND} | ${homeTitleSegment}`;

/** Canonical URL for `/` only (sub-routes define their own). */
export const metadata: Metadata = {
  title: homeTitleSegment,
  description: homeDescription,
  alternates: {
    canonical: homeCanonical
  },
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

/** Home-only bottom stack: final CTA + footer exist only on `/` (this route). */
export default function HomePage() {
  return (
    <>
      <HomePageClient />
      <HomeFinalCta />
      <SiteFooter />
    </>
  );
}
