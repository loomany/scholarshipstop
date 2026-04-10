import type { Metadata } from 'next';
import { unstable_noStore as noStore } from 'next/cache';
import SubscriptionPricingClient from '@/components/subscription/SubscriptionPricingClient';
import SiteFooter from '@/components/ui/Footer/SiteFooter';
import {
  deriveSubscriptionPresentation,
  inferSubscriptionBillingTier
} from '@/lib/payments/subscriptionEntitlements';
import { createClient } from '@/utils/supabase/server';
import { getSubscription, getUser } from '@/utils/supabase/queries';
import type { BillingPlanKey } from '@/app/actions/billing';

export const metadata: Metadata = {
  title: 'Unlock Premium Precision'
};

// Must be dynamic: pricing CTAs depend on the signed-in user's subscription row.
// Without this, Next can serve a static shell where `getUser` never runs with cookies.
export const dynamic = 'force-dynamic';

export default async function SubscriptionPage() {
  noStore();
  const supabase = createClient();
  const user = await getUser(supabase);
  const profile = user
    ? await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
    : { data: null };
  const subscription = user ? await getSubscription(user.id) : null;
  const presentation = deriveSubscriptionPresentation(profile.data, subscription);
  const currentPlanKey: BillingPlanKey | null = presentation.isSubscribed
    ? inferSubscriptionBillingTier(subscription, profile.data)
    : null;

  return (
    <>
      <section className="bg-zinc-50 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <header className="text-center">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Unlock Premium Precision
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-base text-gray-500 sm:text-lg">
              Start your 3-day free trial today. Cancel anytime.
            </p>
          </header>

          <SubscriptionPricingClient
            currentPlanKey={currentPlanKey}
            hasActiveSubscription={presentation.isSubscribed}
          />

          <p className="mx-auto mt-10 max-w-2xl text-center text-xs text-gray-500">
            Payments are securely processed by LemonSqueezy, our Merchant of Record.
          </p>
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
