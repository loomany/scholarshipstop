import type { Metadata } from 'next';
import { unstable_noStore as noStore } from 'next/cache';
import SubscriptionPricingClient from '@/components/subscription/SubscriptionPricingClient';
import SiteFooter from '@/components/ui/Footer/SiteFooter';
import type { Json, Tables } from '@/types_db';
import {
  deriveSubscriptionPresentation,
  subscriptionPricingHighlightTier,
  subscriptionPricingPlanStatusLabel
} from '@/lib/payments/subscriptionEntitlements';
import {
  extractLemonCustomerPortalUrl,
  extractLemonUpdatePaymentMethodUrl
} from '@/lib/payments/lemonSubscriptionState';
import { resolveBillingFixHref } from '@/lib/payments/billingUrls';
import { enrichBillingFixUrlFromLemonApi } from '@/lib/payments/enrichLemonBillingFixUrl';
import { createClient } from '@/utils/supabase/server';
import { getSubscription, getUser } from '@/utils/supabase/queries';
import type { BillingPlanKey } from '@/app/actions/billing';

export const metadata: Metadata = {
  title: 'Unlock Premium Precision'
};

// Must be dynamic: pricing CTAs depend on the signed-in user's subscription row.
// Without this, Next can serve a static shell where `getUser` never runs with cookies.
export const dynamic = 'force-dynamic';

function getManageSubscriptionUrlFromRow(row: unknown): string | null {
  if (!row || typeof row !== 'object') return null;
  const candidate = row as { provider?: unknown; raw_payload?: Json | null };
  if (candidate.provider !== 'lemon_squeezy') return null;
  return extractLemonCustomerPortalUrl(
    candidate.raw_payload as Parameters<typeof extractLemonCustomerPortalUrl>[0]
  );
}

function getUpdatePaymentUrlFromRow(row: unknown): string | null {
  if (!row || typeof row !== 'object') return null;
  const candidate = row as { provider?: unknown; raw_payload?: Json | null };
  if (candidate.provider !== 'lemon_squeezy') return null;
  return extractLemonUpdatePaymentMethodUrl(
    candidate.raw_payload as Parameters<typeof extractLemonUpdatePaymentMethodUrl>[0]
  );
}

/** Matches eligibility in `app/api/billing/skip-trial/route.ts`. */
function isEligibleForSkipTrial(subscription: Tables<'subscriptions'> | null): boolean {
  if (!subscription || subscription.provider !== 'lemon_squeezy') return false;
  const status = subscription.status;
  if (status !== 'trialing' && status !== 'on_trial') return false;
  if (subscription.trial_end) {
    const end = new Date(subscription.trial_end);
    if (!Number.isNaN(end.getTime()) && end.getTime() <= Date.now()) return false;
  }
  return true;
}

export default async function SubscriptionPage() {
  noStore();
  const supabase = createClient();
  const user = await getUser(supabase);
  const profile = user
    ? await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
    : { data: null };
  const subscription = user ? await getSubscription(user.id) : null;
  const presentation = deriveSubscriptionPresentation(profile.data, subscription);
  const currentPlanKey: BillingPlanKey | null = subscriptionPricingHighlightTier(
    presentation,
    subscription,
    profile.data
  );
  const manageSubscriptionUrl = getManageSubscriptionUrlFromRow(subscription);
  const updatePaymentUrl = getUpdatePaymentUrlFromRow(subscription);
  const siteBase = (
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://scholarshiptop.com'
  ).replace(/\/+$/, '');
  const pastDue = presentation.status === 'past_due';
  const fallbackBillingPath = `${siteBase}/subscription`;
  /** Always set when past_due: Lemon URLs or site subscription page. */
  let resolvedBillingFixUrl = pastDue
    ? resolveBillingFixHref(subscription, fallbackBillingPath)
    : null;
  if (
    pastDue &&
    user &&
    subscription &&
    resolvedBillingFixUrl === fallbackBillingPath
  ) {
    resolvedBillingFixUrl = await enrichBillingFixUrlFromLemonApi(
      subscription,
      user.id,
      fallbackBillingPath
    );
  }
  const showResumeAction =
    presentation.status === 'cancelled' && presentation.isSubscribed && Boolean(manageSubscriptionUrl);
  const showUpdatePaymentAction = pastDue;
  const isEligibleForSkipTrialFlag = isEligibleForSkipTrial(subscription);
  /** `isSubscribed` is false for `past_due` (no paid access), but Lemon still has a tier — use Upgrade CTAs, not new-trial. */
  const hasSubscriptionForPricingUi =
    presentation.isSubscribed || (pastDue && currentPlanKey !== null);

  return (
    <>
      <section className="bg-zinc-50 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <header className="text-center">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Unlock Premium Precision
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-base text-gray-500 sm:text-lg">
              {hasSubscriptionForPricingUi
                ? 'Change billing cadence or upgrade anytime. Cancel through your billing portal.'
                : 'Start your 3-day free trial today. Cancel anytime.'}
            </p>
          </header>

          <SubscriptionPricingClient
            currentPlanKey={currentPlanKey}
            currentPlanStatusLabel={subscriptionPricingPlanStatusLabel(
              presentation,
              subscription,
              profile.data
            )}
            hasActiveSubscription={hasSubscriptionForPricingUi}
            manageSubscriptionUrl={manageSubscriptionUrl}
            updatePaymentUrl={pastDue ? resolvedBillingFixUrl : updatePaymentUrl}
            showResumeAction={showResumeAction}
            showUpdatePaymentAction={showUpdatePaymentAction}
            pastDueBillingAccent={pastDue}
            isEligibleForSkipTrial={isEligibleForSkipTrialFlag}
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
