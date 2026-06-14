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
import type { HomePageCopy } from '@/lib/i18n/homePageCopy';
import { getHomePageCopy } from '@/lib/i18n/homePageCopy';
import {
  hrefForLocalizedUi,
  hrefForLocalizedUiRequired,
  type LocalizedUiLocale
} from '@/lib/i18n/localizedHref';

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

function HomeScholarshipIntelligenceSection({
  copy,
  hrefForPath
}: {
  copy: HomePageCopy;
  hrefForPath: (path: string) => string;
}) {
  return (
    <section
      className={`border-b border-gray-100 bg-gray-50 ${homeY.block} ${homeSectionPadX}`}
      aria-labelledby="home-intelligence-heading"
    >
      <div
        className={`${container} grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] lg:gap-8`}
      >
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">
            {copy.intelligenceEyebrow}
          </p>
          <h2
            id="home-intelligence-heading"
            className="mt-3 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl"
          >
            {copy.intelligenceTitle}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-gray-600">
            {copy.intelligenceBody}
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href={hrefForPath('/scholarship-verification-methodology')}
              className="inline-flex min-h-10 items-center justify-center rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
            >
              {copy.verifyCta}
            </Link>
            <Link
              href={hrefForPath('/how-we-rank-scholarships')}
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 transition hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
            >
              {copy.rankCta}
            </Link>
          </div>
        </div>

        <div className="grid gap-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold tracking-tight text-gray-900">
              {copy.dataStandardsTitle}
            </h3>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {copy.dataStandardItems.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 text-sm leading-6 text-gray-600"
                >
                  <Check
                    className="mt-0.5 h-4 w-4 shrink-0 text-orange-500"
                    aria-hidden
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold tracking-tight text-gray-900">
              {copy.audienceTitle}
            </h3>
            <ul className="mt-4 space-y-2">
              {copy.audienceItems.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 text-sm leading-6 text-gray-600"
                >
                  <Check
                    className="mt-0.5 h-4 w-4 shrink-0 text-orange-500"
                    aria-hidden
                  />
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

export type HomePageContentProps = {
  locale?: LocalizedUiLocale;
  copy?: HomePageCopy;
};

/** Home-only bottom stack: final CTA on `/` (footer is global in root layout). */
export function HomePageContent({
  locale = 'en',
  copy: copyProp
}: HomePageContentProps) {
  const copy = copyProp ?? getHomePageCopy(locale);
  const hrefForPath = (path: string) => hrefForLocalizedUi(locale, path);
  const premiumHref = hrefForPath('/subscription');

  return (
    <>
      <HomePageJsonLd />

      <div className="bg-white text-gray-900 antialiased">
        <section
          className={`border-b border-gray-100 bg-white ${homeY.hero} ${homeSectionPadX}`}
        >
          <div className={`${container} max-w-4xl text-center`}>
            <h1 className="text-pretty text-[clamp(1.8125rem,5.25vw+0.8rem,2.25rem)] font-bold leading-[1.08] tracking-tight text-gray-900 sm:text-5xl sm:leading-[1.06] lg:text-[3rem] lg:leading-[1.05]">
              {copy.h1}
            </h1>
            <p
              className={`mx-auto mt-5 max-w-2xl text-pretty sm:mt-6 ${ledeMuted}`}
            >
              {copy.heroSubtext}
            </p>

            <div className="mx-auto mt-8 flex w-full max-w-lg justify-center sm:mt-9 sm:max-w-2xl">
              <HomePrimaryCtaClient
                id="onboarding-cta"
                locale={locale}
                className={`${homePrimaryCtaClass} w-full sm:w-auto sm:min-w-[220px]`}
              >
                {copy.ctaFind}
              </HomePrimaryCtaClient>
            </div>
            <p
              className={`mx-auto mt-5 max-w-2xl text-pretty text-sm leading-relaxed text-gray-500 sm:mt-6 sm:text-[0.9375rem]`}
            >
              {copy.heroTrustLine}
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
            copy={copy.internationalGrants}
            getScholarshipsBaseHref={hrefForLocalizedUiRequired(
              locale,
              copy.internationalGrants.getScholarshipsHref
            )}
          />
        </Suspense>

        <HomeTrustStrip
          sectionPadX={homeSectionPadX}
          sectionY={homeY.strip}
          copy={copy.trustStrip}
          hrefForPath={hrefForPath}
        />

        <section
          className={`border-b border-gray-100 bg-white ${homeY.block} ${homeSectionPadX}`}
        >
          <div className={`${container} max-w-5xl`}>
            <h2 className={`text-center text-pretty ${h2Section}`}>
              {copy.howWorksTitle}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-pretty text-lg leading-relaxed text-gray-600 sm:mt-5 sm:text-xl sm:leading-relaxed">
              {copy.howWorksSubtext}
            </p>
            <div className="mx-auto mt-8 grid max-w-lg gap-6 sm:mt-10 sm:max-w-none sm:grid-cols-3 sm:gap-6 lg:gap-7">
              {copy.steps.map((item) => (
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

        <HomeWhatWeVerify
          sectionPadX={homeSectionPadX}
          sectionY={homeY.block}
          copy={copy.whatWeVerify}
          hrefForPath={(path) => hrefForLocalizedUiRequired(locale, path)}
        />

        <HomeScholarshipIntelligenceSection
          copy={copy}
          hrefForPath={(path) => hrefForLocalizedUiRequired(locale, path)}
        />

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
                {copy.whyStudentsTitle}
              </h2>
              <div
                className={
                  'mt-7 space-y-4 text-pretty text-lg leading-relaxed text-gray-600 sm:mt-8 sm:text-xl sm:leading-relaxed'
                }
              >
                <p>{copy.whyStudentsP1}</p>
                <p>{copy.whyStudentsP2}</p>
                <p>{copy.whyStudentsP3}</p>
              </div>
              <p className="mt-9 text-center text-2xl font-bold tracking-tight text-gray-900 sm:mt-10 sm:text-3xl">
                {copy.whyStudentsSimple}
              </p>
              <div className="mt-9 flex w-full justify-center sm:mt-10">
                <HomePrimaryCtaClient
                  locale={locale}
                  className={`${homePrimaryCtaClass} w-full max-w-md sm:w-auto sm:min-w-[200px]`}
                >
                  {copy.ctaFind}
                </HomePrimaryCtaClient>
              </div>
            </div>
            <figure className="mx-auto w-full max-w-xl shrink-0 lg:mx-0 lg:max-w-[min(600px,50%)]">
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-gray-200 bg-gray-100 shadow-[0_28px_64px_-28px_rgba(15,23,42,0.3)] ring-1 ring-gray-200/80">
                <Image
                  src="/hero-college-pain-solution.png"
                  alt={copy.heroImageAlt}
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
                <ScholarshipPreviewList locale={locale} />
              </div>
              <div className="order-1 flex min-h-0 min-w-0 flex-col items-center text-center opacity-0 group-data-[revealed=true]/works:animate-works-title-in lg:order-2 lg:items-stretch lg:text-left">
                <h2 className={`text-pretty ${h2Section}`}>
                  {copy.workflowTitle}
                </h2>
                <p className="mt-4 max-w-lg text-pretty text-lg leading-relaxed text-gray-600 sm:mt-5 sm:text-xl sm:leading-relaxed lg:max-w-none">
                  {copy.workflowSubtext}
                </p>
                <ul className="mt-6 w-full max-w-lg space-y-4 text-left text-lg text-gray-600 sm:mt-7 sm:space-y-5 sm:text-xl lg:max-w-none">
                  {copy.workflowBullets.map((bullet, index) => {
                    const Icon =
                      [Check, Heart, Layers, BookOpen][index] ?? Check;
                    return (
                      <li key={bullet} className="flex gap-4">
                        <Icon
                          className={worksListIconClass}
                          strokeWidth={2}
                          aria-hidden
                        />
                        <span className="leading-snug">{bullet}</span>
                      </li>
                    );
                  })}
                </ul>
                <div className="mt-9 flex w-full justify-center sm:mt-10">
                  <HomePrimaryCtaClient
                    locale={locale}
                    className={`${homePrimaryCtaClass} w-full max-w-md sm:w-auto sm:min-w-[200px]`}
                  >
                    {copy.ctaFind}
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
            <h2 className={`text-pretty ${h2Section}`}>{copy.upgradeTitle}</h2>
            <p className="mx-auto mt-4 max-w-2xl text-pretty text-lg leading-relaxed text-gray-600 sm:mt-5 sm:text-xl sm:leading-relaxed">
              {copy.upgradeSubtext}
            </p>
            {premiumHref ? (
              <Link
                href={premiumHref}
                className={`${homePremiumCtaClass} mx-auto mt-9 inline-flex sm:mt-10`}
              >
                {copy.explorePremium}
              </Link>
            ) : null}
          </div>
        </section>

        <HomeGuidedEssaySupport
          sectionPadX={homeSectionPadX}
          sectionY={homeY.essay}
          copy={copy.guidedEssay}
          essayLinkHref={hrefForPath('/essays') ?? undefined}
        />
      </div>

      {/*
        DB-backed resources/essays carousel is English-only long-tail content; on ES/FR
        we hide it instead of surfacing untranslated cards. Localized hubs already link
        from nav + final CTA, so users still have a path into the localized funnel.
      */}
      {locale === 'en' ? (
        <Suspense fallback={<HomeResourcesSkeleton />}>
          <HomeResourcesAsync
            copy={copy.featuredResources}
            resourcesLinkHref={hrefForLocalizedUiRequired(
              locale,
              copy.featuredResources.resourcesHref
            )}
            essaysLinkHref={hrefForLocalizedUiRequired(
              locale,
              copy.featuredResources.essaysHref
            )}
          />
        </Suspense>
      ) : null}
      {/*
        Brand scholarship cards link to English-only DB detail pages
        (`/scholarships/<slug>`). Keep the catalog rail after guidance/resources
        so it supports discovery without outranking the primary match workflow.
      */}
      {locale === 'en' ? (
        <section
          className={`border-b border-gray-100 bg-white [content-visibility:auto] [contain-intrinsic-size:auto_520px] ${homeY.block} ${homeSectionPadX}`}
        >
          <div className={container}>
            <FeaturedBrandScholarshipsSection
              copy={copy.featuredBrands}
              locale={locale}
            />
          </div>
        </section>
      ) : null}
      <HomeFinalCta
        copy={copy.finalCta}
        ctaLabel={copy.ctaFind}
        locale={locale}
      />
    </>
  );
}
