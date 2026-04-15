import AccountDashboardClient from '@/components/account/AccountDashboardClient';
import type { Metadata } from 'next';
import { unstable_noStore as noStore } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { getSubscription, getUserDetails, getUser } from '@/utils/supabase/queries';

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

  return <AccountDashboardClient user={user} profile={userDetails} subscription={subscription} />;
}
