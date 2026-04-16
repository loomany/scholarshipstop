'use client';

import { useCallback, useRef } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

import {
  FEATURED_BRAND_SCHOLARSHIPS_ALL,
  type FeaturedBrandScholarship
} from '@/lib/home/featuredBrandScholarshipsData';

export type { FeaturedBrandScholarship };

/** @deprecated Use FEATURED_BRAND_SCHOLARSHIPS_ALL — kept for imports */
export const FEATURED_BRAND_SCHOLARSHIPS_MOCK = FEATURED_BRAND_SCHOLARSHIPS_ALL.slice(0, 3);

const h2Class =
  'text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl lg:text-[2.35rem] lg:leading-[1.15] xl:text-[2.5rem]';

const SCROLL_STEP_PX = 340;

type FeaturedBrandScholarshipsSectionProps = {
  className?: string;
  items?: FeaturedBrandScholarship[];
};

export function FeaturedBrandScholarshipsSection({
  className,
  items = FEATURED_BRAND_SCHOLARSHIPS_ALL
}: FeaturedBrandScholarshipsSectionProps) {
  const scrollerRef = useRef<HTMLUListElement>(null);

  const scrollByDir = useCallback((dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * SCROLL_STEP_PX, behavior: 'smooth' });
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

      <div className="relative mt-10 sm:mt-12">
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
            'flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth pb-3 pt-1',
            '[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
            'md:px-12'
          )}
        >
          {items.map((item, index) => {
            const logoSrc = `https://unavatar.io/${item.brandDomain}`;
            const key = `${item.href}-${index}`;
            return (
              <li
                key={key}
                className="h-full w-[min(100vw-2.5rem,20rem)] shrink-0 snap-start sm:w-80"
              >
                <article className="group relative flex h-full min-h-[320px] flex-col rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition duration-300 ease-out hover:-translate-y-1 hover:shadow-lg sm:min-h-[340px] sm:p-7">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-gray-100">
                      {/* eslint-disable-next-line @next/next/no-img-element -- Unavatar */}
                      <img
                        src={logoSrc}
                        alt={`${item.brandName} logo`}
                        width={48}
                        height={48}
                        className="h-12 w-12 bg-white object-contain p-1.5"
                        loading={index < 4 ? 'eager' : 'lazy'}
                        decoding="async"
                      />
                    </div>
                    <span className="shrink-0 rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-sky-800">
                      Premium
                    </span>
                  </div>

                  <h3 className="mt-5 text-left text-lg font-bold leading-snug tracking-tight text-gray-900">
                    {item.title}
                  </h3>
                  <p className="mt-2 line-clamp-3 text-left text-sm leading-relaxed text-gray-600 sm:text-[0.9375rem]">
                    {item.description}
                  </p>

                  <div className="mt-auto pt-6">
                    <p className="text-left text-lg font-bold tabular-nums text-gray-900">
                      {item.amount}
                    </p>
                    <Link
                      href={item.href}
                      className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-gray-900 transition-all duration-200 hover:gap-2 hover:text-blue-600"
                    >
                      View Details -&gt;
                      <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={2.25} aria-hidden />
                    </Link>
                  </div>
                </article>
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
