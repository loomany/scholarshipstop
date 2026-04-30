import type { Metadata } from 'next';

import IqLegalPage from '@/components/iq/IqLegalPage';

export const metadata: Metadata = {
  title: 'About IQ Profile',
  description: 'About the IQ Profile cognitive report and its educational purpose.'
};

export default function IqAboutPage() {
  return (
    <IqLegalPage
      title="About IQ Profile"
      description="IQ Profile is an educational IQ-style assessment and report for people who want a clearer view of how they solve problems."
      sections={[
        {
          title: 'What this product is',
          body: (
            <>
              <p>
                IQ Profile is a short, timed cognitive assessment that produces
                an IQ-style report with score interpretation, domain breakdown,
                Brain Archetype, and strengths profile.
              </p>
              <p>
                The experience is designed for curiosity and self-understanding,
                not for medical, clinical, employment, admissions, or legal
                decision-making.
              </p>
            </>
          )
        },
        {
          title: 'Scientific inspiration',
          body: (
            <p>
              The landing page references established psychometric traditions,
              including online cognitive batteries, matrix reasoning, multi-index
              intelligence profiles, and fluid reasoning research. Those
              references explain the product inspiration. They do not mean IQ
              Profile is affiliated with, endorsed by, or equivalent to any
              clinical assessment.
            </p>
          )
        },
        {
          title: 'How payment works',
          body: (
            <p>
              The assessment can be started before payment. After completion,
              the full IQ-style report can be unlocked with a one-time $9.99
              purchase processed by LemonSqueezy, our Merchant of Record.
            </p>
          )
        }
      ]}
    />
  );
}
