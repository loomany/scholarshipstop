import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import Navbar from '@/components/ui/Navbar';
import { Toaster } from '@/components/ui/Toasts/toaster';
import { fontSans } from '@/lib/fonts';
import { PropsWithChildren, Suspense } from 'react';
import { getURL } from '@/utils/helpers';
import 'styles/main.css';

const title = 'ScholarshipTop — Find Scholarships That Match You';
const description =
  'Browse scholarships, filter by your goals, and find awards that fit your profile.';

export const metadata: Metadata = {
  metadataBase: new URL(getURL()),
  title: title,
  description: description,
  manifest: '/site.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icon-32x32.png', sizes: '32x32', type: 'image/png' }
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
      { url: '/apple-touch-icon-152x152.png', sizes: '152x152', type: 'image/png' },
      { url: '/apple-touch-icon-120x120.png', sizes: '120x120', type: 'image/png' }
    ]
  },
  openGraph: {
    title: title,
    description: description
  }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#ff7e00'
};

export default async function RootLayout({ children }: PropsWithChildren) {
  const siteUrl = getURL().replace(/\/$/, '');
  const siteSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        name: 'ScholarshipTop',
        url: siteUrl,
        email: 'support@scholarshiptop.com'
      },
      {
        '@type': 'WebSite',
        name: 'ScholarshipTop',
        url: siteUrl,
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
        <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#ff7e00" />
      </head>
      <body className={`${fontSans.className} bg-zinc-50 text-zinc-900`}>
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
      </body>
    </html>
  );
}
