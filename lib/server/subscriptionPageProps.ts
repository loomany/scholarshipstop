import { unstable_noStore as noStore } from 'next/cache';

import type { BillingPlanKey } from '@/app/actions/billing';
import type { LocalizedUiLocale } from '@/lib/i18n/localizedHref';
import {
  getSubscriptionPricingUiCopy,
  localizedSubscriptionPath,
  translateSubscriptionPlanStatusLabel
} from '@/lib/i18n/subscriptionPageCopy';
import { resolveBillingFixHref } from '@/lib/payments/billingUrls';
import { enrichBillingFixUrlFromLemonApi } from '@/lib/payments/enrichLemonBillingFixUrl';
import {
  extractLemonCustomerPortalUrl,
  extractLemonUpdatePaymentMethodUrl
} from '@/lib/payments/lemonSubscriptionState';
import {
  deriveSubscriptionPresentation,
  subscriptionPricingHighlightTier,
  subscriptionPricingPlanStatusLabel
} from '@/lib/payments/subscriptionEntitlements';
import type { Json, Tables } from '@/types_db';
import { createClient } from '@/utils/supabase/server';
import { getSubscription, getUser } from '@/utils/supabase/queries';

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

export type SubscriptionPageViewProps = {
  locale: LocalizedUiLocale;
  copy: ReturnType<typeof getSubscriptionPricingUiCopy>;
  returnPath: string;
  isAuthenticated: boolean;
  currentPlanKey: BillingPlanKey | null;
  currentPlanStatusLabel: string;
  hasActiveSubscription: boolean;
  manageSubscriptionUrl: string | null;
  updatePaymentUrl: string | null;
  showResumeAction: boolean;
  showUpdatePaymentAction: boolean;
  pastDueBillingAccent: boolean;
  isEligibleForSkipTrial: boolean;
};

export async function loadSubscriptionPageViewProps(
  locale: LocalizedUiLocale
): Promise<SubscriptionPageViewProps> {
  noStore();
  const copy = getSubscriptionPricingUiCopy(locale);
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
  const returnPath = localizedSubscriptionPath(locale);
  const pastDue = presentation.status === 'past_due';
  const fallbackBillingPath = `${siteBase}${returnPath}`;
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
    presentation.status === 'cancelled' &&
    presentation.isSubscribed &&
    Boolean(manageSubscriptionUrl);
  const showUpdatePaymentAction = pastDue;
  const isEligibleForSkipTrialFlag = isEligibleForSkipTrial(subscription);
  const hasSubscriptionForPricingUi =
    presentation.isSubscribed || (pastDue && currentPlanKey !== null);
  const englishStatusLabel = subscriptionPricingPlanStatusLabel(
    presentation,
    subscription,
    profile.data
  );

  return {
    locale,
    copy,
    returnPath,
    isAuthenticated: Boolean(user),
    currentPlanKey,
    currentPlanStatusLabel: translateSubscriptionPlanStatusLabel(
      englishStatusLabel,
      locale
    ),
    hasActiveSubscription: hasSubscriptionForPricingUi,
    manageSubscriptionUrl,
    updatePaymentUrl: pastDue ? resolvedBillingFixUrl : updatePaymentUrl,
    showResumeAction,
    showUpdatePaymentAction,
    pastDueBillingAccent: pastDue,
    isEligibleForSkipTrial: isEligibleForSkipTrialFlag
  };
}
