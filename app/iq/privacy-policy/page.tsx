import type { Metadata } from 'next';

import IqLegalPage from '@/components/iq/IqLegalPage';
import { getIqLocaleFromRequest } from '@/lib/iq/i18n/getIqLocaleFromRequest';
import { buildIqLegalPageMetadata } from '@/lib/iq/i18n/iqLegalShellCopy';

export async function generateMetadata(): Promise<Metadata> {
  const locale = getIqLocaleFromRequest();
  return buildIqLegalPageMetadata('privacy', locale);
}

export default function IqPrivacyPolicyPage() {
  return (
    <IqLegalPage
      title="Privacy Policy"
      description="This Privacy Policy explains what information may be collected when you use the IQ Profile assessment and one-time report checkout."
      sections={[
        {
          title: 'Information we collect',
          body: (
            <>
              <p>
                We may collect information you provide directly, such as your
                email address, support messages, and information connected to a
                purchase or report unlock.
              </p>
              <p>
                The assessment also processes your test responses, timing data,
                score output, domain breakdown, and generated report profile. We
                may collect technical information such as browser type, device
                type, IP address, pages visited, and usage events.
              </p>
            </>
          )
        },
        {
          title: 'How we use information',
          body: (
            <ul className="list-disc space-y-2 pl-6">
              <li>
                to provide the assessment and generate the IQ-style report
              </li>
              <li>to process purchases and support report access</li>
              <li>to prevent abuse, debug errors, and secure the service</li>
              <li>
                to improve the product, page performance, and user experience
              </li>
              <li>to respond to support requests</li>
            </ul>
          )
        },
        {
          title: 'Payments and LemonSqueezy',
          body: (
            <p>
              Payments are processed by LemonSqueezy, our Merchant of Record. We
              do not store your full card number or card security code.
              LemonSqueezy may process payment, tax, fraud prevention, and
              checkout information according to its own policies.
            </p>
          )
        },
        {
          title: 'No clinical or sensitive diagnosis',
          body: (
            <p>
              IQ Profile is an educational product. It does not provide a
              medical diagnosis, mental health diagnosis, disability evaluation,
              employment screening, school placement decision, or any official
              psychological assessment.
            </p>
          )
        },
        {
          title: 'Data sharing',
          body: (
            <p>
              We do not sell personal information. We may share limited data
              with service providers needed to run the site, including hosting,
              analytics, database, authentication, email, support, and payment
              processing providers.
            </p>
          )
        },
        {
          title: 'Contact',
          body: (
            <p>
              For privacy questions, email{' '}
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
