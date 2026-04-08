import HomePageClient from './HomePageClient';
import HomeFinalCta from '@/components/home/HomeFinalCta';
import SiteFooter from '@/components/ui/Footer/SiteFooter';
import { homePrimaryCtaHref } from '@/lib/nav/homePrimaryCta';
import { createClient } from '@/utils/supabase/server';

/** Home-only bottom stack: final CTA + footer exist only on `/` (this route). */
export default async function HomePage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const primaryCtaHref = homePrimaryCtaHref(!!user);

  return (
    <>
      <HomePageClient primaryCtaHref={primaryCtaHref} />
      <HomeFinalCta primaryCtaHref={primaryCtaHref} />
      <SiteFooter />
    </>
  );
}
