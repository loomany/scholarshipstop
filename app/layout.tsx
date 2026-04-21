import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import Navbar from '@/components/ui/Navbar';
import { Toaster } from '@/components/ui/Toasts/toaster';
import { fontSans } from '@/lib/fonts';
import { PropsWithChildren, Suspense } from 'react';
import {
  SITE_DEFAULT_TITLE,
  SITE_METADATA_TITLE_TEMPLATE,
  SITE_TITLE_TAGLINE
} from '@/lib/seo/siteTitle';
import { getURL } from '@/utils/helpers';
import {
  GoogleTagManager,
  GoogleTagManagerNoScript
} from '@/components/analytics/GoogleTagManager';
import { GOOGLE_ADS_AW_ID } from '@/lib/analytics/googleAdsSignupConversion';
import WebVitalsClient from '@/components/analytics/WebVitalsClient';
import { ScholarshipOnboardingDraftPostAuthSync } from '@/components/onboarding/ScholarshipOnboardingDraftPostAuthSync';
import { NavigationProgress } from '@/components/ui/NavigationProgress';
import dynamic from 'next/dynamic';
import 'styles/main.css';

/** Client-only: `usePathname` / `useSearchParams` can throw with Turbopack SSR (`useContext` null). */
const AnalyticsTracker = dynamic(
  () => import('@/components/AnalyticsTracker'),
  { ssr: false }
);

const defaultDescription =
  'Discover and manage the best scholarship grants tailored for your education. ScholarshipTop helps students find funding opportunities worldwide.';
const openGraphDescription =
  'Discover and manage thousands of scholarship grants.';
const canonicalSiteUrl = getURL().replace(/\/+$/, '');

export const metadata: Metadata = {
  metadataBase: new URL(getURL()),
  title: {
    default: SITE_DEFAULT_TITLE,
    template: SITE_METADATA_TITLE_TEMPLATE
  },
  description: defaultDescription,
  manifest: '/site.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon-48x48.png', sizes: '48x48', type: 'image/png' },
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
      { url: '/icon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-16x16.png', sizes: '16x16', type: 'image/png' }
    ],
    shortcut: '/favicon.ico',
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
      { url: '/apple-touch-icon-152x152.png', sizes: '152x152', type: 'image/png' },
      { url: '/apple-touch-icon-120x120.png', sizes: '120x120', type: 'image/png' }
    ]
  },
  openGraph: {
    title: SITE_DEFAULT_TITLE,
    description: openGraphDescription,
    url: `${canonicalSiteUrl}/`,
    siteName: 'ScholarshipTop',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/logo-preview.png',
        width: 1200,
        height: 630,
        alt: 'ScholarshipTop Logo'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_DEFAULT_TITLE,
    description: SITE_TITLE_TAGLINE,
    images: ['/logo-preview.png']
  },
  appleWebApp: {
    title: SITE_DEFAULT_TITLE,
    statusBarStyle: 'black'
  },
  other: {
    'msapplication-TileColor': '#000000'
  }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#000000'
};

export default async function RootLayout({ children }: PropsWithChildren) {
  const siteUrl = getURL().replace(/\/$/, '');
  const publisherId = `${siteUrl}#scholarshiptop-publisher`;
  const websiteId = `${siteUrl}#website`;
  const siteSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@id': publisherId,
        '@type': ['Organization', 'EducationalOrganization'],
        name: 'ScholarshipTop',
        url: siteUrl,
        email: 'support@scholarshiptop.com',
        description:
          'Scholarship search and application platform helping students find verified scholarships and financial aid opportunities.',
        logo: {
          '@type': 'ImageObject',
          url: `${siteUrl}/icon-192x192.png`
        }
      },
      {
        '@id': websiteId,
        '@type': 'WebSite',
        name: 'ScholarshipTop',
        url: siteUrl,
        publisher: { '@id': publisherId },
        potentialAction: {
          '@type': 'SearchAction',
          target: `${siteUrl}/scholarships?q={search_term_string}`,
          'query-input': 'required name=search_term_string'
        }
      }
    ]
  };

  return (
    <html lang="en" className={fontSans.variable}>
      <head>
        <meta name="fo-verify" content="5b534bf7-226a-4032-8ba7-1ce652711bd1" />
        <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#000000" />
      </head>
      <body className={`${fontSans.className} bg-zinc-50 text-zinc-900`}>
        <GoogleTagManagerNoScript />
        <GoogleTagManager />
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_AW_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-ads-gtag" strategy="afterInteractive">
          {`
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GOOGLE_ADS_AW_ID}');
`}
        </Script>
        <Script
          id="lemonsqueezy-js"
          src="https://app.lemonsqueezy.com/js/lemon.js"
          strategy="afterInteractive"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteSchema) }}
        />
        {/*
          Width boundary for header + main (overflow-x is html/body — avoid
          overflow-x-clip here so sticky navbar is not turned into a nested scroll box).
          Home page includes its own footer + final CTA in `app/page.tsx` only.
          Toaster stays outside so position:fixed stays viewport-relative.
        */}
        <div className="w-full min-w-0 max-w-full">
          <NavigationProgress />
          <ScholarshipOnboardingDraftPostAuthSync />
          <Navbar />
          <main
            id="skip"
            className="min-h-[calc(100dvh-4rem)] w-full min-w-0 md:min-h-[calc(100dvh-5rem)]"
          >
            {children}
          </main>
        </div>
        <Suspense fallback={null}>
          <Toaster />
        </Suspense>
        <WebVitalsClient />
        <AnalyticsTracker />
      </body>
    </html>
  );
}
