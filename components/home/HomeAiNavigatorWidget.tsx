'use client';

import { getScholarshipTopNavigatorHref } from '@/lib/nav/scholarshipTopNavigator';

/** Fire-and-forget: notifies admins via Telegram (server). Does not block opening GPT. */
function notifyAiNavigatorTelemetry(): void {
  if (typeof window === 'undefined') return;
  const pathname = `${window.location.pathname}${window.location.search || ''}`;
  const referrer = typeof document !== 'undefined' ? document.referrer || '' : '';
  const body = JSON.stringify({ pathname, referrer });
  try {
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json;charset=UTF-8' });
      if (navigator.sendBeacon('/api/telemetry/ai-navigator-click', blob)) return;
    }
  } catch {
    /* fallback below */
  }
  void fetch('/api/telemetry/ai-navigator-click', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true
  }).catch(() => {});
}

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
 * Site-wide AI launcher (`app/layout.tsx`): opens ScholarshipTop Navigator GPT in a new tab,
 * pings POST `/api/telemetry/ai-navigator-click` so admins can receive a Telegram ping (traffic
 * category prefs). Disabled with AI_NAVIGATOR_CLICK_TELEGRAM_NOTIFY=0.
 */
export default function HomeAiNavigatorWidget() {
  const href = getScholarshipTopNavigatorHref();

  /** Anchored bottom-right; extra bottom inset on phones clears browser chrome (still under mobile nav overlays z-[98]+). */
  const shellClass =
    'fixed bottom-[max(1rem,calc(env(safe-area-inset-bottom,0px)+3rem))] right-[max(1rem,calc(env(safe-area-inset-right,0px)+0.5rem))] z-[70] h-12 w-12 sm:bottom-8 sm:right-6 sm:h-[3.375rem] sm:w-[3.375rem] lg:bottom-8 lg:right-8 lg:h-14 lg:w-14';

  return (
    <aside className={`${shellClass} block`}>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => {
          notifyAiNavigatorTelemetry();
        }}
        onAuxClick={(event) => {
          if (event.button === 1) notifyAiNavigatorTelemetry();
        }}
        className="relative isolate block size-full cursor-pointer rounded-full outline-none transition-transform duration-150 active:scale-[0.94] motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
        style={{ WebkitTapHighlightColor: 'transparent' }}
        aria-label="ScholarshipTop Navigator AI assistant — opens in a new tab"
      >
        <MicrobeOrb />
      </a>
    </aside>
  );
}
