'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';

type ScholarshipSubscriptionOfferModalProps = {
  open: boolean;
  onClose: () => void;
};

export default function ScholarshipSubscriptionOfferModal({
  open,
  onClose
}: ScholarshipSubscriptionOfferModalProps) {
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
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-zinc-900/45 backdrop-blur-[2px]"
        onClick={onClose}
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
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/55 focus-visible:ring-offset-0"
        >
          <X className="h-5 w-5" strokeWidth={2} aria-hidden />
        </button>

        <h2
          id="subscription-offer-title"
          className="pr-10 text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl"
        >
          Get 3 Days of Free Access!
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600 sm:text-base">
          We are offering you 3 days of free access to all premium results and
          recommendations. After this, you can continue using our services by
          subscribing.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Link
            href="/subscription"
            onClick={onClose}
            className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-zinc-900 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/80 focus-visible:ring-offset-0 sm:w-auto sm:min-w-[220px]"
          >
            Get Free Access
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/45 focus-visible:ring-offset-0 sm:w-auto"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}
