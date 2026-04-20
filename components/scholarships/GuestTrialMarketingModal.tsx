'use client';

import { useCallback, useEffect } from 'react';
import Link from 'next/link';
import { Check, X } from 'lucide-react';

export type GuestTrialMarketingModalProps = {
  open: boolean;
  onClose: () => void;
  /** Optional extra context (shown in a subtle box). */
  notice?: string;
  /** Primary CTA — onboarding with `next`, or `/subscription` for signed-in users. */
  primaryHref: string;
  onSecondaryAction?: () => void;
  onPrimaryClick?: () => void;
  /**
   * `trial` — default marketing with 3-day trial line + CTA.
   * `subscription` — essay and other flows without trial framing (plans / subscribe).
   */
  marketingMode?: 'trial' | 'subscription';
};

const BULLETS = [
  'Get personalized scholarship matches instantly',
  'Find opportunities faster with smart filters',
  'Write winning essays with AI Mentor'
] as const;

export default function GuestTrialMarketingModal({
  open,
  onClose,
  notice,
  primaryHref,
  onSecondaryAction,
  onPrimaryClick,
  marketingMode = 'trial'
}: GuestTrialMarketingModalProps) {
  const dismiss = useCallback(() => {
    onSecondaryAction?.();
    onClose();
  }, [onClose, onSecondaryAction]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, dismiss]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-zinc-900/45 backdrop-blur-[2px]"
        onClick={dismiss}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="guest-trial-modal-title"
        className="relative z-10 w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl sm:p-8"
      >
        <button
          type="button"
          aria-label="Close"
          onClick={dismiss}
          className="absolute right-4 top-4 rounded-lg p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/55 focus-visible:ring-offset-0"
        >
          <X className="h-5 w-5" strokeWidth={2} aria-hidden />
        </button>

        <div className="px-1 text-center sm:px-2">
          <h2
            id="guest-trial-modal-title"
            className="text-xl font-bold tracking-tight text-zinc-900 sm:text-[1.4rem]"
          >
            Find Scholarships Faster + AI Essay Help
          </h2>
          <p className="mt-2 text-sm text-zinc-500 sm:text-base">
            {marketingMode === 'subscription'
              ? 'Plans from $12/mo — continue to choose your access.'
              : 'Try everything free for 3 days, then from $12/mo.'}
          </p>

          <h3 className="mt-6 text-base font-bold text-zinc-900 sm:text-lg">
            Unlock scholarships you can actually win + AI tools
          </h3>

          <ul className="mt-4 space-y-2.5 rounded-xl border border-zinc-100 bg-zinc-50/80 px-4 py-3 text-left text-sm text-zinc-800 sm:text-[0.9375rem]">
            {BULLETS.map((line) => (
              <li key={line} className="flex gap-2.5">
                <Check
                  className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
                  strokeWidth={2.5}
                  aria-hidden
                />
                <span>{line}</span>
              </li>
            ))}
          </ul>

          {notice?.trim() ? (
            <p className="mt-4 rounded-xl border border-orange-100 bg-orange-50/80 px-3 py-2.5 text-left text-xs font-medium leading-relaxed text-orange-950 sm:text-sm">
              {notice.trim()}
            </p>
          ) : null}

          <p className="mt-4 text-xs font-medium text-zinc-700 sm:text-sm">
            {marketingMode === 'subscription'
              ? '⚡ Continue to subscription to finish setup'
              : '⚡ Takes less than 10 seconds'}
          </p>

          <div className="mt-6">
            <Link
              href={primaryHref}
              onClick={() => {
                onPrimaryClick?.();
                onClose();
              }}
              className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-[#FF7A1A] px-5 text-sm font-semibold text-white shadow-md shadow-orange-500/25 transition hover:bg-[#E6670C] focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/80 focus-visible:ring-offset-2 sm:text-base"
            >
              {marketingMode === 'subscription' ? '👉 Subscribe' : '👉 Start 3-day free trial'}
            </Link>
          </div>

          <p className="mt-3 text-xs text-zinc-400 sm:text-sm">
            {marketingMode === 'subscription'
              ? 'Manage your plan anytime from your account'
              : 'Cancel anytime'}
          </p>
        </div>
      </div>
    </div>
  );
}
