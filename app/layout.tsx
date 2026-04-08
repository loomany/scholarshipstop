import type { Metadata, Viewport } from 'next';
import SubscriptionDebug from '@/components/debug/SubscriptionDebug';
import ConditionalFooter from '@/components/ui/Footer/ConditionalFooter';
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
  openGraph: {
    title: title,
    description: description
  }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover'
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
      <body className={`${fontSans.className} bg-zinc-50 text-zinc-900`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteSchema) }}
        />
        {/*
          Width boundary for header + main + footer (overflow-x is html/body — avoid
          overflow-x-clip here so sticky navbar is not turned into a nested scroll box).
          Toaster + SubscriptionDebug stay outside so position:fixed stays viewport-relative.
        */}
        <div className="w-full min-w-0 max-w-full">
          <Navbar />
          <main
            id="skip"
            className="min-h-[calc(100dvh-4rem)] w-full min-w-0 md:min-h-[calc(100dvh-5rem)]"
          >
            {children}
          </main>
          <Suspense fallback={null}>
            <ConditionalFooter />
          </Suspense>
        </div>
        <Suspense fallback={null}>
          <Toaster />
        </Suspense>
        <Suspense fallback={null}>
          <SubscriptionDebug />
        </Suspense>
      </body>
    </html>
  );
}
