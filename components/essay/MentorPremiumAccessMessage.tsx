'use client';

import { useEffect, useTransition } from 'react';
import { Sparkles } from 'lucide-react';

import { getCheckoutURLForPreferredPlan } from '@/app/actions/billing';
import { useToast } from '@/components/ui/Toasts/use-toast';
import {
  MENTOR_PREMIUM_ACCESS_BODY,
  MENTOR_PREMIUM_ACCESS_TITLE
} from '@/lib/essay/mentorPremiumCopy';

declare global {
  interface Window {
    LemonSqueezy?: {
      Setup?: (options: {
        eventHandler?: (event: { event?: string }) => void;
      }) => void;
      Refresh?: () => void;
      Url?: {
        Open?: (url: string) => void;
        Close?: () => void;
      };
    };
  }
}

export default function MentorPremiumAccessMessage() {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  useEffect(() => {
    window.LemonSqueezy?.Setup?.({
      eventHandler: (event) => {
        if (event?.event === 'Checkout.Success') {
          window.location.assign('/scholarships?status=success');
        }
      }
    });
    window.LemonSqueezy?.Refresh?.();
  }, []);

  /** Skip-trial checkout: immediate payment (see `getCheckoutURLForPreferredPlan` in billing actions). */
  const handleStart = () => {
    startTransition(async () => {
      const result = await getCheckoutURLForPreferredPlan();
      if (!result.ok) {
        toast({
          variant: 'destructive',
          title: 'Could not open checkout',
          description: result.error
        });
        return;
      }
      const checkoutUrl = result.url;
      const opened =
        typeof window !== 'undefined' &&
        typeof window.LemonSqueezy?.Url?.Open === 'function';
      if (opened) {
        window.LemonSqueezy!.Url!.Open!(checkoutUrl);
        return;
      }
      window.location.assign(checkoutUrl);
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-emerald-700/90">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
          <Sparkles className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
        </span>
        <span>AI Mentor</span>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-zinc-200/90 bg-gradient-to-br from-white via-zinc-50/80 to-orange-50/40 p-[1px] shadow-[0_12px_40px_-16px_rgba(15,23,42,0.18)]">
        <div className="rounded-[15px] bg-white/95 px-4 py-4 sm:px-5 sm:py-5">
          <div
            className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[#FF7A1A]/10 blur-2xl"
            aria-hidden
          />
          <h3 className="text-base font-bold tracking-tight text-zinc-900 sm:text-lg">
            {MENTOR_PREMIUM_ACCESS_TITLE}
          </h3>
          <p className="mt-2.5 whitespace-pre-line text-sm leading-relaxed text-zinc-600 sm:text-[15px]">
            {MENTOR_PREMIUM_ACCESS_BODY}
          </p>
          <button
            type="button"
            onClick={handleStart}
            disabled={isPending}
            className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#FF6600] px-6 text-sm font-bold text-white shadow-[0_2px_12px_-2px_rgba(255,102,0,0.45)] transition hover:bg-[#E65C00] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6600]/70 focus-visible:ring-offset-2 disabled:opacity-60"
          >
            {isPending ? 'Opening…' : 'Subscribe & pay'}
          </button>
        </div>
      </div>
    </div>
  );
}
