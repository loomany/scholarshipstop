'use client';

import { useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

import {
  FEATURED_BRAND_SCHOLARSHIPS_HOME,
  featuredScholarshipHasSpecificUsdAmount,
  type FeaturedBrandScholarship
} from '@/lib/home/featuredBrandScholarshipsData';
import {
  brandDomainToLogoFileKey,
  featuredHomeLogoUiScale,
  homeFeaturedDomainLogoPublicPath
} from '@/lib/home/featuredBrandHomeLogos';

export type { FeaturedBrandScholarship };

/** @deprecated Use FEATURED_BRAND_SCHOLARSHIPS_HOME — kept for imports */
export const FEATURED_BRAND_SCHOLARSHIPS_MOCK = FEATURED_BRAND_SCHOLARSHIPS_HOME.slice(0, 3);

const h2Class =
  'text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl lg:text-[2.35rem] lg:leading-[1.15] xl:text-[2.5rem]';

const SCROLL_STEP_PX = 340;

type FeaturedBrandScholarshipsSectionProps = {
  className?: string;
  items?: FeaturedBrandScholarship[];
};

export function FeaturedBrandScholarshipsSection({
  className,
  items = FEATURED_BRAND_SCHOLARSHIPS_HOME
}: FeaturedBrandScholarshipsSectionProps) {
  const scrollerRef = useRef<HTMLUListElement>(null);
  /** Fal WebP missing or failed → Unavatar */
  const [logoFallback, setLogoFallback] = useState<Record<string, boolean>>({});

  const scrollByDir = useCallback((dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * SCROLL_STEP_PX, behavior: 'smooth' });
  }, []);

  const markLogoFallback = useCallback((fileKey: string) => {
    setLogoFallback((prev) => ({ ...prev, [fileKey]: true }));
  }, []);

  return (
    <section
      role="region"
      aria-labelledby="featured-brand-scholarships-heading"
      className={clsx(className)}
    >
      <div className="mx-auto max-w-7xl text-center">
        <h2 id="featured-brand-scholarships-heading" className={`text-pretty ${h2Class}`}>
          Featured Opportunities from Global Brands
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-pretty text-lg leading-relaxed text-gray-600 sm:mt-5 sm:text-xl sm:leading-relaxed">
          Apply to top-tier programs sponsored by industry leaders.
        </p>
      </div>

      <div className="relative mt-6 sm:mt-8">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-gray-50/80 to-transparent sm:w-14" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-gray-50/80 to-transparent sm:w-14" />

        <button
          type="button"
          onClick={() => scrollByDir(-1)}
          className="absolute left-0 top-1/2 z-20 hidden -translate-y-1/2 rounded-full border border-gray-200 bg-white p-2.5 text-gray-700 shadow-md transition hover:border-gray-300 hover:text-blue-600 md:flex"
          aria-label="Scroll scholarships left"
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={() => scrollByDir(1)}
          className="absolute right-0 top-1/2 z-20 hidden -translate-y-1/2 rounded-full border border-gray-200 bg-white p-2.5 text-gray-700 shadow-md transition hover:border-gray-300 hover:text-blue-600 md:flex"
          aria-label="Scroll scholarships right"
        >
          <ChevronRight className="h-5 w-5" strokeWidth={2} />
        </button>

        <ul
          ref={scrollerRef}
          className={clsx(
            'flex snap-x snap-mandatory items-stretch gap-5 overflow-x-auto scroll-smooth pb-3 pt-1',
            '[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
            'md:px-12'
          )}
        >
          {items.map((item, index) => {
            const fileKey = brandDomainToLogoFileKey(item.brandDomain);
            const generatedSrc = homeFeaturedDomainLogoPublicPath(item.brandDomain);
            const unavatarSrc = `https://unavatar.io/${item.brandDomain}`;
            const useUnavatar = Boolean(logoFallback[fileKey]);
            const logoSrc = useUnavatar ? unavatarSrc : generatedSrc;
            const key = `${item.href}-${index}`;
            const logoUiScale = featuredHomeLogoUiScale(item.brandDomain);

            return (
              <li
                key={key}
                className="flex w-[min(100vw-2.5rem,20rem)] shrink-0 snap-start sm:w-80"
              >
                <Link
                  href={item.href}
                  className="group flex h-full min-h-[300px] w-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white pb-6 shadow-sm outline-none transition duration-300 ease-out hover:-translate-y-1 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-orange-500/35 sm:min-h-[320px] sm:pb-7"
                >
                  <div className="flex shrink-0 items-start justify-between gap-3">
                    <div className="box-border grid h-[5.25rem] w-[5.25rem] shrink-0 place-items-center overflow-hidden rounded-br-2xl rounded-tl-2xl border-[3px] border-[#FF7A1A] bg-white p-1.5 sm:h-[5.75rem] sm:w-[5.75rem] sm:p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element -- local WebP + Unavatar fallback */}
                      <img
                        src={logoSrc}
                        alt={`${item.brandName} logo`}
                        width={96}
                        height={96}
                        className="h-full w-full min-h-0 min-w-0 origin-center object-contain"
                        style={{ transform: `scale(${logoUiScale})` }}
                        loading={index < 4 ? 'eager' : 'lazy'}
                        decoding="async"
                        onError={() => {
                          if (!useUnavatar) markLogoFallback(fileKey);
                        }}
                      />
                    </div>
                    <span className="mr-6 mt-6 shrink-0 rounded-full bg-[#FFF4ED] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-orange-500 sm:mr-7 sm:mt-7">
                      Premium
                    </span>
                  </div>

                  <div className="flex min-h-0 flex-1 flex-col px-6 sm:px-7">
                    <h3 className="mt-5 text-left text-lg font-bold leading-snug tracking-tight text-gray-900 group-hover:text-gray-950">
                      {item.title}
                    </h3>
                    <p className="mt-2 line-clamp-3 text-left text-sm leading-relaxed text-gray-600 sm:text-[0.9375rem]">
                      {item.description}
                    </p>
                  </div>

                  <div
                    className={clsx(
                      'mt-auto flex items-baseline gap-3 px-6 pt-6 sm:px-7',
                      featuredScholarshipHasSpecificUsdAmount(item.amount) && 'justify-between'
                    )}
                  >
                    <span className="inline-flex min-w-0 items-center gap-1.5 text-sm font-semibold text-gray-900 transition-colors duration-200 group-hover:gap-2 group-hover:text-[#FF7A1A]">
                      View Details
                      <ArrowRight
                        className="h-4 w-4 shrink-0 text-current"
                        strokeWidth={2.25}
                        aria-hidden
                      />
                    </span>
                    {featuredScholarshipHasSpecificUsdAmount(item.amount) ? (
                      <span className="shrink-0 text-right text-lg font-bold tabular-nums tracking-tight text-gray-900">
                        {item.amount}
                      </span>
                    ) : null}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>

        <p className="mt-2 text-center text-xs text-gray-500 md:hidden">
          Swipe sideways to see more
        </p>
      </div>
    </section>
  );
}
