import Link from 'next/link';

import PurchaseSuccessEvent from '@/components/analytics/PurchaseSuccessEvent';
import type { LocalizedUiLocale } from '@/lib/i18n/localizedHref';
import { localizedPath } from '@/lib/i18n/paths';
import { getSubscriptionSuccessUiCopy } from '@/lib/i18n/subscriptionSuccessPageCopy';

export default function SubscriptionSuccessContent({
  locale = 'en'
}: {
  locale?: LocalizedUiLocale;
}) {
  const ui = getSubscriptionSuccessUiCopy(locale);
  const scholarshipsHref = localizedPath(locale, '/scholarships');
  const accountHref = localizedPath(locale, '/account');

  return (
    <>
      <PurchaseSuccessEvent />
      <section className="bg-zinc-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-lg text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">{ui.h1}</h1>
          <p className="mt-4 text-base text-gray-600">{ui.body}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href={scholarshipsHref}
              className="inline-flex items-center justify-center rounded-md bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800"
            >
              {ui.browseScholarships}
            </Link>
            <Link
              href={accountHref}
              className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 hover:bg-gray-50"
            >
              {ui.goToAccount}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
