import type { Metadata } from 'next';
import type { SupabaseClient } from '@supabase/supabase-js';

import HomePageClient from './HomePageClient';
import FeaturedResources from '@/components/home/FeaturedResources';
import HomeFinalCta from '@/components/home/HomeFinalCta';
import { HomePageJsonLd } from '@/components/seo/HomePageJsonLd';
import { fetchHomeResourcesCarouselItems } from '@/lib/home/homeResourcesCarousel';
import {
  fetchApplicantCountryCounts,
  fetchHomeScholarshipCatalogStats,
  type HomeScholarshipCatalogStats
} from '@/lib/scholarships/scholarshipListServer';
import { createClient } from '@/utils/supabase/server';
import { SITE_BRAND } from '@/lib/seo/siteTitle';
import { getCanonical } from '@/lib/seo/canonical';
import type { Database } from '@/types_db';

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

/** Home-only bottom stack: final CTA on `/` (footer is global in root layout). */
export default async function HomePage() {
  let featuredResourceItems: Awaited<
    ReturnType<typeof fetchHomeResourcesCarouselItems>
  > = [];
  try {
    featuredResourceItems = await fetchHomeResourcesCarouselItems();
  } catch (err) {
    console.error('[HomePage] fetchHomeResourcesCarouselItems failed', err);
  }

  let topApplicantCountries: { code: string; label: string; count: number }[] = [];
  let scholarshipCatalogStats: HomeScholarshipCatalogStats | null = null;
  try {
    const supabase = createClient() as unknown as SupabaseClient<Database>;
    const [{ countryCounts }, catalogStats] = await Promise.all([
      fetchApplicantCountryCounts(supabase),
      fetchHomeScholarshipCatalogStats(supabase)
    ]);
    topApplicantCountries = countryCounts.slice(0, 24);
    scholarshipCatalogStats = catalogStats;
  } catch (err) {
    console.error('[HomePage] fetch home scholarship catalog stats failed', err);
  }

  return (
    <>
      <HomePageJsonLd />
      <HomePageClient
        topApplicantCountries={topApplicantCountries}
        scholarshipCatalogStats={scholarshipCatalogStats}
      />
      <FeaturedResources items={featuredResourceItems} />
      <HomeFinalCta />
    </>
  );
}
