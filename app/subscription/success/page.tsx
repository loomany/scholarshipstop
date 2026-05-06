import type { Metadata } from 'next';
import Link from 'next/link';

import PurchaseSuccessEvent from '@/components/analytics/PurchaseSuccessEvent';

export const metadata: Metadata = {
  title: 'Thank you for subscribing'
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
  return (
    <>
      <PurchaseSuccessEvent />

      <section className="bg-zinc-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-lg text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Thank you
          </h1>
          <p className="mt-4 text-base text-gray-600">
            Your payment was received. Premium access is activated as soon as our payment partner
            confirms your subscription — usually within a minute.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/scholarships"
              className="inline-flex items-center justify-center rounded-md bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800"
            >
              Browse scholarships
            </Link>
            <Link
              href="/account"
              className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 hover:bg-gray-50"
            >
              Go to account
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
