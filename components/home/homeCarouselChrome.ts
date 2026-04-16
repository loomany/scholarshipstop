/**
 * Shared carousel chrome: frosted nav pills + edge fades (Success stories + Featured resources).
 */

/** Circular prev/next — slightly translucent, overlaps track like reference UI. */
export const carouselNavButtonClass =
  'pointer-events-auto absolute top-1/2 z-[30] flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200/70 bg-white/80 p-0 text-gray-700 shadow-[0_6px_24px_-6px_rgba(15,23,42,0.2)] backdrop-blur-sm ring-1 ring-black/[0.05] transition hover:border-gray-300/90 hover:bg-white hover:text-gray-900 hover:shadow-[0_10px_28px_-8px_rgba(15,23,42,0.22)] active:scale-[0.98] sm:h-12 sm:w-12';

/** Horizontal edge fade — `white` = success block; `gray50` = Master the Application Process. */
export function carouselEdgeFadeClass(side: 'left' | 'right', bg: 'white' | 'gray50'): string {
  const palette =
    bg === 'white' ? 'from-white via-white/40' : 'from-gray-50 via-gray-50/40';
  const dir = side === 'left' ? 'bg-gradient-to-r' : 'bg-gradient-to-l';
  return `pointer-events-none absolute inset-y-0 ${side === 'left' ? 'left-0' : 'right-0'} z-[15] w-12 sm:w-16 md:w-20 ${dir} ${palette} to-transparent`;
}

/**
 * Full-bleed stories carousel: strong white vignette on left/right (cards read as fading into the page).
 * Wider + multi-stop than `carouselEdgeFadeClass` — matches premium horizontal sliders with edge softening.
 */
export function carouselEdgeFadeStoriesClass(side: 'left' | 'right'): string {
  const pos = side === 'left' ? 'left-0' : 'right-0';
  const width =
    'w-[clamp(3rem,11vw,8.5rem)] sm:w-[clamp(4rem,13vw,10rem)] md:w-[clamp(5rem,15vw,12rem)]';
  const grad =
    side === 'left'
      ? 'bg-[linear-gradient(to_right,#fff_0%,rgba(255,255,255,0.92)_18%,rgba(255,255,255,0.55)_52%,rgba(255,255,255,0.12)_82%,transparent_100%)]'
      : 'bg-[linear-gradient(to_left,#fff_0%,rgba(255,255,255,0.92)_18%,rgba(255,255,255,0.55)_52%,rgba(255,255,255,0.12)_82%,transparent_100%)]';
  return `pointer-events-none absolute inset-y-0 ${pos} z-[15] ${width} ${grad}`;
}

/** Card width: ~1 card mobile, ~2 sm, 3 from `lg` (gap-6 → two gaps = 3rem between three cards). */
export const carouselCardWidthThreeUp =
  'w-[min(88vw,280px)] shrink-0 snap-start sm:w-[min(46vw,272px)] md:w-[min(31vw,268px)] lg:w-[calc((100%-3rem)/3)] lg:min-w-0';
