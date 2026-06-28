import type { Metadata } from 'next';

import GeneralIqFunnelClient from './GeneralIqFunnelClient';
import { getIqLocaleFromRequest } from '@/lib/iq/i18n/getIqLocaleFromRequest';
import { getIqHomeMetadata } from '@/lib/iq/i18n/iqMetadataCopy';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const locale = getIqLocaleFromRequest();
  const meta = getIqHomeMetadata(locale);

  return {
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: 'https://scholarshiptop.com/iq'
    },
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: 'https://scholarshiptop.com/iq',
      type: 'website',
      siteName: meta.ogSiteName,
      locale: meta.ogLocale,
      images: [
        {
          url: '/logo-preview.png',
          width: 1200,
          height: 630,
          alt: meta.ogImageAlt
        }
      ]
    },
    twitter: {
      card: 'summary_large_image',
      title: meta.title,
      description: meta.description,
      images: ['/logo-preview.png']
    }
  };
}

export default function ScholarshipIqPage() {
  return <GeneralIqFunnelClient />;
}
