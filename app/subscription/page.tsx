import type { Metadata } from 'next';
import SubscriptionPricingClient from '@/components/subscription/SubscriptionPricingClient';
import SiteFooter from '@/components/ui/Footer/SiteFooter';
import { deriveSubscriptionPresentation } from '@/lib/payments/subscriptionEntitlements';
import { createClient } from '@/utils/supabase/server';
import { getSubscription, getUser } from '@/utils/supabase/queries';
import type { Tables } from '@/types_db';

export const metadata: Metadata = {
  title: 'Unlock Premium Precision'
};

type Subscription = Tables<'subscriptions'>;

function inferCurrentPlanKey(subscription: Subscription | null): 'monthly' | 'quarterly' | 'yearly' | null {
  if (!subscription) return null;

  if (subscription.plan_code === 'monthly_pro') return 'monthly';
  if (subscription.plan_code === 'quarterly_pro') return 'quarterly';
  if (subscription.plan_code === 'yearly_pro') return 'yearly';

  const planText = `${subscription.provider_product_name ?? ''} ${subscription.provider_variant_name ?? ''}`.toLowerCase();
  if (planText.includes('year')) return 'yearly';
  if (planText.includes('quarter')) return 'quarterly';
  if (planText.includes('month')) return 'monthly';
  return null;
}

export default async function SubscriptionPage() {
  const supabase = createClient();
  const user = await getUser(supabase);
  const profile = user
    ? await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
    : { data: null };
  const subscription = user ? await getSubscription(supabase, user.id) : null;
  const presentation = deriveSubscriptionPresentation(profile.data, subscription);
  const currentPlanKey = presentation.isSubscribed ? inferCurrentPlanKey(subscription) : null;

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

          <SubscriptionPricingClient currentPlanKey={currentPlanKey} />

          <p className="mx-auto mt-10 max-w-2xl text-center text-xs text-gray-500">
            Payments are securely processed by LemonSqueezy, our Merchant of Record.
          </p>
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
