'use client';

import { useCallback, useEffect } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';

type ScholarshipSubscriptionOfferModalProps = {
  open: boolean;
  onClose: () => void;
  /** Optional context line (e.g. why the modal appeared). */
  notice?: string;
  /**
   * Backdrop, X, Escape — e.g. continue another flow after closing.
   * If omitted, only `onClose` runs.
   */
  onSecondaryAction?: () => void;
  /** Start trial CTA — e.g. clear a pending action before navigating to /subscription. */
  onPrimaryClick?: () => void;
};

export default function ScholarshipSubscriptionOfferModal({
  open,
  onClose,
  notice,
  onSecondaryAction,
  onPrimaryClick
}: ScholarshipSubscriptionOfferModalProps) {
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
        aria-labelledby="subscription-offer-title"
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

        <div className="pr-8 text-center sm:pr-10">
          <div className="mb-6 flex items-center justify-between gap-3 text-left">
            <span className="text-sm font-semibold text-zinc-900 sm:text-base">
              Subscription status
            </span>
            <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600 sm:text-xs">
              FREE PLAN
            </span>
          </div>

          <h2
            id="subscription-offer-title"
            className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-[1.65rem]"
            aria-describedby={
              notice?.trim() ? 'subscription-offer-notice' : undefined
            }
          >
            Unlock Premium Access
          </h2>
          <p className="mt-3 text-sm text-zinc-500 sm:text-base">
            Start 3-Day Free Trial, then as low as $12/mo.
          </p>
          {notice?.trim() ? (
            <p
              id="subscription-offer-notice"
              className="mt-4 rounded-xl border border-orange-100 bg-orange-50/80 px-3 py-2.5 text-left text-xs font-medium leading-relaxed text-orange-950 sm:text-sm"
            >
              {notice.trim()}
            </p>
          ) : null}

          <div className="mt-8">
            <Link
              href="/subscription"
              onClick={() => {
                onPrimaryClick?.();
                onClose();
              }}
              className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-[#FF7A1A] px-5 text-sm font-semibold text-white shadow-md shadow-orange-500/25 transition hover:bg-[#E6670C] focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/80 focus-visible:ring-offset-2 sm:text-base"
            >
              Start 3-Day Free Trial
            </Link>
          </div>

          <p className="mt-4 text-xs text-zinc-400 sm:text-sm">
            Full access. No commitment. Cancel anytime.
          </p>
        </div>
      </div>
    </div>
  );
}
