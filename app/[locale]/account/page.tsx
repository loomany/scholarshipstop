import AccountDashboardClient from '@/components/account/AccountDashboardClient';
import { syncOAuthNamesToProfilesIfEmpty } from '@/lib/onboarding/profilesOnboardingSync';
import { localizedPath } from '@/lib/i18n/paths';
import {
  isStage2PilotLocale,
  type Stage2PilotLocale
} from '@/lib/i18n/pilotRoutes';
import type { Metadata } from 'next';
import { unstable_noStore as noStore } from 'next/cache';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import type { Database } from '@/types_db';
import { getSubscription, getUserDetails, getUser } from '@/utils/supabase/queries';

type ProfilesRow = Database['public']['Tables']['profiles']['Row'];

export const metadata: Metadata = {
  title: 'Account',
  robots: { index: false, follow: true }
};

export const dynamic = 'force-dynamic';

type Props = { params: { locale: string } };

export default async function LocalizedAccountPage({ params }: Props) {
  if (!isStage2PilotLocale(params.locale)) notFound();
  const locale = params.locale as Stage2PilotLocale;

  noStore();
  const supabase = createClient();
  const user = await getUser(supabase);
  if (!user) {
    redirect(localizedPath(locale, '/signin'));
  }

  const [userDetails, subscription] = await Promise.all([
    getUserDetails(supabase, user.id),
    getSubscription(user.id)
  ]);

  let profile = userDetails as ProfilesRow | null;
  const meta = user.user_metadata;
  const metaObj =
    meta && typeof meta === 'object' && !Array.isArray(meta)
      ? (meta as Record<string, unknown>)
      : null;
  const namesEmpty =
    !profile?.first_name?.trim() && !profile?.last_name?.trim();
  if (metaObj && namesEmpty) {
    await syncOAuthNamesToProfilesIfEmpty(supabase, user.id, metaObj);
    const { data: refreshed } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    if (refreshed) profile = refreshed;
  }

  return (
    <AccountDashboardClient user={user} profile={profile} subscription={subscription} />
  );
}
