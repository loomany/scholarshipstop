import type { Metadata } from 'next';

import IqLegalPage from '@/components/iq/IqLegalPage';

export const metadata: Metadata = {
  title: 'IQ Profile Help',
  description: 'Help and support information for the IQ Profile report.'
};

export default function IqHelpPage() {
  return (
    <IqLegalPage
      title="Help"
      description="Support information for taking the IQ-style assessment, unlocking the report, and contacting us."
      sections={[
        {
          title: 'Taking the assessment',
          body: (
            <p>
              Use a stable internet connection and avoid refreshing the browser
              during the test. The assessment is timed because speed is part of
              the cognitive profile, but the report should be read as educational
              guidance rather than a clinical score.
            </p>
          )
        },
        {
          title: 'Unlocking the report',
          body: (
            <p>
              After completing the assessment, you can unlock the full report for
              a one-time $9.99 payment. Checkout is handled by LemonSqueezy. We
              do not store your card details.
            </p>
          )
        },
        {
          title: 'Payment or access issue',
          body: (
            <p>
              If payment succeeds but you cannot access the report, email{' '}
              <a
                href="mailto:support@scholarshiptop.com"
                className="font-semibold text-slate-950 underline decoration-slate-300 underline-offset-4"
              >
                support@scholarshiptop.com
              </a>{' '}
              with the checkout email and approximate purchase time.
            </p>
          )
        }
      ]}
    />
  );
}
