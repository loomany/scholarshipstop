import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { headers } from 'next/headers';
import Navbar from '@/components/ui/Navbar';
import { Toaster } from '@/components/ui/Toasts/toaster';
import { fontSans } from '@/lib/fonts';
import { PropsWithChildren, Suspense } from 'react';
import {
  SITE_DEFAULT_TITLE,
  SITE_METADATA_TITLE_TEMPLATE,
  SITE_TITLE_TAGLINE
} from '@/lib/seo/siteTitle';
import { getCanonical } from '@/lib/seo/canonical';
import { getURL } from '@/utils/helpers';
import {
  GoogleTagManager,
  GoogleTagManagerNoScript
} from '@/components/analytics/GoogleTagManager';
import { GOOGLE_ADS_AW_ID } from '@/lib/analytics/googleAdsSignupConversion';
import WebVitalsClient from '@/components/analytics/WebVitalsClient';
import { ScholarshipOnboardingDraftPostAuthSync } from '@/components/onboarding/ScholarshipOnboardingDraftPostAuthSync';
import HomeAiNavigatorWidget from '@/components/home/HomeAiNavigatorWidget';
import SiteFooter from '@/components/ui/Footer/SiteFooter';
import dynamic from 'next/dynamic';
import { getLocaleDirection, ROOT_LOCALE } from '@/lib/i18n/locales';
import {
  isStage2PilotLocale,
  type Stage2PilotLocale
} from '@/lib/i18n/pilotRoutes';
import { getIqLocaleFromRequestHeaders } from '@/lib/iq/i18n/getIqLocaleFromRequest';
import 'styles/main.css';

function normalizeRequestHost(value: string | null): string {
  return (value ?? '').split(',')[0]?.trim().toLowerCase().replace(/:\d+$/, '') ?? '';
}

function shouldHideAiNavigatorForHost(host: string): boolean {
  return host === 'iq.scholarshiptop.com' || host.startsWith('iq.');
}

function requestLocaleFromHeaders(
  requestHeaders: ReturnType<typeof headers>,
  requestHost: string
): Stage2PilotLocale | typeof ROOT_LOCALE {
  if (shouldHideAiNavigatorForHost(requestHost)) {
    return getIqLocaleFromRequestHeaders(requestHeaders);
  }
  const locale = requestHeaders.get('x-scholarshiptop-locale');
  return isStage2PilotLocale(locale) ? locale : ROOT_LOCALE;
}

/** Client-only: `usePathname` / `useSearchParams` can throw with Turbopack SSR (`useContext` null). */
const AnalyticsTracker = dynamic(
  () => import('@/components/AnalyticsTracker'),
  { ssr: false }
);

/** `nextjs-toploader` listens to the pathname; same Turbopack SSR pitfall as AnalyticsTracker. */
const NavigationProgress = dynamic(
  () =>
    import('@/components/ui/NavigationProgress').then((m) => ({
      default: m.NavigationProgress
    })),
  { ssr: false }
);

/** Same Turbopack pitfall as AnalyticsTracker — `usePathname` needs client-only mount. */
const GptTrafficTracker = dynamic(
  () => import('@/components/analytics/GptTrafficTracker'),
  { ssr: false }
);

const defaultDescription =
  'Discover and manage the best scholarship grants tailored for your education. ScholarshipTop helps students find funding opportunities worldwide.';
const openGraphDescription =
  'Discover and manage thousands of scholarship grants.';
const canonicalSiteUrl = getCanonical('/').replace(/\/+$/, '');

export const metadata: Metadata = {
  metadataBase: new URL(getCanonical('/')),
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
  other: {
    'msapplication-TileColor': '#000000',
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-title': SITE_DEFAULT_TITLE,
    'apple-mobile-web-app-status-bar-style': 'black'
  }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#000000'
};

