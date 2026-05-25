'use client';

import { dismissRouteProgress } from '@/lib/navigation/dismissRouteProgress';
import { useCallback, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Check, Lock, X } from 'lucide-react';

import { getPremiumCompactModalCopy } from '@/lib/i18n/premiumCompactModalCopy';
import { resolveNavLocaleFromPathname } from '@/lib/i18n/resolveNavLocale';

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
   * `trial` — default marketing with no-cost entry copy + CTA.
   * `subscription` — essay and other flows without trial framing (plans / subscribe).
   */
  marketingMode?: 'trial' | 'subscription';
  /** Controls copy deck only; destination stays in `primaryHref`. */
  copyVariant?: 'modern-free-account' | 'classic-trial';
  /**
   * Logged in but no active plan: avoid "guest" copy; CTA is usually `/subscription`.
   * Ignored for `classic-trial` (essay upsell has its own copy).
   */
  signedInWithoutSubscription?: boolean;
  /**
   * Guest chose a grant from the catalog — headline/subcopy emphasize free account signup.
   */
  grantScholarshipPitch?: boolean;
};

const BULLETS = [
  'Unlimited Standard Grants: Browse thousands of regular scholarships without view limits.',
  'Save & Track: Bookmark your favorite grants and never miss a deadline.',
  'Weekly Alerts: Get notified via email when new standard grants are added.'
] as const;

const ESSAY_BULLETS = [
  'Everything in Monthly, plus:',
  'Unlock AI Essay Mentor (Quarterly & Yearly plans)',
  'Smart Interview & Voice Input',
  'Unlimited essay generations'
] as const;

