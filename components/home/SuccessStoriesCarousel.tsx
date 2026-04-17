'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';

import {
  carouselCardWidthThreeUp,
  carouselEdgeFadeStoriesClass,
  carouselNavButtonClass
} from '@/components/home/homeCarouselChrome';
import {
  SUCCESS_STORIES,
  successStoryAvatarSrc,
  type SuccessStory
} from '@/lib/home/successStories';

/**
 * Portraits: Fal `fal-ai/nano-banana-2` (see `scripts/generate-success-stories-avatars.ts`), env `FAL_KEY`.
 *
 * Series prompt (abbrev.):
 * "Photo-realistic close-up portrait of a university student, genuine confident smile, soft natural
 * library/campus light, blurred neutral light-grey or cream background, realistic skin texture,
 * Canon R5 50mm f/1.8, premium minimal editorial — Nana Banana 2 Pro aesthetic."
 *
 * Full per-avatar prompts live next to the generator script (regenerate: `npx dotenv-cli -e .env.local
 * -- npx tsx scripts/generate-success-stories-avatars.ts`).
 */

export type { SuccessStory };
export { SUCCESS_STORIES };

function initialsAvatarUrl(name: string): string {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    name
  )}&size=112&background=f9fafb&color=111827&rounded=true&bold=true`;
}

function StoryAvatar({ story }: { story: SuccessStory }) {
  const [src, setSrc] = useState(() => successStoryAvatarSrc(story.avatarSlug));
  const fallbackUsed = useRef(false);

  return (
    <div className="relative shrink-0">
      <div
        className="pointer-events-none absolute -inset-[3px] rounded-full bg-gradient-to-br from-amber-50/95 via-white to-orange-100/70 opacity-[0.97] shadow-[0_6px_28px_-10px_rgba(251,146,60,0.38)]"
        aria-hidden
      />
      <div className="relative rounded-full bg-gradient-to-br from-white via-orange-50/35 to-amber-50/55 p-[2px] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
        {/* eslint-disable-next-line @next/next/no-img-element -- public WebP + ui-avatars fallback */}
        <img
          src={src}
          alt=""
          width={56}
          height={56}
          className="h-14 w-14 rounded-full object-cover ring-[1.5px] ring-white"
          loading="lazy"
          decoding="async"
          onError={() => {
            if (fallbackUsed.current) return;
            fallbackUsed.current = true;
            setSrc(initialsAvatarUrl(story.avatarName));
          }}
        />
      </div>
    </div>
  );
}

const scrollbarHide =
  '[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden';

function StarRow() {
  return (
    <div className="flex gap-0.5">
      <span className="sr-only">5 out of 5 stars</span>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className="h-4 w-4 fill-orange-500 text-orange-500"
          strokeWidth={0}
          aria-hidden
        />
      ))}
    </div>
  );
}

function StoryCard({ story }: { story: SuccessStory }) {
  return (
    <article
      className={`${carouselCardWidthThreeUp} rounded-3xl border border-gray-100 bg-white p-6 shadow-sm`}
    >
      <header className="flex gap-3.5">
        <StoryAvatar story={story} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-snug text-gray-900">{story.name}</p>
          <p className="text-sm text-gray-500">{story.label}</p>
        </div>
      </header>
      <div className="mt-4 space-y-3">
        <StarRow />
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

/** px per frame (~60fps). Desktop / tablet — same as before (no hover slowdown). */
const AUTO_SCROLL_SPEED_WIDE = 0.42;
/** Narrow viewports: slower drift so touch users can read cards. */
const AUTO_SCROLL_SPEED_NARROW = 0.22;

type SuccessStoriesCarouselProps = {
  /** Fewer cards + tighter heading for homepage placement lower on the fold. */
  shortTestimonials?: boolean;
};

export default function SuccessStoriesCarousel({
  shortTestimonials = false
}: SuccessStoriesCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [manualPause, setManualPause] = useState(false);
  const rafRef = useRef<number | null>(null);
  const reduceMotionRef = useRef(false);
  /** Matches Tailwind `sm:` (viewport width under 640px). */
  const narrowViewportRef = useRef(false);
  const manualTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Prevents forward loop reset right after we jump to `half` for “previous” navigation */
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

  const stories = shortTestimonials ? SUCCESS_STORIES.slice(0, 3) : SUCCESS_STORIES;
  /** Duplicate rows so horizontal loop + auto-scroll remain stable. */
  const loops = [0, 1] as const;

  return (
    <div className="w-full">
      <h2 className={`text-center text-pretty ${h2Class}`}>
        {shortTestimonials ? 'What students say' : 'Stories of Real Students'}
      </h2>

      <div className={`group relative w-full ${shortTestimonials ? 'mt-6 sm:mt-7' : 'mt-8 sm:mt-10'}`}>
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
