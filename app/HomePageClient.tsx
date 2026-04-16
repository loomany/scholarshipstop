'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  BookOpen,
  Check,
  Clock,
  Heart,
  Layers,
  LayoutGrid,
  Sparkles,
  Timer,
  TrendingUp,
  Zap
} from 'lucide-react';

import { AiMentorHowItWorksSection } from '@/components/essay/AiMentorHowItWorksSection';
import { FeaturedBrandScholarshipsSection } from '@/components/home/FeaturedBrandScholarshipsSection';
import HomePrimaryCtaClient from '@/components/home/HomePrimaryCtaClient';
import ScholarshipPreviewList from '@/components/scholarships/ScholarshipPreviewList';

/** Primary CTA — black solid, used for secondary sections */
const primaryCtaClass =
  'inline-flex w-full max-w-lg cursor-pointer items-center justify-center rounded-2xl bg-black px-8 py-4 text-center text-lg font-semibold text-white shadow-[0_6px_20px_-6px_rgba(0,0,0,0.45)] transition duration-200 ease-out hover:scale-[1.02] hover:bg-zinc-900 hover:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.45)] active:scale-[0.99] sm:py-[1.125rem] sm:text-xl';

/** Hero focal CTA — stronger depth for conversion */
const heroPrimaryCtaClass =
  'inline-flex w-full cursor-pointer items-center justify-center rounded-2xl bg-black px-8 py-4 text-center text-lg font-semibold text-white shadow-[0_10px_36px_-10px_rgba(0,0,0,0.55)] transition duration-200 ease-out hover:scale-[1.03] hover:bg-zinc-900 hover:shadow-[0_18px_48px_-12px_rgba(0,0,0,0.48)] active:scale-[0.99] sm:py-[1.25rem] sm:text-xl';

const container = 'mx-auto w-full max-w-7xl';

/** ~430px-style rhythm on 320–430px phones + safe-area (notch / home indicator) */
const homeSectionPadX =
  'pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] sm:pl-6 sm:pr-6';

const h2Section =
  'text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl lg:text-[2.35rem] lg:leading-[1.15] xl:text-[2.5rem]';

/** Benefit cards block — slightly tighter line-height for the long headline */
const h2EasyApplySection =
  'text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl lg:text-[2.35rem] xl:text-[2.5rem] leading-[1.12] sm:leading-[1.1] lg:leading-[1.12] xl:leading-[1.11]';

const ledeMuted =
  'text-lg leading-relaxed text-gray-600 sm:text-xl sm:leading-relaxed';

/** Shared vertical padding between homepage sections (top + bottom) */
const homeY = {
  hero: 'pt-10 pb-5 sm:pt-12 sm:pb-6 lg:pt-14 lg:pb-7',
  featured: 'pt-6 pb-6 sm:pt-7 sm:pb-7',
  essay: 'pt-3 pb-7 sm:pt-4 sm:pb-8 lg:pb-9',
  valueStrip: 'py-3.5 sm:py-4',
  block: 'py-7 sm:py-8 lg:py-9'
} as const;

