import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Suspense } from 'react';
import { BookOpen, Check, Heart, Layers } from 'lucide-react';

import HomeFinalCta from '@/components/home/HomeFinalCta';
import HomeGuidedEssaySupport from '@/components/home/HomeGuidedEssaySupport';
import HomeResourcesAsync from '@/components/home/HomeResourcesAsync';
import HomePrimaryCtaClient from '@/components/home/HomePrimaryCtaClient';
import HomeStatsAsync from '@/components/home/HomeStatsAsync';
import {
  homePremiumCtaClass,
  homePrimaryCtaClass
} from '@/components/home/homeMarketingCtaClasses';
import HomeTrustStrip from '@/components/home/HomeTrustStrip';
import HomeWhatWeVerify from '@/components/home/HomeWhatWeVerify';
import ScrollRevealWrapper from '@/components/ScrollRevealWrapper';
import { FeaturedBrandScholarshipsSection } from '@/components/home/FeaturedBrandScholarshipsSection';
import ScholarshipPreviewList from '@/components/scholarships/ScholarshipPreviewList';
import { HomePageJsonLd } from '@/components/seo/HomePageJsonLd';
import { getCanonical } from '@/lib/seo/canonical';
import { SITE_BRAND } from '@/lib/seo/siteTitle';

const homeCanonical = getCanonical('/');

/** Page segment for root `title.template` (`ScholarshipTop | %s`). */
const homeTitleSegment = 'Get Matched With Scholarships in 2 Minutes';

const homeDescription =
  `${SITE_BRAND} — answer a few quick questions and find scholarships you can apply for today.`;

const homeOgTitle = `${SITE_BRAND} | ${homeTitleSegment}`;

