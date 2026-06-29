import type { Metadata } from 'next';

import IqLegalPage from '@/components/iq/IqLegalPage';
import { getIqLocaleFromRequest } from '@/lib/iq/i18n/getIqLocaleFromRequest';
import { buildIqLegalPageMetadata } from '@/lib/iq/i18n/iqLegalShellCopy';

export async function generateMetadata(): Promise<Metadata> {
  const locale = getIqLocaleFromRequest();
  return buildIqLegalPageMetadata('refund', locale);
}

export default function IqRefundPolicyPage() {
  return (
    <IqLegalPage
      title="Refund Policy"
      description="This policy explains how refund requests are handled for the one-time IQ Profile report purchase."
      sections={[
        {
          title: 'One-time digital report',
          body: (
            <p>
              IQ Profile is a digital product. The paid report is generated from
              your assessment responses and made available after purchase. The
              standard purchase is a one-time $9.99 report unlock, not a
              recurring subscription.
            </p>
          )
        },
        {
          title: 'When refunds may be considered',
          body: (
            <ul className="list-disc space-y-2 pl-6">
              <li>duplicate charges for the same report</li>
              <li>payment succeeded but the report could not be accessed</li>
              <li>
                clear technical failure that prevented delivery of the paid
                report
              </li>
              <li>other cases required by applicable consumer law</li>
            </ul>
          )
        },
        {
          title: 'When refunds may be limited',
          body: (
            <p>
              Because this is digital content, refunds may be limited after the
              report has been unlocked, accessed, or delivered, unless required
              by law or there was a verified technical delivery issue.
            </p>
          )
        },
        {
          title: 'LemonSqueezy processing',
          body: (
            <p>
              LemonSqueezy is our Merchant of Record and may appear on your
              receipt or payment statement. Approved refunds may be processed
              through LemonSqueezy and returned to the original payment method.
            </p>
          )
        },
        {
          title: 'How to request help',
          body: (
            <p>
              Email{' '}
              <a
                href="mailto:support@scholarshiptop.com"
                className="font-semibold text-slate-950 underline decoration-slate-300 underline-offset-4"
              >
                support@scholarshiptop.com
              </a>{' '}
              with your checkout email, purchase date, and a short description
              of the issue.
            </p>
          )
        }
      ]}
    />
  );
}
