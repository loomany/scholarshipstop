import type { Metadata } from 'next';

import HomePageClient from './HomePageClient';
import FeaturedResources from '@/components/home/FeaturedResources';
import HomeFinalCta from '@/components/home/HomeFinalCta';
import { HomePageJsonLd } from '@/components/seo/HomePageJsonLd';
import SiteFooter from '@/components/ui/Footer/SiteFooter';
import { fetchHomeResourcesCarouselItems } from '@/lib/home/homeResourcesCarousel';
import { SITE_BRAND } from '@/lib/seo/siteTitle';
import { getURL } from '@/utils/helpers';

const siteOrigin = getURL().replace(/\/+$/, '');
const homeCanonical = `${siteOrigin}/`;

/** Page segment for root `title.template` (`ScholarshipTop | %s`). */
const homeTitleSegment = 'Get Matched With Scholarships in 2 Minutes';

const homeDescription =
  `${SITE_BRAND} — answer a few quick questions and find scholarships you can apply for today.`;

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

/** Align with `/resources` and `/essays` index revalidation for hub content. */
export const revalidate = 300;

/** Home-only bottom stack: final CTA + footer exist only on `/` (this route). */
export default async function HomePage() {
  let featuredResourceItems: Awaited<
    ReturnType<typeof fetchHomeResourcesCarouselItems>
  > = [];
  try {
    featuredResourceItems = await fetchHomeResourcesCarouselItems();
  } catch (err) {
    console.error('[HomePage] fetchHomeResourcesCarouselItems failed', err);
  }

  return (
    <>
      <HomePageJsonLd />
      <HomePageClient />
      <FeaturedResources items={featuredResourceItems} />
      <HomeFinalCta />
      <SiteFooter />
    </>
  );
}
