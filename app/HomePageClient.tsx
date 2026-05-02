'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { BookOpen, Check, Heart, Layers } from 'lucide-react';

import { FeaturedBrandScholarshipsSection } from '@/components/home/FeaturedBrandScholarshipsSection';
import HomeGuidedEssaySupport from '@/components/home/HomeGuidedEssaySupport';
import HomeInternationalGrantsUsp from '@/components/home/HomeInternationalGrantsUsp';
import HomePrimaryCtaClient from '@/components/home/HomePrimaryCtaClient';
import {
  homePremiumCtaClass,
  homePrimaryCtaClass
} from '@/components/home/homeMarketingCtaClasses';
import HomeTrustStrip from '@/components/home/HomeTrustStrip';
import HomeWhatWeVerify from '@/components/home/HomeWhatWeVerify';
import SuccessStoriesCarousel from '@/components/home/SuccessStoriesCarousel';
import ScholarshipPreviewList from '@/components/scholarships/ScholarshipPreviewList';
import type {
  HomeScholarshipCatalogStats,
  ScholarshipListMeta
} from '@/lib/scholarships/scholarshipListServer';

const container = 'mx-auto w-full max-w-7xl';

export type HomeTopApplicantCountry = ScholarshipListMeta['countryCounts'][number];

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

export default function HomePageClient({
  topApplicantCountries = [],
  scholarshipCatalogStats = null
}: {
  topApplicantCountries?: HomeTopApplicantCountry[];
  scholarshipCatalogStats?: HomeScholarshipCatalogStats | null;
}) {
  const painSectionRef = useRef<HTMLDivElement>(null);
  const [painSectionVisible, setPainSectionVisible] = useState(false);
  const worksSectionRef = useRef<HTMLDivElement>(null);
  const [worksSectionVisible, setWorksSectionVisible] = useState(false);

  useEffect(() => {
    const el = painSectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setPainSectionVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const el = worksSectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setWorksSectionVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -48px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="bg-white text-gray-900 antialiased">
      {/* Hero */}
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

      <HomeInternationalGrantsUsp
        sectionPadX={homeSectionPadX}
        sectionY={homeY.block}
        topApplicantCountries={topApplicantCountries}
        catalogStats={scholarshipCatalogStats}
      />

      <HomeTrustStrip sectionPadX={homeSectionPadX} sectionY={homeY.strip} />

      {/* How it works */}
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

      {/* Why students use ScholarshipTop */}
      <section
        ref={painSectionRef}
        className={`border-b border-gray-100 bg-gray-50 ${homeY.block} ${homeSectionPadX}`}
      >
        <div
          className={`${container} flex flex-col items-stretch gap-9 lg:flex-row lg:items-center lg:gap-12 xl:gap-16 ${
            painSectionVisible ? 'animate-pain-fade-up' : 'opacity-0'
          }`}
        >
          <div className="min-w-0 flex-1 text-center lg:max-w-2xl lg:text-left">
            <h2 className={`text-pretty ${h2Section}`}>Why students use ScholarshipTop</h2>
            <div
              className={`mt-7 space-y-4 text-pretty text-lg leading-relaxed text-gray-600 sm:mt-8 sm:text-xl sm:leading-relaxed`}
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
        </div>
      </section>

      {/* Dashboard / workflow preview */}
      <section
        ref={worksSectionRef}
        className={`border-b border-gray-100 bg-white ${homeY.block} ${homeSectionPadX}`}
      >
        <div className={container}>
          <div className="grid grid-cols-1 items-stretch gap-9 lg:grid-cols-2 lg:gap-14 xl:gap-20">
            <div
              className={`order-2 flex min-h-0 min-w-0 lg:order-1 ${
                worksSectionVisible ? 'animate-works-mockup-in' : 'opacity-0'
              }`}
            >
              <ScholarshipPreviewList />
            </div>
            <div
              className={`order-1 flex min-h-0 min-w-0 flex-col items-center text-center lg:order-2 lg:items-stretch lg:text-left ${
                worksSectionVisible ? 'animate-works-title-in' : 'opacity-0'
              }`}
            >
              <h2 className={`text-pretty ${h2Section}`}>Your scholarship workflow</h2>
              <p className="mt-4 max-w-lg text-pretty text-lg leading-relaxed text-gray-600 sm:mt-5 sm:text-xl sm:leading-relaxed lg:max-w-none">
                A focused dashboard preview — matches, saves, and signals in one place so you can
                move from discovery to application without tab chaos.
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
          </div>
        </div>
      </section>

      {/* Premium value */}
      <section
        className={`border-b border-gray-100 bg-gray-50 ${homeY.block} ${homeSectionPadX}`}
      >
        <div className={`${container} max-w-3xl text-center`}>
          <h2 className={`text-pretty ${h2Section}`}>Why students upgrade</h2>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-lg leading-relaxed text-gray-600 sm:mt-5 sm:text-xl sm:leading-relaxed">
            Go deeper with advanced matching, precision filters, saved views, and full essay support —
            built for students who want a serious, repeatable application pipeline.
          </p>
          <Link href="/subscription" className={`${homePremiumCtaClass} mx-auto mt-9 inline-flex sm:mt-10`}>
            Explore Premium
          </Link>
        </div>
      </section>

      {/* Catalog examples */}
      <section
        className={`border-b border-gray-100 bg-white ${homeY.block} ${homeSectionPadX}`}
      >
        <div className={container}>
          <FeaturedBrandScholarshipsSection />
        </div>
      </section>

      {/* Short testimonials */}
      <section
        className={`border-b border-gray-100 bg-gray-50 ${homeY.block} ${homeSectionPadX}`}
      >
        <div className={container}>
          <SuccessStoriesCarousel shortTestimonials />
        </div>
      </section>

      <HomeGuidedEssaySupport sectionPadX={homeSectionPadX} sectionY={homeY.essay} />
    </div>
  );
}
