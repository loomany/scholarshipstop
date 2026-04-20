'use client';

import { Lock } from 'lucide-react';

import {
  SCHOLARSHIP_PROVIDER_OBSCURE_CLASS,
  scholarshipGuestLockIconClass
} from '@/lib/constants/scholarshipActionUi';

const pillShellClass =
  'inline-flex max-w-full items-center gap-1.5 rounded-full border border-zinc-200/95 bg-white px-2 py-0.5 align-middle shadow-sm ring-1 ring-zinc-100/80';

export type ScholarshipObscuredTextPillProps = {
  children: string;
  /** When set with `interactive`, opens subscription / registration flow. */
  onUnlock?: () => void;
  /**
   * `true` (default): `<button>` — use outside of other buttons/links.
   * `false`: non-interactive span (e.g. inside a parent `<button>` that already handles click).
   */
  interactive?: boolean;
  className?: string;
  ariaLabel?: string;
};

export function ScholarshipObscuredTextPill({
  children,
  onUnlock,
  interactive = true,
  className = '',
  ariaLabel = 'Sponsor details hidden. Click to unlock with a free account or trial.'
}: ScholarshipObscuredTextPillProps) {
  const inner = (
    <>
      <Lock
        className={`h-3.5 w-3.5 shrink-0 ${scholarshipGuestLockIconClass}`}
        strokeWidth={2.2}
        aria-hidden
      />
      <span
        className={`min-w-0 max-w-[min(100%,20rem)] truncate ${SCHOLARSHIP_PROVIDER_OBSCURE_CLASS}`}
      >
        {children}
      </span>
    </>
  );

  const merged = `${pillShellClass} ${className}`.trim();

  if (interactive && onUnlock) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onUnlock();
        }}
        className={`${merged} relative z-20 cursor-pointer transition hover:border-zinc-300 hover:bg-zinc-50/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A1A]/45 focus-visible:ring-offset-1`}
        title="Unlock full details"
        aria-label={ariaLabel}
      >
        {inner}
      </button>
    );
  }

  return (
    <span className={`${merged} pointer-events-none`} aria-hidden>
      {inner}
    </span>
  );
}