export default function HomePageClient() {
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

  const listIconClass = 'mt-1 h-6 w-6 shrink-0 text-gray-500';

  /** “Everything in one place” — uniform orange outline icons (same as book accent). */
  const worksListIconClass = 'mt-1 h-6 w-6 shrink-0 text-orange-500';

  return (
    <div className="bg-white text-gray-900 antialiased">
      {/* 1. Hero */}
      <section
        className={`border-b border-gray-100 bg-white ${homeY.hero} ${homeSectionPadX}`}
      >
        <div className={`${container} max-w-4xl text-center`}>
          <h1 className="text-pretty text-[clamp(1.8125rem,5.25vw+0.8rem,2.25rem)] font-bold leading-[1.08] tracking-tight text-gray-900 opacity-0 animate-home-fade-up sm:text-5xl sm:leading-[1.06] lg:text-[3rem] lg:leading-[1.05]">
            Find scholarships{' '}
            <br className="sm:hidden" aria-hidden />
            that actually fit you
          </h1>
          <p
            className={`mx-auto mt-5 max-w-2xl text-pretty opacity-0 animate-home-fade-up-delay-1 sm:mt-6 ${ledeMuted}`}
          >
            Stop wasting time on irrelevant opportunities.{' '}
            <br className="sm:hidden" aria-hidden />
            Discover scholarships tailored to your profile and apply smarter.
          </p>
          <div className="mt-4 flex justify-center opacity-0 animate-home-fade-up-delay-1 sm:mt-5">
            <div className="inline-flex items-center gap-2.5 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-800">
              <Check
                className="h-4 w-4 shrink-0 text-emerald-600 sm:h-[1.125rem] sm:w-[1.125rem]"
                strokeWidth={2.5}
                aria-hidden
              />
              <span>Verified scholarships • Updated regularly</span>
            </div>
          </div>

          <div className="mx-auto mt-8 w-full max-w-md opacity-0 animate-home-fade-up-delay-2 sm:mt-9">
            <div className="rounded-2xl border border-gray-200 bg-white px-6 py-6 text-center shadow-[0_12px_40px_-16px_rgba(15,23,42,0.14)] ring-1 ring-gray-100 sm:px-8 sm:py-7">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-gray-400">
                Quick start
              </p>
              <HomePrimaryCtaClient
                id="onboarding-cta"
                className={`${heroPrimaryCtaClass} mt-5`}
              >
                Find my matches →
              </HomePrimaryCtaClient>
            </div>
          </div>
        </div>
      </section>

      {/* Featured brand scholarships — trust strip */}
      <section
        className={`border-b border-gray-100 bg-gray-50/80 ${homeY.featured} ${homeSectionPadX}`}
      >
        <div className={container}>
          <FeaturedBrandScholarshipsSection />
        </div>
      </section>

      {/* 1b. AI Essay Mentor — how it works (same block as /essay) */}
      <section
        className={`border-b border-gray-100 bg-white ${homeY.essay} ${homeSectionPadX}`}
      >
        <div className={container}>
          <AiMentorHowItWorksSection className="mt-0" />
        </div>
      </section>

      {/* 2. Value strip */}
      <section
        className={`border-y border-gray-200/90 bg-gray-50 ${homeY.valueStrip} ${homeSectionPadX}`}
      >
        <div className={container}>
          <div className="grid grid-cols-2 gap-x-5 gap-y-5 sm:grid-cols-4 sm:gap-x-6 sm:gap-y-5 lg:gap-x-10">
            {[
              { icon: LayoutGrid, label: 'Thousands of scholarships' },
              { icon: Clock, label: 'Updated frequently' },
              { icon: Sparkles, label: 'Personalized matches' },
              { icon: Zap, label: 'Easy application process' }
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-2.5 text-center sm:items-start sm:gap-2.5 sm:text-left"
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center text-gray-900"
                  aria-hidden
                >
                  <Icon
                    className="h-7 w-7"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                </span>
                <p className="text-[0.9375rem] font-medium leading-snug text-pretty text-gray-900 sm:text-base sm:leading-[1.4]">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Problem */}
      <section
        ref={painSectionRef}
        className={`border-b border-gray-100 bg-white ${homeY.block} ${homeSectionPadX}`}
      >
        <div
          className={`${container} flex flex-col items-stretch gap-9 lg:flex-row lg:items-center lg:gap-12 xl:gap-16 ${
            painSectionVisible ? 'animate-pain-fade-up' : 'opacity-0'
          }`}
        >
          <div className="min-w-0 flex-1 text-center lg:max-w-2xl lg:text-left">
            <h2 className={`text-pretty ${h2Section}`}>
              Finding the right scholarships{' '}
              <br className="lg:hidden" aria-hidden />
              shouldn&apos;t feel overwhelming
            </h2>
            <div
              className={`mt-7 space-y-4 text-pretty text-lg leading-relaxed text-gray-600 sm:mt-8 sm:text-xl sm:leading-relaxed`}
            >
              <p>Thousands of listings — most won&apos;t match your profile.</p>
              <p>
                Hours go into searching and filtering; strong fits still get
                missed.
              </p>
              <p>Deadlines slip. Good options disappear.</p>
            </div>
            <p className="mt-9 text-center text-2xl font-bold tracking-tight text-gray-900 sm:mt-10 sm:text-3xl lg:text-left">
              We make it simple.
            </p>
            <HomePrimaryCtaClient
              className={`${primaryCtaClass} mt-9 w-full max-w-none sm:mt-10 sm:w-auto sm:max-w-lg`}
            >
              Get my matches →
            </HomePrimaryCtaClient>
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

      {/* 4. Product demo */}
      <section
        ref={worksSectionRef}
        className={`border-b border-gray-100 bg-gray-50 ${homeY.block} ${homeSectionPadX}`}
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
              <h2 className={`text-pretty ${h2Section}`}>Everything in one place</h2>
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
                  <span className="leading-snug">
                    Ignore what doesn&apos;t fit
                  </span>
                </li>
                <li className="flex gap-4">
                  <BookOpen
                    className={worksListIconClass}
                    strokeWidth={2}
                    aria-hidden
                  />
                  <span className="leading-snug">
                    Stay focused on what matters
                  </span>
                </li>
              </ul>
              <div className="mt-9 sm:mt-10">
                <HomePrimaryCtaClient
                  className={`${primaryCtaClass} w-full max-w-none sm:w-auto sm:max-w-lg`}
                >
                  Get started →
                </HomePrimaryCtaClient>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Easy apply */}
      <section
        className={`border-b border-gray-100 bg-white ${homeY.block} ${homeSectionPadX}`}
      >
        <div className={`${container} max-w-5xl text-center`}>
          <h2
            className={`mx-auto max-w-[36rem] text-pretty sm:max-w-[40rem] lg:max-w-[42rem] ${h2EasyApplySection}`}
          >
            Focus on scholarships you can actually apply to
          </h2>
          <div className="mx-auto mt-6 grid max-w-lg gap-6 sm:mt-7 sm:max-w-none sm:grid-cols-3 sm:gap-6 lg:mt-7 lg:gap-7">
            {[
              {
                icon: Zap,
                title: 'Easy applications',
                body: 'Skip listings that are unlikely to work for you.'
              },
              {
                icon: Timer,
                title: 'Save time',
                body: 'Spend less time filtering and more time applying.'
              },
              {
                icon: TrendingUp,
                title: 'Better-fit scholarships',
                body: 'Focus on scholarships you can actually pursue.'
              }
            ].map((card) => (
              <div
                key={card.title}
                className="group flex min-h-[200px] flex-col rounded-2xl border border-gray-200 bg-white p-7 text-center shadow-[0_4px_20px_-10px_rgba(15,23,42,0.07)] transition duration-200 hover:border-gray-300 hover:shadow-[0_10px_32px_-18px_rgba(15,23,42,0.11)] sm:min-h-[210px] sm:p-8 sm:text-left"
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-gray-50 text-gray-900 ring-1 ring-gray-100 transition group-hover:bg-gray-100/90 sm:mx-0">
                  <card.icon className="h-7 w-7" strokeWidth={2} aria-hidden />
                </div>
                <h3 className="mt-5 text-lg font-semibold leading-snug tracking-tight text-gray-900 sm:text-[1.125rem]">
                  {card.title}
                </h3>
                <p className="mt-2.5 flex-1 text-[0.9375rem] leading-relaxed text-pretty text-gray-600 sm:text-base sm:leading-relaxed sm:text-left">
                  {card.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. How it works */}
      <section
        className={`border-b border-gray-100 bg-gray-50 ${homeY.block} ${homeSectionPadX}`}
      >
        <div className={`${container} max-w-5xl`}>
          <h2 className={`text-center text-pretty ${h2Section}`}>How it works</h2>
          <div className="mx-auto mt-6 grid max-w-lg gap-6 sm:mt-7 sm:max-w-none sm:grid-cols-3 sm:gap-6 lg:mt-7 lg:gap-7">
            {[
              {
                step: '1',
                title: 'Create your profile',
                text: 'Share your background and goals.'
              },
              {
                step: '2',
                title: 'Get matched',
                text: 'See scholarships that fit your profile.'
              },
              {
                step: '3',
                title: 'Track & apply',
                text: 'Save favorites and stay ahead of deadlines.'
              }
            ].map((item) => (
              <div
                key={item.step}
                className="rounded-2xl border border-gray-200 bg-white p-7 text-center shadow-[0_4px_20px_-10px_rgba(15,23,42,0.07)] transition hover:border-gray-300 hover:shadow-[0_10px_32px_-18px_rgba(15,23,42,0.09)] sm:p-8 sm:text-left"
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
    </div>
  );
}
