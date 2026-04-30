import type { Metadata } from 'next';

import GeneralIqFunnelClient from './GeneralIqFunnelClient';

const title = 'Online IQ Test | IQ-Style Score and Cognitive Profile';
const description =
  'Take a short online IQ-style test inspired by modern psychometrics. Get a cognitive profile across reasoning, spatial intelligence, verbal logic, numerical logic, and decision speed.';

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: 'https://iq.scholarshiptop.com/'
  },
  openGraph: {
    title,
    description,
    url: 'https://iq.scholarshiptop.com/',
    type: 'website',
    siteName: 'Online IQ Test',
    locale: 'en_US',
    images: [
      {
        url: '/logo-preview.png',
        width: 1200,
        height: 630,
        alt: 'Online IQ Test cognitive profile report'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: ['/logo-preview.png']
  }
};

export default function ScholarshipIqPage() {
  return <GeneralIqFunnelClient />;
}
