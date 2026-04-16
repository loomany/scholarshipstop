import type { Metadata } from 'next';
import { Suspense } from 'react';

import HomePageClient from './HomePageClient';
import FeaturedResources from '@/components/home/FeaturedResources';
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

/** Align with `/resources` and `/essays` index revalidation for hub content. */
export const revalidate = 300;

function FeaturedResourcesSkeleton() {
  return (
    <section
      className="border-b border-gray-100 bg-gray-50 pt-8 pb-12 sm:pt-9 sm:pb-14"
      aria-hidden
    >
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        <div className="mx-auto h-9 max-w-sm animate-pulse rounded-lg bg-gray-200/90 sm:max-w-md" />
        <div className="mx-auto mt-4 h-5 max-w-lg animate-pulse rounded bg-gray-100" />
        <div className="mt-10 flex gap-6 overflow-hidden pb-8">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-[280px] w-[320px] shrink-0 animate-pulse rounded-2xl bg-gray-200/80 md:h-[260px] md:w-[380px]"
            />
          ))}
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-center sm:gap-4">
          <div className="h-12 animate-pulse rounded-xl bg-gray-200/70 sm:w-52" />
          <div className="h-12 animate-pulse rounded-xl bg-gray-200/70 sm:w-52" />
        </div>
      </div>
    </section>
  );
}

/** Home-only bottom stack: final CTA + footer exist only on `/` (this route). */
export default function HomePage() {
  return (
    <>
      <HomePageClient />
      <HomeFinalCta />
      <Suspense fallback={<FeaturedResourcesSkeleton />}>
        <FeaturedResources />
      </Suspense>
      <SiteFooter />
    </>
  );
}
