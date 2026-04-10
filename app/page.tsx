import type { Metadata } from 'next';

import HomePageClient from './HomePageClient';
import HomeFinalCta from '@/components/home/HomeFinalCta';
import SiteFooter from '@/components/ui/Footer/SiteFooter';
import { getURL } from '@/utils/helpers';

const siteOrigin = getURL().replace(/\/+$/, '');

/** Canonical URL for `/` only (sub-routes define their own). */
export const metadata: Metadata = {
  alternates: {
    canonical: `${siteOrigin}/`
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
