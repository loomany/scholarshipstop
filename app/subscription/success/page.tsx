import type { Metadata } from 'next';

import SubscriptionSuccessContent from '@/components/subscription/SubscriptionSuccessContent';
import { getSubscriptionSuccessUiCopy } from '@/lib/i18n/subscriptionSuccessPageCopy';

const ui = getSubscriptionSuccessUiCopy('en');

export const metadata: Metadata = {
  title: ui.metaTitle,
  robots: { index: false, follow: true }
};

/**
 * Post-checkout thank-you page for GTM / Google Ads `purchase_success` (see `PurchaseSuccessEvent`).
 *
 * Lemon Squeezy does **not** define a success redirect in this repository: checkout URLs are built in
 * `app/actions/billing.ts` without a `redirect_url`. Configure your Lemon product or store checkout
 * “Thank you / custom confirmation” URL in the Lemon Squeezy dashboard to point here, for example:
 *   `${NEXT_PUBLIC_SITE_URL}` + `/subscription/success`
 * (default public site: https://scholarshiptop.com/subscription/success)
 */
export default function SubscriptionSuccessPage() {
  return <SubscriptionSuccessContent locale="en" />;
}
