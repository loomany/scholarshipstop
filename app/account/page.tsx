import AccountDashboardClient from '@/components/account/AccountDashboardClient';
import { syncOAuthNamesToProfilesIfEmpty } from '@/lib/onboarding/profilesOnboardingSync';
import type { Metadata } from 'next';
import { unstable_noStore as noStore } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import type { Database } from '@/types_db';
import { getSubscription, getUserDetails, getUser } from '@/utils/supabase/queries';

type ProfilesRow = Database['public']['Tables']['profiles']['Row'];

export const metadata: Metadata = {
  title: 'Account',
  robots: {
    index: false,
    follow: true
  }
};

/** Subscription props must always reflect the DB after billing changes (see `/subscription`). */
export const dynamic = 'force-dynamic';

export default async function Account() {
  noStore();
  const supabase = createClient();
  const user = await getUser(supabase);
  if (!user) {
    return redirect('/signin');
  }

  const [userDetails, subscription] = await Promise.all([
    getUserDetails(supabase, user.id),
    getSubscription(user.id)
  ]);

  /** Google OAuth stores `full_name` / `name` in metadata, not `profiles` — backfill once when both are empty. */
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

  return <AccountDashboardClient user={user} profile={profile} subscription={subscription} />;
}
