import HomePageClient from './HomePageClient';
import HomeFinalCta from '@/components/home/HomeFinalCta';
import SiteFooter from '@/components/ui/Footer/SiteFooter';

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
