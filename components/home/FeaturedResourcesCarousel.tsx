'use client';

import { useCallback, useRef } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';

import type { HomeResourcesCarouselItem } from '@/lib/home/homeResourcesCarouselItem';
import {
  carouselCardWidthThreeUp,
  carouselEdgeFadeClass,
  carouselNavButtonClass
} from '@/components/home/homeCarouselChrome';

const scrollbarHide =
  '[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden';

function getScrollStepPx(scroller: HTMLDivElement): number {
  const first = scroller.querySelector('article');
  if (!first) return 400;
  const gap = 24;
  return first.getBoundingClientRect().width + gap;
}

function badgeClass(kind: HomeResourcesCarouselItem['kind']) {
  if (kind === 'resource') {
    return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100';
  }
  return 'bg-orange-50 text-orange-700';
}

export default function FeaturedResourcesCarousel({
  items,
  cardFallbackDescription = 'Open the full piece for the complete walkthrough and tips.'
}: {
  items: HomeResourcesCarouselItem[];
  cardFallbackDescription?: string;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scrollByDir = useCallback((dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const step = getScrollStepPx(el);
    el.scrollBy({ left: dir * step, behavior: 'smooth' });
  }, []);

  const renderItem = (item: HomeResourcesCarouselItem, keySuffix = '') => (
    <article
      key={`${item.kind}-${item.href}${keySuffix}`}
      role="listitem"
      className={carouselCardWidthThreeUp}
    >
      <Link
        href={item.href}
        className="group flex h-full min-h-[280px] flex-col rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition duration-300 ease-out hover:-translate-y-1 hover:shadow-md sm:min-h-[260px] sm:p-8"
      >
        <span
          className={`inline-flex w-fit rounded-md px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${badgeClass(item.kind)}`}
        >
          {item.badgeLabel}
        </span>
        <h3
          className={`mt-4 line-clamp-2 text-lg font-bold leading-snug sm:text-xl ${
            item.kind === 'resource' ? 'text-emerald-950' : 'text-gray-900'
          }`}
        >
          {item.title}
        </h3>
        <p className="mt-2 flex-grow text-sm leading-relaxed text-gray-500 line-clamp-3 sm:text-base">
          {item.description || cardFallbackDescription}
        </p>
        <span
          className={`mt-auto flex items-center gap-1.5 pt-6 text-sm font-semibold transition sm:text-base ${
            item.kind === 'resource'
              ? 'text-emerald-900 group-hover:text-emerald-700'
              : 'text-gray-900 group-hover:text-orange-600'
          }`}
        >
          {item.ctaLabel}
          <ArrowRight
            className="h-4 w-4 shrink-0 transition group-hover:translate-x-0.5"
            aria-hidden
          />
        </span>
      </Link>
    </article>
  );

  return (
    <div className="group relative mt-10 w-full lg:mt-12">
      <div className={carouselEdgeFadeClass('left', 'gray50')} aria-hidden />
      <div className={carouselEdgeFadeClass('right', 'gray50')} aria-hidden />

      <div>
        <button
          type="button"
          onClick={() => scrollByDir(-1)}
          className={`${carouselNavButtonClass} left-1 sm:left-3 md:left-4`}
          aria-label="Previous items"
        >
          <ChevronLeft
            className="h-5 w-5 sm:h-[1.35rem] sm:w-[1.35rem]"
            strokeWidth={2}
          />
        </button>
        <button
          type="button"
          onClick={() => scrollByDir(1)}
          className={`${carouselNavButtonClass} right-1 sm:right-3 md:right-4`}
          aria-label="Next items"
        >
          <ChevronRight
            className="h-5 w-5 sm:h-[1.35rem] sm:w-[1.35rem]"
            strokeWidth={2}
          />
        </button>
      </div>

      <div
        ref={scrollerRef}
        className={`flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth pb-8 pl-10 pr-10 pt-0.5 sm:pl-12 sm:pr-12 md:pl-14 md:pr-14 ${scrollbarHide}`}
        role="list"
        aria-label="Featured guides and resources"
      >
        {items.map((item) => renderItem(item))}
      </div>
    </div>
  );
}
