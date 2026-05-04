'use client';

import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

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

const ORB_SUBTITLE_PHRASE = 'Any language';

function shouldHideAiNavigatorForCurrentHost(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.trim().toLowerCase();
  return host === 'iq.scholarshiptop.com' || host.startsWith('iq.');
}

/** Straight line under “AI”: letter-by-letter reveal, looping (motion-reduced: all visible). */
function OrbSubtitleTypewriter() {
  const chars = useMemo(
    () => ORB_SUBTITLE_PHRASE.split('').map((c) => (c === ' ' ? '\u00a0' : c)),
    []
  );
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setVisibleCount(chars.length);
      return;
    }

    const stepMs = 95;
    const holdMs = 2200;

    if (visibleCount < chars.length) {
      const t = window.setTimeout(() => setVisibleCount((n) => n + 1), stepMs);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(() => setVisibleCount(0), holdMs);
    return () => window.clearTimeout(t);
  }, [visibleCount, chars.length]);

  return (
    <span
      className="-translate-y-0.5 inline-flex max-w-full justify-center whitespace-nowrap font-sans text-[6.25px] font-semibold leading-none tracking-[-0.03em] text-orange-400 [text-shadow:0_0.5px_0_rgba(0,0,0,0.95)] motion-reduce:translate-y-0 sm:-translate-y-1 sm:text-[7.25px] lg:text-[8px]"
      aria-hidden
    >
      {chars.map((ch, i) => (
        <span
          key={`${i}-${ch}`}
          className="motion-safe:transition-opacity motion-safe:duration-150"
          style={{ opacity: i < visibleCount ? 1 : 0 }}
        >
          {ch}
        </span>
      ))}
    </span>
  );
}

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

      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center px-1">
        <span className="-translate-y-0.5 text-[11px] font-black leading-none tracking-[-0.06em] text-orange-400 [text-shadow:0_1px_0_rgba(0,0,0,0.95),0_0_12px_rgba(0,0,0,0.5)] drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)] motion-reduce:translate-y-0 sm:-translate-y-1 sm:text-[12px] lg:-translate-y-1.5 lg:text-[13px]">
          AI
        </span>
        <OrbSubtitleTypewriter />
      </div>
    </div>
  );
}

/**
 * FAB sits by default tight in the bottom-right viewport corner (safe-area + small gutter).
 * When `visualViewport` reports overlapping browser chrome, bump insets above that obstruction.
 */
function measureFabInsets(): { extraBottom: number; extraRight: number } {
  if (typeof window === 'undefined') {
    return { extraBottom: 14, extraRight: 12 };
  }
  const vv = window.visualViewport;
  const overlapBottom =
    vv != null
      ? Math.max(0, window.innerHeight - vv.offsetTop - vv.height)
      : 0;
  const overlapRight =
    vv != null
      ? Math.max(0, window.innerWidth - vv.offsetLeft - vv.width)
      : 0;
  const narrow = window.matchMedia('(max-width: 639px)').matches;
  const gutterB = narrow ? 12 : 16;
  const gutterR = narrow ? 12 : 18;
  const chromeThreshold = narrow ? 6 : 4;

  const extraBottom =
    overlapBottom <= chromeThreshold
      ? gutterB
      : Math.round(Math.min(narrow ? 132 : 72, overlapBottom + (narrow ? 14 : 12)));

  const extraRight =
    overlapRight <= chromeThreshold
      ? gutterR
      : Math.round(Math.min(narrow ? 36 : 40, overlapRight + 12));

  return { extraBottom, extraRight };
}

function AiFabFloatingLayer() {
  const href = getScholarshipTopNavigatorHref();
  const [insets, setInsets] = useState(() => measureFabInsets());

  useLayoutEffect(() => {
    const tick = () => setInsets(measureFabInsets());
    tick();

    const vv = window.visualViewport;
    vv?.addEventListener('resize', tick);
    vv?.addEventListener('scroll', tick);
    window.addEventListener('resize', tick);

    /** Some Android browsers repaint chrome after fullscreen paint. */
    const t = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(t);
      vv?.removeEventListener('resize', tick);
      vv?.removeEventListener('scroll', tick);
      window.removeEventListener('resize', tick);
    };
  }, []);

  const insetStyle = {
    bottom: `max(10px, calc(env(safe-area-inset-bottom, 0px) + ${insets.extraBottom}px))`,
    right: `max(10px, calc(env(safe-area-inset-right, 0px) + ${insets.extraRight}px))`
  };

  /** Under mobile nav overlays (z-[98]+). Above sticky catalog chrome (~z-70–80). */
  const shellClass =
    'pointer-events-none fixed z-[94] h-12 w-12 sm:h-[3.375rem] sm:w-[3.375rem] lg:h-14 lg:w-14';

  return (
    <aside className={`${shellClass} block`} style={insetStyle}>
      <div className="pointer-events-auto h-full w-full">
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
      </div>
    </aside>
  );
}

/**
 * Site-wide AI launcher (`app/layout.tsx`): opens ScholarshipTop Navigator GPT in a new tab,
 * pings POST `/api/telemetry/ai-navigator-click` so admins can receive a Telegram ping (traffic
 * category prefs). Disabled with AI_NAVIGATOR_CLICK_TELEGRAM_NOTIFY=0.
 *
 * Mounted through a body portal so `position:fixed` stays viewport-relative and is not clipped
 * by stacking / overflow quirks from layout wrappers.
 */
export default function HomeAiNavigatorWidget() {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (shouldHideAiNavigatorForCurrentHost()) return;

    const mount = document.createElement('div');
    mount.dataset.stAiFabPortal = '';
    document.body.appendChild(mount);
    setContainer(mount);
    return () => {
      setContainer(null);
      mount.remove();
    };
  }, []);

  if (!container) return null;
  return createPortal(<AiFabFloatingLayer />, container);
}
