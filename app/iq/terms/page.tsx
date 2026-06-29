import type { Metadata } from 'next';
import Link from 'next/link';

import IqLegalPage from '@/components/iq/IqLegalPage';
import { getIqLocaleFromRequest } from '@/lib/iq/i18n/getIqLocaleFromRequest';
import { buildIqLegalPageMetadata } from '@/lib/iq/i18n/iqLegalShellCopy';

export async function generateMetadata(): Promise<Metadata> {
  const locale = getIqLocaleFromRequest();
  return buildIqLegalPageMetadata('terms', locale);
}

export default function IqTermsPage() {
  return (
    <IqLegalPage
      title="Terms of Service"
      description="These Terms govern your use of the IQ Profile assessment, report preview, and one-time paid report unlock."
      sections={[
        {
          title: 'Use of the service',
          body: (
            <p>
              IQ Profile is provided for lawful, personal, educational use. You
              agree not to misuse the assessment, interfere with the site,
              scrape protected content, attempt unauthorized access, or use the
              product for decisions that require a qualified professional.
            </p>
          )
        },
        {
          title: 'Educational assessment only',
          body: (
            <p>
              The report is an IQ-style cognitive profile. It is not a licensed
              psychological exam, clinical diagnosis, medical advice, school
              placement tool, employment test, legal evaluation, or official IQ
              certification.
            </p>
          )
        },
        {
          title: 'Paid report',
          body: (
            <p>
              The full report is offered as a one-time purchase for $9.99 unless
              a different price is shown at checkout. Payments are processed by
              LemonSqueezy, our Merchant of Record. Taxes, payment handling, and
              checkout receipts may be managed by LemonSqueezy.
            </p>
          )
        },
        {
          title: 'Refunds',
          body: (
            <p>
              Refund eligibility is described in our{' '}
              <Link
                href="/iq/refund-policy"
                className="font-semibold text-slate-950 underline decoration-slate-300 underline-offset-4"
              >
                IQ Profile Refund Policy
              </Link>
              . Because the report is digital content generated after test
              completion, refunds may be limited once the report has been
              accessed.
            </p>
          )
        },
        {
          title: 'No guarantee of outcome',
          body: (
            <p>
              We do not guarantee a particular score, percentile, archetype,
              personal result, or real-world outcome. The report is generated
              from your answers and timing data and should be interpreted as
              educational guidance.
            </p>
          )
        },
        {
          title: 'Limitation of liability',
          body: (
            <p>
              To the maximum extent permitted by law, ScholarshipTop and its
              operators are not liable for indirect, incidental, consequential,
              reliance-based, or special damages arising from use of the IQ
              Profile product.
            </p>
          )
        },
        {
          title: 'Contact',
          body: (
            <p>
              Questions about these Terms can be sent to{' '}
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
      closing={<p>By using IQ Profile, you agree to these Terms of Service.</p>}
    />
  );
}