/** Canonical URL for `/` only (sub-routes define their own). */
export const metadata: Metadata = {
  title: homeTitleSegment,
  description: homeDescription,
  alternates: {
    canonical: homeCanonical
  },
  openGraph: {
    title: homeOgTitle,
    description: homeDescription,
    url: homeCanonical,
    type: 'website',
    siteName: SITE_BRAND,
    locale: 'en_US',
    images: [
      {
        url: '/logo-preview.png',
        width: 1200,
        height: 630,
        alt: `${SITE_BRAND} Logo`
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: homeOgTitle,
    description: homeDescription,
    images: ['/logo-preview.png']
  }
};

/** Align with `/resources` and `/essays` index revalidation for hub content. */
export const revalidate = 300;

const container = 'mx-auto w-full max-w-7xl';

const homeSectionPadX =
  'pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] sm:pl-6 sm:pr-6';

const h2Section =
  'text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl lg:text-[2.35rem] lg:leading-[1.15] xl:text-[2.5rem]';

const ledeMuted =
  'text-lg leading-relaxed text-gray-600 sm:text-xl sm:leading-relaxed';

const homeY = {
  hero: 'pt-10 pb-8 sm:pt-12 sm:pb-9 lg:pt-14 lg:pb-10',
  strip: 'py-8 sm:py-9 lg:py-10',
  block: 'py-7 sm:py-8 lg:py-9',
  essay: 'pt-7 pb-7 sm:pt-8 sm:pb-8 lg:py-9'
} as const;

const worksListIconClass = 'mt-1 h-6 w-6 shrink-0 text-orange-500';

const dataStandardItems = [
  'Official source status',
  'Last reviewed or review status',
  'Deadline clarity',
  'Eligibility clarity',
  'Application effort',
  'Missing-data flags'
] as const;

const audienceItems = [
  'International students comparing country rules',
  'High school seniors building a realistic shortlist',
  'Undergraduate and graduate students checking fit',
  'Students who want to avoid unclear or outdated listings',
  'Applicants who need deadlines, documents, and next steps in one place'
] as const;

function HomeScholarshipIntelligenceSection() {
  return (
    <section
      className={`border-b border-gray-100 bg-gray-50 ${homeY.block} ${homeSectionPadX}`}
      aria-labelledby="home-intelligence-heading"
    >
      <div className={`${container} grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] lg:gap-8`}>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">
            Scholarship intelligence
          </p>
          <h2
            id="home-intelligence-heading"
            className="mt-3 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl"
          >
            What ScholarshipTop adds on top of raw listings
          </h2>
          <p className="mt-4 text-base leading-relaxed text-gray-600">
            We organize scholarships by fit, deadline, requirements, award value,
            source status, and application effort so students can decide what is
            worth checking before they apply.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href="/scholarship-verification-methodology"
              className="inline-flex min-h-10 items-center justify-center rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
            >
              How we verify scholarships
            </Link>
            <Link
              href="/how-we-rank-scholarships"
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 transition hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
            >
              How recommendations work
            </Link>
          </div>
        </div>

        <div className="grid gap-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold tracking-tight text-gray-900">
              Scholarship data standards
            </h3>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {dataStandardItems.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm leading-6 text-gray-600">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold tracking-tight text-gray-900">
              Who ScholarshipTop is for
            </h3>
            <ul className="mt-4 space-y-2">
              {audienceItems.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm leading-6 text-gray-600">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function HomeStatsSkeleton({
  sectionPadX,
  sectionY
}: {
  sectionPadX: string;
  sectionY: string;
}) {
  return (
    <section
      className={`border-b border-gray-100 bg-gray-50 ${sectionY} ${sectionPadX}`}
      aria-busy="true"
      aria-hidden
    >
      <div className={`${container} space-y-4`}>
        <div className="h-40 w-full animate-pulse rounded-xl bg-gray-100" />
      </div>
    </section>
  );
}

function HomeResourcesSkeleton() {
  return (
    <section
      className="border-b border-gray-100 bg-gray-50 pt-8 pb-[max(2.75rem,calc(env(safe-area-inset-bottom,0px)+1.25rem))] sm:pt-9 sm:pb-11 lg:pt-10 lg:pb-12"
      aria-busy="true"
      aria-hidden
    >
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        <div className="mx-auto mb-8 h-8 max-w-sm animate-pulse rounded-lg bg-gray-100 sm:mb-10" />
        <div className="h-48 w-full animate-pulse rounded-xl bg-gray-100 sm:h-52" />
      </div>
    </section>
  );
}

/** Home-only bottom stack: final CTA on `/` (footer is global in root layout). */
export default function HomePage() {
  return (
    <>
      <HomePageJsonLd />

      <div className="bg-white text-gray-900 antialiased">
        <section
          className={`border-b border-gray-100 bg-white ${homeY.hero} ${homeSectionPadX}`}
        >
          <div className={`${container} max-w-4xl text-center`}>
            <h1 className="text-pretty text-[clamp(1.8125rem,5.25vw+0.8rem,2.25rem)] font-bold leading-[1.08] tracking-tight text-gray-900 opacity-0 animate-home-fade-up sm:text-5xl sm:leading-[1.06] lg:text-[3rem] lg:leading-[1.05]">
              Get matched with scholarships in 2 minutes
            </h1>
            <p
              className={`mx-auto mt-5 max-w-2xl text-pretty opacity-0 animate-home-fade-up-delay-1 sm:mt-6 ${ledeMuted}`}
            >
              Answer a few quick questions and find scholarships you can apply for today
            </p>

            <div className="mx-auto mt-8 flex w-full max-w-lg justify-center opacity-0 animate-home-fade-up-delay-2 sm:mt-9 sm:max-w-2xl">
              <HomePrimaryCtaClient
                id="onboarding-cta"
                className={`${homePrimaryCtaClass} w-full sm:w-auto sm:min-w-[220px]`}
              >
                Find My Scholarships
              </HomePrimaryCtaClient>
            </div>
            <p
              className={`mx-auto mt-5 max-w-2xl text-pretty text-sm leading-relaxed text-gray-500 opacity-0 animate-home-fade-up-delay-2 sm:mt-6 sm:text-[0.9375rem]`}
            >
              Verified listings • Updated regularly • Official-source application links. Takes less
              than a minute to get started.
            </p>
          </div>
        </section>

        <Suspense
          fallback={
            <HomeStatsSkeleton
              sectionPadX={homeSectionPadX}
              sectionY={homeY.block}
            />
          }
        >
          <HomeStatsAsync
            sectionPadX={homeSectionPadX}
            sectionY={homeY.block}
          />
        </Suspense>

        <HomeTrustStrip sectionPadX={homeSectionPadX} sectionY={homeY.strip} />

        <section
          className={`border-b border-gray-100 bg-white ${homeY.block} ${homeSectionPadX}`}
        >
          <div className={`${container} max-w-5xl`}>
            <h2 className={`text-center text-pretty ${h2Section}`}>
              How ScholarshipTop works
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-pretty text-lg leading-relaxed text-gray-600 sm:mt-5 sm:text-xl sm:leading-relaxed">
              A simpler workflow for finding scholarships worth your time.
            </p>
            <div className="mx-auto mt-8 grid max-w-lg gap-6 sm:mt-10 sm:max-w-none sm:grid-cols-3 sm:gap-6 lg:gap-7">
              {[
                {
                  step: '1',
                  title: 'Create your profile',
                  text: 'Tell us about your academic level, background, interests, and goals.'
                },
                {
                  step: '2',
                  title: 'See better-fit matches',
                  text: 'We surface scholarships that are more relevant to your profile and filters.'
                },
                {
                  step: '3',
                  title: 'Track and apply',
                  text: 'Save opportunities, watch deadlines, and apply through official provider websites.'
                }
              ].map((item) => (
                <div
                  key={item.step}
                  className="rounded-2xl border border-gray-200 bg-gray-50/80 p-7 text-center shadow-[0_4px_20px_-10px_rgba(15,23,42,0.07)] transition hover:border-gray-300 hover:shadow-[0_10px_32px_-18px_rgba(15,23,42,0.09)] sm:p-8 sm:text-left"
                >
                  <div
                    className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border-2 border-gray-900 bg-white text-sm font-semibold tabular-nums leading-none text-gray-900 sm:mx-0"
                    aria-hidden
                  >
                    {item.step}
                  </div>
                  <h3 className="mt-5 text-lg font-semibold leading-snug text-pretty text-gray-900 sm:text-[1.125rem]">
                    {item.title}
                  </h3>
                  <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-pretty text-gray-600 sm:text-base sm:leading-relaxed">
                    {item.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <HomeWhatWeVerify sectionPadX={homeSectionPadX} sectionY={homeY.block} />

        <HomeScholarshipIntelligenceSection />

        <section
          className={`border-b border-gray-100 bg-gray-50 ${homeY.block} ${homeSectionPadX}`}
        >
          <ScrollRevealWrapper
            className={`${container} flex flex-col items-stretch gap-9 lg:flex-row lg:items-center lg:gap-12 xl:gap-16`}
            visibleClassName="animate-pain-fade-up"
            hiddenClassName="opacity-0"
            threshold={0.12}
            rootMargin="0px 0px -40px 0px"
          >
            <div className="min-w-0 flex-1 text-center lg:max-w-2xl lg:text-left">
              <h2 className={`text-pretty ${h2Section}`}>
                Why students use ScholarshipTop
              </h2>
              <div
                className={
                  'mt-7 space-y-4 text-pretty text-lg leading-relaxed text-gray-600 sm:mt-8 sm:text-xl sm:leading-relaxed'
                }
              >
                <p>Thousands of listings — most won&apos;t match your profile.</p>
                <p>
                  Hours go into searching and filtering; strong fits still get missed.
                </p>
                <p>Deadlines slip. Good options disappear.</p>
              </div>
              <p className="mt-9 text-center text-2xl font-bold tracking-tight text-gray-900 sm:mt-10 sm:text-3xl">
                We make it simple.
              </p>
              <div className="mt-9 flex w-full justify-center sm:mt-10">
                <HomePrimaryCtaClient
                  className={`${homePrimaryCtaClass} w-full max-w-md sm:w-auto sm:min-w-[200px]`}
                >
                  Find My Scholarships
                </HomePrimaryCtaClient>
              </div>
            </div>
            <figure className="mx-auto w-full max-w-xl shrink-0 lg:mx-0 lg:max-w-[min(600px,50%)]">
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-gray-200 bg-gray-100 shadow-[0_28px_64px_-28px_rgba(15,23,42,0.3)] ring-1 ring-gray-200/80">
                <Image
                  src="/hero-college-pain-solution.png"
                  alt="Student organizing scholarship search with a clearer path forward"
                  fill
                  className="object-cover object-center"
                  sizes="(max-width: 1024px) min(100vw,640px), min(600px,50vw)"
                />
              </div>
            </figure>
          </ScrollRevealWrapper>
        </section>

        <section
          className={`border-b border-gray-100 bg-white ${homeY.block} ${homeSectionPadX}`}
        >
          <div className={container}>
            <ScrollRevealWrapper
              className="grid grid-cols-1 items-stretch gap-9 lg:grid-cols-2 lg:gap-14 xl:gap-20 group/works"
              threshold={0.1}
              rootMargin="0px 0px -48px 0px"
            >
              <div className="order-2 flex min-h-0 min-w-0 opacity-0 group-data-[revealed=true]/works:animate-works-mockup-in lg:order-1">
                <ScholarshipPreviewList />
              </div>
              <div className="order-1 flex min-h-0 min-w-0 flex-col items-center text-center opacity-0 group-data-[revealed=true]/works:animate-works-title-in lg:order-2 lg:items-stretch lg:text-left">
                <h2 className={`text-pretty ${h2Section}`}>Your scholarship workflow</h2>
                <p className="mt-4 max-w-lg text-pretty text-lg leading-relaxed text-gray-600 sm:mt-5 sm:text-xl sm:leading-relaxed lg:max-w-none">
                  A focused dashboard preview — matches, saves, and signals in one place so
                  you can move from discovery to application without tab chaos.
                </p>
                <ul className="mt-6 w-full max-w-lg space-y-4 text-left text-lg text-gray-600 sm:mt-7 sm:space-y-5 sm:text-xl lg:max-w-none">
                  <li className="flex gap-4">
                    <Check
                      className={worksListIconClass}
                      strokeWidth={2}
                      aria-hidden
                    />
                    <span className="leading-snug">
                      See scholarships that match your profile
                    </span>
                  </li>
                  <li className="flex gap-4">
                    <Heart
                      className={worksListIconClass}
                      strokeWidth={2}
                      aria-hidden
                    />
                    <span className="leading-snug">Save the ones you like</span>
                  </li>
                  <li className="flex gap-4">
                    <Layers
                      className={worksListIconClass}
                      strokeWidth={2}
                      aria-hidden
                    />
                    <span className="leading-snug">Ignore what doesn&apos;t fit</span>
                  </li>
                  <li className="flex gap-4">
                    <BookOpen
                      className={worksListIconClass}
                      strokeWidth={2}
                      aria-hidden
                    />
                    <span className="leading-snug">Stay focused on what matters</span>
                  </li>
                </ul>
                <div className="mt-9 flex w-full justify-center sm:mt-10">
                  <HomePrimaryCtaClient
                    className={`${homePrimaryCtaClass} w-full max-w-md sm:w-auto sm:min-w-[200px]`}
                  >
                    Find My Scholarships
                  </HomePrimaryCtaClient>
                </div>
              </div>
            </ScrollRevealWrapper>
          </div>
        </section>

        <section
          className={`border-b border-gray-100 bg-gray-50 ${homeY.block} ${homeSectionPadX}`}
        >
          <div className={`${container} max-w-3xl text-center`}>
            <h2 className={`text-pretty ${h2Section}`}>Why students upgrade</h2>
            <p className="mx-auto mt-4 max-w-2xl text-pretty text-lg leading-relaxed text-gray-600 sm:mt-5 sm:text-xl sm:leading-relaxed">
              Go deeper with advanced matching, precision filters, saved views, and full
              essay support — built for students who want a serious, repeatable application
              pipeline.
            </p>
            <Link
              href="/subscription"
              className={`${homePremiumCtaClass} mx-auto mt-9 inline-flex sm:mt-10`}
            >
              Explore Premium
            </Link>
          </div>
        </section>

        <section
          className={`border-b border-gray-100 bg-white ${homeY.block} ${homeSectionPadX}`}
        >
          <div className={container}>
            <FeaturedBrandScholarshipsSection />
          </div>
        </section>

        <HomeGuidedEssaySupport sectionPadX={homeSectionPadX} sectionY={homeY.essay} />
      </div>

      <Suspense fallback={<HomeResourcesSkeleton />}>
        <HomeResourcesAsync />
      </Suspense>
      <HomeFinalCta />
    </>
  );
}
