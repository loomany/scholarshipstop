'use client';

import { getScholarshipTopNavigatorHref } from '@/lib/nav/scholarshipTopNavigator';

const DOT_ANGLES = [0, 52, 108, 163, 221, 276, 322] as const;
const DRIFT_ANGLES = [0, 108, 221, 322] as const;

/** Shared layout/shell minus link wrapper (filled by parent). */
function MicrobeOrb() {
  return (
    <div className="relative isolate size-full motion-safe:animate-ai-widget-entry motion-reduce:animate-none motion-reduce:opacity-100">
      {/* Rotating layer only: disk + protrusions */}
      <div
        className="motion-safe:animate-ai-microbe-spin motion-reduce:animate-none absolute inset-0 z-0"
        aria-hidden
      >
        <div className="absolute inset-0 rounded-full bg-neutral-950 shadow-[0_6px_22px_-5px_rgba(0,0,0,0.5),0_0_0_1px_rgba(251,146,60,0.26),0_0_18px_-5px_rgba(249,115,22,0.18)] ring-1 ring-orange-400/25 sm:shadow-[0_8px_28px_-6px_rgba(0,0,0,0.55),0_0_0_1px_rgba(251,146,60,0.28),0_0_22px_-4px_rgba(249,115,22,0.2)]" />

        {DOT_ANGLES.map((deg, i) => (
          <div
            key={deg}
            className="pointer-events-none absolute left-1/2 top-1/2 w-0 origin-bottom"
            style={{
              height: 'calc(50% - 5px)',
              transform: `translate(-50%, -100%) rotate(${deg}deg)`
            }}
            aria-hidden
          >
            <span
              className="motion-safe:animate-ai-microbe-protrude motion-reduce:animate-none absolute left-1/2 top-0 block h-[4px] w-[4px] rounded-full bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.6)] sm:h-[5px] sm:w-[5px] sm:shadow-[0_0_10px_rgba(251,146,60,0.65)]"
              style={{ animationDelay: `${i * 0.43}s` }}
            />
          </div>
        ))}

        {DRIFT_ANGLES.map((deg, i) => (
          <div
            key={`speck-${deg}`}
            className="pointer-events-none absolute left-1/2 top-1/2 w-0 origin-bottom"
            style={{
              height: 'calc(50% + 2px)',
              transform: `translate(-50%, -100%) rotate(${deg + 19}deg)`
            }}
            aria-hidden
          >
            <span
              className="motion-safe:animate-ai-microbe-protrude-slow motion-reduce:animate-none absolute left-1/2 top-0 block h-[2.5px] w-[2.5px] rounded-full bg-zinc-300/95 sm:h-[3px] sm:w-[3px]"
              style={{ animationDelay: `${0.7 + i * 0.55}s` }}
            />
          </div>
        ))}
      </div>

      <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
        <span className="text-[11px] font-black leading-none tracking-[-0.06em] text-orange-400 [text-shadow:0_1px_0_rgba(0,0,0,0.95),0_0_12px_rgba(0,0,0,0.5)] drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)] sm:text-[12px] lg:text-[13px]">
          AI
        </span>
      </div>
    </div>
  );
}

/**
 * Site-wide AI launcher (`app/layout.tsx`): opens ScholarshipTop Navigator GPT in a new tab.
 * Uses `NEXT_PUBLIC_SCHOLARSHIPTOP_NAVIGATOR_URL` when valid; otherwise the bundled default GPT URL.
 */
export default function HomeAiNavigatorWidget() {
  const href = getScholarshipTopNavigatorHref();

  const shellClass =
    'fixed bottom-[max(0.75rem,calc(env(safe-area-inset-bottom,0px)+0.25rem))] right-[max(0.75rem,calc(env(safe-area-inset-right,0px)+0.25rem))] z-30 h-12 w-12 sm:bottom-6 sm:right-6 sm:h-[3.375rem] sm:w-[3.375rem] lg:h-14 lg:w-14';

  return (
    <aside className={`${shellClass} block`}>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="relative isolate block size-full cursor-pointer rounded-full outline-none transition-transform duration-150 active:scale-[0.94] motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
        style={{ WebkitTapHighlightColor: 'transparent' }}
        aria-label="ScholarshipTop Navigator AI assistant — opens in a new tab"
      >
        <MicrobeOrb />
      </a>
    </aside>
  );
}
