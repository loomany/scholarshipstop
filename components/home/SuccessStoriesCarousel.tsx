'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ClipboardCheck } from 'lucide-react';

import {
  carouselCardWidthThreeUp,
  carouselEdgeFadeStoriesClass,
  carouselNavButtonClass
} from '@/components/home/homeCarouselChrome';
import { SUCCESS_STORIES, type SuccessStory } from '@/lib/home/successStories';

export type { SuccessStory };
export { SUCCESS_STORIES };

function WorkflowIcon() {
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-orange-100 bg-orange-50 text-orange-700 shadow-sm">
      <ClipboardCheck className="h-5 w-5" aria-hidden />
    </div>
  );
}

const scrollbarHide =
  '[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden';

function StoryCard({ story }: { story: SuccessStory }) {
  return (
    <article
      className={`${carouselCardWidthThreeUp} rounded-3xl border border-gray-100 bg-white p-6 shadow-sm`}
    >
      <header className="flex gap-3.5">
        <WorkflowIcon />
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-snug text-gray-900">{story.name}</p>
          <p className="text-sm text-gray-500">{story.label}</p>
        </div>
      </header>
      <div className="mt-4 space-y-3">
        <h3 className="text-base font-bold leading-snug tracking-tight text-gray-900">
          {story.headline}
        </h3>
        <p className="text-sm leading-relaxed text-gray-600">{story.body}</p>
      </div>
    </article>
  );
}

const h2Class =
  'text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl lg:text-[2.35rem] lg:leading-[1.15] xl:text-[2.5rem]';

function getScrollStepPx(scroller: HTMLDivElement): number {
  const first = scroller.querySelector('article');
  if (!first) return 344;
  const gap = 24;
  return first.getBoundingClientRect().width + gap;
}

const MANUAL_PAUSE_MS = 2800;

/** px per frame at about 60fps. Desktop and tablet use the same speed. */
const AUTO_SCROLL_SPEED_WIDE = 0.42;
/** Narrow viewports: slower drift so touch users can read cards. */
const AUTO_SCROLL_SPEED_NARROW = 0.22;

type SuccessStoriesCarouselProps = {
  /** Fewer cards plus tighter heading for compact homepage placement. */
  compact?: boolean;
};

export default function SuccessStoriesCarousel({
  compact = false
}: SuccessStoriesCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [manualPause, setManualPause] = useState(false);
  const rafRef = useRef<number | null>(null);
  const reduceMotionRef = useRef(false);
  /** Matches Tailwind `sm:` (viewport width under 640px). */
  const narrowViewportRef = useRef(false);
  const manualTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Prevents forward loop reset right after we jump to `half` for previous navigation. */
  const suppressLoopResetRef = useRef(false);

  const loopScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el || suppressLoopResetRef.current) return;
    const half = el.scrollWidth / 2;
    if (half <= 0) return;
    if (el.scrollLeft >= half - 1) {
      el.scrollLeft -= half;
    }
  }, []);

  const bumpManualPause = useCallback(() => {
    setManualPause(true);
    if (manualTimerRef.current) clearTimeout(manualTimerRef.current);
    manualTimerRef.current = setTimeout(() => {
      setManualPause(false);
      manualTimerRef.current = null;
    }, MANUAL_PAUSE_MS);
  }, []);

  const scrollByDir = useCallback(
    (dir: -1 | 1) => {
      bumpManualPause();
      const el = scrollerRef.current;
      if (!el) return;
      const half = el.scrollWidth / 2;
      const step = getScrollStepPx(el);

      if (dir === 1) {
        el.scrollBy({ left: step, behavior: 'smooth' });
        return;
      }

      if (el.scrollLeft <= 2) {
        suppressLoopResetRef.current = true;
        el.scrollLeft = half;
        window.setTimeout(() => {
          suppressLoopResetRef.current = false;
        }, 120);
      }
      el.scrollBy({ left: -step, behavior: 'smooth' });
    },
    [bumpManualPause]
  );

  useEffect(() => {
    reduceMotionRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const sync = () => {
      narrowViewportRef.current = mq.matches;
    };
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    return () => {
      if (manualTimerRef.current) clearTimeout(manualTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (reduceMotionRef.current || manualPause) {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    const tick = () => {
      const el = scrollerRef.current;
      if (!el || reduceMotionRef.current) return;
      const speed = narrowViewportRef.current
        ? AUTO_SCROLL_SPEED_NARROW
        : AUTO_SCROLL_SPEED_WIDE;
      el.scrollLeft += speed;
      loopScroll();
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [manualPause, loopScroll]);

  const stories = compact ? SUCCESS_STORIES.slice(0, 3) : SUCCESS_STORIES;
  /** Duplicate rows so horizontal loop and auto-scroll remain stable. */
  const loops = [0, 1] as const;

  return (
    <div className="w-full">
      <h2 className={`text-center text-pretty ${h2Class}`}>
        {compact
          ? 'How students use ScholarshipTop'
          : 'Scholarship planning workflows'}
      </h2>

      <div className={`group relative w-full ${compact ? 'mt-6 sm:mt-7' : 'mt-8 sm:mt-10'}`}>
        <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen">
          <div className={carouselEdgeFadeStoriesClass('left')} aria-hidden />
          <div className={carouselEdgeFadeStoriesClass('right')} aria-hidden />

          <button
            type="button"
            onClick={() => scrollByDir(-1)}
            className={`${carouselNavButtonClass} left-3 sm:left-5 md:left-7`}
            aria-label="Previous stories"
          >
            <ChevronLeft className="h-5 w-5 sm:h-[1.35rem] sm:w-[1.35rem]" strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={() => scrollByDir(1)}
            className={`${carouselNavButtonClass} right-3 sm:right-5 md:right-7`}
            aria-label="Next stories"
          >
            <ChevronRight className="h-5 w-5 sm:h-[1.35rem] sm:w-[1.35rem]" strokeWidth={2} />
          </button>

          <div
            ref={scrollerRef}
            onScroll={loopScroll}
            className={`flex w-full gap-6 overflow-x-auto scroll-auto pb-1 pt-1 ${scrollbarHide} px-4 sm:px-12 md:px-14`}
          >
            {loops.map((loop) =>
              stories.map((story) => (
                <StoryCard key={`${loop}-${story.name}`} story={story} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