export default async function RootLayout({ children }: PropsWithChildren) {
  const requestHeaders = headers();
  const requestHost = normalizeRequestHost(
    requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host')
  );
  const requestLocale = requestLocaleFromHeaders(requestHeaders, requestHost);
  const requestDirection = getLocaleDirection(requestLocale);
  const showAiNavigator = !shouldHideAiNavigatorForHost(requestHost);
  const siteUrl = getURL().replace(/\/$/, '');
  const localizedSiteDescriptions = {
    en: 'Scholarship search and application-planning platform that helps students find relevant scholarships, compare eligibility and deadlines, understand application requirements, save opportunities, and apply through official provider sources.',
    es: 'Plataforma de búsqueda y planificación de becas que ayuda a estudiantes a encontrar oportunidades relevantes, comparar elegibilidad y fechas, entender requisitos y aplicar mediante fuentes oficiales.',
    fr: 'Plateforme de recherche et de planification de bourses qui aide les étudiants à trouver des opportunités pertinentes, comparer critères et dates, comprendre les exigences et postuler via les sources officielles.'
  } as const;
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
        description: localizedSiteDescriptions[requestLocale],
        contactPoint: {
          '@type': 'ContactPoint',
          email: 'support@scholarshiptop.com',
          contactType: 'customer support',
          availableLanguage: ['English', 'Spanish', 'French']
        },
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
        inLanguage: requestLocale,
        publisher: { '@id': publisherId },
        potentialAction: {
          '@type': 'SearchAction',
          target: `${siteUrl}${
            requestLocale === ROOT_LOCALE ? '' : `/${requestLocale}`
          }/scholarships?q={search_term_string}`,
          'query-input': 'required name=search_term_string'
        }
      }
    ]
  };

  return (
    <html
      lang={requestLocale}
      dir={requestDirection}
      className={`${fontSans.variable} font-sans`}
    >
      <head>
        <meta name="fo-verify" content="5b534bf7-226a-4032-8ba7-1ce652711bd1" />
        <meta
          name="impact-site-verification"
          content="1c28c304-5034-41b3-b4c0-4cf9063f3cb3"
        />
        <meta name="yandex-verification" content="a42f95878903e0dc" />
        <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#000000" />
        <link
          rel="alternate"
          type="application/rss+xml"
          title="ScholarshipTop RSS"
          href={`${canonicalSiteUrl}/rss.xml`}
        />
        <link
          rel="alternate"
          type="application/rss+xml"
          title="ScholarshipTop Resources RSS"
          href={`${canonicalSiteUrl}/rss/resources.xml`}
        />
        <link
          rel="alternate"
          type="application/rss+xml"
          title="ScholarshipTop Essay Guides RSS"
          href={`${canonicalSiteUrl}/rss/essays.xml`}
        />
        <link
          rel="alternate"
          type="application/rss+xml"
          title="ScholarshipTop Comparison Guides RSS"
          href={`${canonicalSiteUrl}/rss/compare.xml`}
        />
        <link
          rel="alternate"
          type="application/rss+xml"
          title="ScholarshipTop Scholarship Categories RSS"
          href={`${canonicalSiteUrl}/rss/categories.xml`}
        />
      </head>
      <body
        className={`${fontSans.className} font-sans bg-zinc-50 text-zinc-900 antialiased`}
      >
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
          Width boundary for header + main + footer (overflow-x is html/body — avoid
          overflow-x-clip here so sticky navbar is not turned into a nested scroll box).
          Main uses relative z-10 so overlays (absolute dropdowns) paint above footer.
          Toaster stays outside so position:fixed stays viewport-relative.
        */}
        <div className="w-full min-w-0 max-w-full">
          <NavigationProgress />
          <ScholarshipOnboardingDraftPostAuthSync />
          <Navbar locale={requestLocale} />
          <main
            id="skip"
            className="relative z-10 min-h-[calc(100dvh-4rem)] w-full min-w-0 md:min-h-[calc(100dvh-5rem)]"
          >
            {children}
          </main>
          <SiteFooter locale={requestLocale} />
        </div>
        {showAiNavigator ? <HomeAiNavigatorWidget /> : null}
        <Suspense fallback={null}>
          <Toaster />
        </Suspense>
        <Suspense fallback={null}>
          <GptTrafficTracker />
        </Suspense>
        <WebVitalsClient />
        <AnalyticsTracker />
      </body>
    </html>
  );
}