export default function GuestTrialMarketingModal({
  open,
  onClose,
  notice,
  primaryHref,
  onSecondaryAction,
  onPrimaryClick,
  copyVariant = 'modern-free-account',
  signedInWithoutSubscription = false,
  grantScholarshipPitch = false
}: GuestTrialMarketingModalProps) {
  const pathname = usePathname() ?? '/';
  const premiumCopy = getPremiumCompactModalCopy(
    resolveNavLocaleFromPathname(pathname)
  );
  const dismiss = useCallback(() => {
    onSecondaryAction?.();
    onClose();
  }, [onClose, onSecondaryAction]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dismissRouteProgress();
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
  const isClassicTrial = copyVariant === 'classic-trial';
  const isSignedInUpsell = !isClassicTrial && signedInWithoutSubscription;
  const isGrantGuestPitch =
    !isClassicTrial && !isSignedInUpsell && grantScholarshipPitch;

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
        className={`relative z-10 w-full rounded-2xl border border-zinc-200 bg-white shadow-2xl ${
          isClassicTrial
            ? 'max-w-sm p-4 sm:p-5'
            : isGrantGuestPitch
              ? 'max-w-sm p-5 sm:p-6'
              : 'max-w-md p-5 sm:p-6'
        }`}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={dismiss}
          className="absolute right-4 top-4 rounded-lg p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/55 focus-visible:ring-offset-0"
        >
          <X className="h-5 w-5" strokeWidth={2} aria-hidden />
        </button>

        <div className="px-1 text-center">
          {isGrantGuestPitch ? (
            <>
              <h2
                id="guest-trial-modal-title"
                className="text-lg font-bold tracking-tight text-zinc-900 sm:text-xl"
              >
                Create a free account to view scholarship details
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-zinc-600 sm:text-[0.9375rem]">
                To continue, create your free account. It takes 10 seconds.
              </p>
              <div className="mt-6">
                <Link
                  href={primaryHref}
                  onClick={() => {
                    onPrimaryClick?.();
                    onClose();
                  }}
                  className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#FF7A1A] px-5 text-sm font-semibold text-white shadow-md shadow-orange-500/25 transition hover:bg-[#E6670C] focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/80 focus-visible:ring-offset-2 sm:text-base"
                >
                  Create Free Account
                </Link>
              </div>
              <p className="mt-3 text-xs text-zinc-400 sm:text-sm">
                Free account • 10 seconds
              </p>
            </>
          ) : isSignedInUpsell ? (
            <>
              <h2
                id="guest-trial-modal-title"
                className="flex items-center justify-center gap-2 pr-8 text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl"
              >
                {premiumCopy.title}
                <Lock
                  className="h-4 w-4 shrink-0 text-[#ff7b00]"
                  strokeWidth={2.3}
                  aria-hidden
                />
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600 sm:text-base">
                {premiumCopy.intro}
              </p>

              <ul className="mt-4 space-y-2.5 text-left text-zinc-700">
                {premiumCopy.features.map((feature) => (
                  <li key={feature.id} className="flex items-start gap-2.5 text-sm">
                    <Check
                      className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
                      strokeWidth={2.5}
                      aria-hidden
                    />
                    <p className="leading-relaxed">
                      <span className="font-semibold text-zinc-900">{feature.title}</span>{' '}
                      {feature.body}
                    </p>
                  </li>
                ))}
              </ul>

              <div className="mt-5">
                <Link
                  href={primaryHref}
                  onClick={() => {
                    onPrimaryClick?.();
                    onClose();
                  }}
                  className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#FF7A1A] px-5 text-sm font-semibold text-white shadow-md shadow-orange-500/25 transition hover:bg-[#E6670C] focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/80 focus-visible:ring-offset-2 sm:text-base"
                >
                  {premiumCopy.cta}
                </Link>
              </div>

              <p className="mt-3 text-center text-xs text-zinc-400 sm:text-sm">
                {premiumCopy.footer}
              </p>
            </>
          ) : (
            <>
              <h2
                id="guest-trial-modal-title"
                className={`font-bold tracking-tight text-zinc-900 ${
                  isClassicTrial ? 'text-[1.7rem] sm:text-[1.95rem]' : 'text-xl sm:text-[1.4rem]'
                }`}
              >
                {isClassicTrial ? 'Unlock AI Essay Mentor' : 'Keep Exploring Scholarships 🚀'}
              </h2>
              <p
                className={`mt-2 text-zinc-500 ${
                  isClassicTrial ? 'text-xs sm:text-sm' : 'text-sm sm:text-base'
                }`}
              >
                {isClassicTrial
                  ? 'AI Essay Mentor is available only on Quarterly and Yearly plans. Upgrade to access mentor chat, voice interview, and full draft generation.'
                  : "You've reached your guest limit. Create a 100% free profile to continue browsing our database."}
              </p>

              <h3
                className={`font-bold text-zinc-900 ${
                  isClassicTrial ? 'mt-4 text-[0.98rem] sm:text-base' : 'mt-5 text-base sm:text-lg'
                }`}
              >
                {isClassicTrial
                  ? 'What you unlock on Quarterly/Yearly:'
                  : "What's inside your free profile:"}
              </h3>

              <ul
                className={`rounded-xl border border-zinc-100 bg-zinc-50/80 text-left text-zinc-800 ${
                  isClassicTrial
                    ? 'mt-3 space-y-1.5 px-3 py-2 text-[0.95rem] sm:text-sm'
                    : 'mt-3.5 space-y-2 px-3.5 py-2.5 text-sm sm:text-[0.9375rem]'
                }`}
              >
                {(isClassicTrial ? ESSAY_BULLETS : BULLETS).map((line) => (
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

              <p
                className={`rounded-xl border border-orange-100 bg-orange-50/80 px-3 text-left font-medium leading-relaxed text-orange-950 ${
                  isClassicTrial
                    ? 'mt-3 py-1.5 text-[0.9rem] sm:text-xs'
                    : 'mt-3.5 py-2 text-xs sm:text-sm'
                }`}
              >
                {isClassicTrial
                  ? 'Monthly unlocks premium scholarships only. AI Essay Mentor tools require Quarterly or Yearly.'
                  : 'Join thousands of students and get your own personal dashboard to track your application progress.'}
              </p>

              <p
                className={`font-medium text-zinc-700 ${
                  isClassicTrial ? 'mt-3 text-[0.9rem] sm:text-xs' : 'mt-3.5 text-xs sm:text-sm'
                }`}
              >
                {isClassicTrial ? '⚡ Instant access after payment' : '⚡ Takes less than 10 seconds'}
              </p>

              <div className={isClassicTrial ? 'mt-4' : 'mt-5'}>
                <Link
                  href={primaryHref}
                  onClick={() => {
                    onPrimaryClick?.();
                    onClose();
                  }}
                  className={`inline-flex w-full items-center justify-center rounded-xl bg-[#FF7A1A] px-5 font-semibold text-white shadow-md shadow-orange-500/25 transition hover:bg-[#E6670C] focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/80 focus-visible:ring-offset-2 ${
                    isClassicTrial ? 'h-10 text-sm' : 'h-11 text-sm sm:text-base'
                  }`}
                >
                  {isClassicTrial
                    ? '👉 View Quarterly & Yearly Plans'
                    : '👉 Create Free Account'}
                </Link>
              </div>

              <p
                className={`text-zinc-400 ${
                  isClassicTrial ? 'mt-2 text-[0.8rem] sm:text-xs' : 'mt-2.5 text-xs sm:text-sm'
                }`}
              >
                {isClassicTrial
                  ? 'Secure payment • Cancel anytime'
                  : '100% Free • No credit card required'}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
