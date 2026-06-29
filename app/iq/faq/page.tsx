import type { Metadata } from 'next';

import IqLegalPage from '@/components/iq/IqLegalPage';
import { getIqLocaleFromRequest } from '@/lib/iq/i18n/getIqLocaleFromRequest';
import { buildIqLegalPageMetadata } from '@/lib/iq/i18n/iqLegalShellCopy';

export async function generateMetadata(): Promise<Metadata> {
  const locale = getIqLocaleFromRequest();
  return buildIqLegalPageMetadata('faq', locale);
}

export default function IqFaqPage() {
  return (
    <IqLegalPage
      title="FAQ"
      description="Common questions about the IQ-style assessment, report, payment, and limitations."
      sections={[
        {
          title: 'Is this a real clinical IQ test?',
          body: (
            <p>
              No. IQ Profile is an educational IQ-style cognitive assessment. It
              is inspired by reasoning and psychometric traditions, but it is
              not a licensed clinical test and should not be used as an official
              diagnosis or certification.
            </p>
          )
        },
        {
          title: 'What do I get after payment?',
          body: (
            <p>
              The full report includes an IQ-style score interpretation,
              percentile-style context, five-domain cognitive breakdown, Brain
              Archetype, and strengths profile.
            </p>
          )
        },
        {
          title: 'How much does it cost?',
          body: (
            <p>
              The standalone IQ Profile report is a one-time $9.99 purchase
              unless a different price is shown at checkout.
            </p>
          )
        },
        {
          title: 'Who processes payments?',
          body: (
            <p>
              LemonSqueezy processes payments as our Merchant of Record. We do
              not store your full card details.
            </p>
          )
        },
        {
          title: 'Can I get a refund?',
          body: (
            <p>
              Refunds may be considered for duplicate charges, access issues, or
              verified technical delivery failures. See the IQ Profile Refund
              Policy for details.
            </p>
          )
        },
        {
          title: 'How do I contact support?',
          body: (
            <p>
              Email{' '}
              <a
                href="mailto:support@scholarshiptop.com"
                className="font-semibold text-slate-950 underline decoration-slate-300 underline-offset-4"
              >
                support@scholarshiptop.com
              </a>
              .
            </p>
          )
        }
      ]}
    />
  );
}
