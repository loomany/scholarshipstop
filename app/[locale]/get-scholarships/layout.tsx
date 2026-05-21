import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { SCHOLARSHIPS_HUB_BEST_MATCHES_HREF } from '@/app/scholarships/scholarshipListUrl';
import { isStage2PilotLocale } from '@/lib/i18n/pilotRoutes';
import { localizedPilotHref } from '@/lib/i18n/localizedHref';
import { createClient } from '@/utils/supabase/server';

export const metadata: Metadata = {
  title: 'Encuentra becas / Trouver des bourses',
  robots: {
    index: false,
    follow: true
  }
};

export default async function LocalizedGetScholarshipsLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!isStage2PilotLocale(params.locale)) notFound();
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user) {
    const localizedHub =
      localizedPilotHref(params.locale, '/scholarships') ??
      SCHOLARSHIPS_HUB_BEST_MATCHES_HREF;
    redirect(localizedHub);
  }

  return children;
}
