import { GraduationCap } from 'lucide-react';

import { NAVIGATION_PROGRESS_COLOR } from '@/lib/constants/navigationProgress';

type ScholarshipsBrandLoadingProps = {
  /** Shown under the mark; pass empty string to hide. */
  label?: string;
  className?: string;
  /**
   * `compact` — inline list slot (less vertical space).
   * `comfortable` — full-route Suspense / centered empty state.
   */
  density?: 'comfortable' | 'compact';
  /**
   * Brand orange strip (same hue as `NavigationProgress`). Use on full-page / route fallbacks.
   */
  showTopAccentBar?: boolean;
};

/**
 * SaaS-style loading: small orange graduation-cap mark in a soft card + optional caption.
 * Pairs with the global orange top progress bar (`NavigationProgress`).
 */
export function ScholarshipsBrandLoading({
  label = 'Loading scholarships…',
  className = '',
  density = 'comfortable',
  showTopAccentBar = false
}: ScholarshipsBrandLoadingProps) {
  const minH =
    density === 'compact'
      ? 'min-h-[12rem] py-8 sm:min-h-[14rem]'
      : 'min-h-[min(28rem,60vh)] py-16 sm:py-20';

  const inner = (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={`flex w-full flex-col items-center justify-center gap-4 ${minH} ${className}`.trim()}
    >
      <div className="relative flex items-center justify-center">
        <div
          className="absolute h-28 w-28 rounded-full bg-gradient-to-tr from-orange-400/30 via-orange-500/15 to-transparent blur-2xl animate-pulse"
          aria-hidden
        />
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-white animate-scholarship-brand-mark-breathe">
          <GraduationCap
            className="h-[1.75rem] w-[1.75rem] text-[#f97316]"
            strokeWidth={2.25}
            aria-hidden
          />
        </div>
      </div>
      {label ? (
        <p className="max-w-sm text-center text-[13px] font-medium tracking-tight text-zinc-500">
          {label}
        </p>
      ) : null}
    </div>
  );

  if (!showTopAccentBar) return inner;

  return (
    <div className="flex w-full flex-col">
      <div
        className="h-[3px] w-full shrink-0"
        style={{ backgroundColor: NAVIGATION_PROGRESS_COLOR }}
        aria-hidden
      />
      {inner}
    </div>
  );
}
