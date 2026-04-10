import type { Tables } from '@/types_db';

import {
  extractLemonCustomerPortalUrl,
  extractLemonUpdatePaymentMethodUrl
} from '@/lib/payments/lemonSubscriptionState';

type SubscriptionRow = Tables<'subscriptions'>;

/**
 * Best URL to fix billing: update payment method → customer portal → in-app subscription page.
 */
export function resolveBillingFixHref(
  subscription: SubscriptionRow | null,
  fallbackPath = '/subscription'
): string {
  if (!subscription || subscription.provider !== 'lemon_squeezy') {
    return fallbackPath;
  }
  const raw = subscription.raw_payload;
  if (!raw || typeof raw !== 'object') {
    return fallbackPath;
  }
  const payload = raw as Parameters<typeof extractLemonUpdatePaymentMethodUrl>[0];
  return (
    extractLemonUpdatePaymentMethodUrl(payload) ??
    extractLemonCustomerPortalUrl(payload) ??
    fallbackPath
  );
}

export function resolveResumeSubscriptionHref(
  subscription: SubscriptionRow | null,
  fallbackPath = '/subscription'
): string {
  if (!subscription || subscription.provider !== 'lemon_squeezy') {
    return fallbackPath;
  }
  const raw = subscription.raw_payload;
  if (!raw || typeof raw !== 'object') {
    return fallbackPath;
  }
  const payload = raw as Parameters<typeof extractLemonCustomerPortalUrl>[0];
  return extractLemonCustomerPortalUrl(payload) ?? fallbackPath;
}
