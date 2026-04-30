import type { Metadata } from 'next';

import ScholarshipIqTestClient from './ScholarshipIqTestClient';

const title = 'Scholarship IQ Test | Intelligence Diagnostic for Funding Paths';
const description =
  'Take an 18-step Scholarship Intelligence Diagnostic and unlock a personal reasoning report with curated scholarship matches.';

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
    siteName: 'ScholarshipTop IQ',
    locale: 'en_US',
    images: [
      {
        url: '/logo-preview.png',
        width: 1200,
        height: 630,
        alt: 'ScholarshipTop IQ Report'
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
  return <ScholarshipIqTestClient />;
}
