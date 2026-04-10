import AccountDashboardClient from '@/components/account/AccountDashboardClient';
import type { Metadata } from 'next';
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

export default async function Account() {
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
