import { redirect } from 'next/navigation';

import { getCheckoutURLSkipTrialMonthly } from '@/app/actions/billing';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Deep link for “paid subscription now” (skips Lemon trial when API/env is configured).
 * Usage: /start → Lemon checkout.
 */
export default async function StartPaidSubscriptionPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/signin?next=/start');
  }

  const url = await getCheckoutURLSkipTrialMonthly();
  redirect(url);
}
