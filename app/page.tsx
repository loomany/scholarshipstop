import HomePageClient from './HomePageClient';
import { homePrimaryCtaHref } from '@/lib/nav/homePrimaryCta';
import { createClient } from '@/utils/supabase/server';

export default async function HomePage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const primaryCtaHref = homePrimaryCtaHref(!!user);

  return <HomePageClient primaryCtaHref={primaryCtaHref} />;
}
