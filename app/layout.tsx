import { Metadata } from 'next';
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
        <Navbar />
        <main
          id="skip"
          className="min-h-[calc(100dvh-4rem)] md:min-h-[calc(100dvh-5rem)]"
        >
          {children}
        </main>
        <Suspense fallback={null}>
          <ConditionalFooter />
        </Suspense>
        <Suspense>
          <Toaster />
        </Suspense>
      </body>
    </html>
  );
}
