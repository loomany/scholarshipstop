'use client';

import { useCallback, useEffect, useTransition } from 'react';
import { X } from 'lucide-react';

import { getCheckoutURLForPreferredPlan } from '@/app/actions/billing';
import { useToast } from '@/components/ui/Toasts/use-toast';

declare global {
  interface Window {
    LemonSqueezy?: {
      Setup?: (options: {
        eventHandler?: (event: { event?: string }) => void;
      }) => void;
      Refresh?: () => void;
      Url?: {
        Open?: (url: string) => void;
      };
    };
  }
}

type MentorTrialSubscribeModalProps = {
  open: boolean;
  onClose: () => void;
};

export default function MentorTrialSubscribeModal({
  open,
  onClose
}: MentorTrialSubscribeModalProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const dismiss = useCallback(() => {
    if (!isPending) onClose();
  }, [isPending, onClose]);

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

  useEffect(() => {
    if (!open) return;
    window.LemonSqueezy?.Setup?.({
      eventHandler: (event) => {
        if (event?.event === 'Checkout.Success') {
          window.location.assign('/scholarships?status=success');
        }
      }
    });
    window.LemonSqueezy?.Refresh?.();
  }, [open]);

  const handleStart = () => {
    startTransition(async () => {
      try {
        const checkoutUrl = await getCheckoutURLForPreferredPlan();
        const opened =
          typeof window !== 'undefined' &&
          typeof window.LemonSqueezy?.Url?.Open === 'function';
        if (opened) {
          window.LemonSqueezy!.Url!.Open!(checkoutUrl);
          return;
        }
        window.location.assign(checkoutUrl);
      } catch (e) {
        toast({
          variant: 'destructive',
          title: 'Could not open checkout',
          description: e instanceof Error ? e.message : 'Try again in a moment.'
        });
      }
    });
  };

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
        aria-labelledby="mentor-trial-subscribe-title"
        className="relative z-10 w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl sm:p-8"
      >
        <button
          type="button"
          aria-label="Close"
          onClick={dismiss}
          disabled={isPending}
          className="absolute right-4 top-4 rounded-lg p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/55 focus-visible:ring-offset-0 disabled:opacity-50"
        >
          <X className="h-5 w-5" strokeWidth={2} aria-hidden />
        </button>

        <h2
          id="mentor-trial-subscribe-title"
          className="pr-10 text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl"
        >
          Premium Access
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600 sm:text-base">
          Get full access to our global scholarship database with advanced filters, plus unlimited AI
          mentor chats and complete essay generation. Your monthly subscription starts today.
        </p>

        <div className="mt-8 flex w-full justify-center">
          <button
            type="button"
            onClick={handleStart}
            disabled={isPending}
            className="inline-flex h-12 w-full max-w-sm items-center justify-center rounded-xl bg-[#FF6600] px-8 text-sm font-bold text-white shadow-sm transition hover:bg-[#E65C00] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6600]/70 focus-visible:ring-offset-2 disabled:opacity-60 sm:max-w-md"
          >
            {isPending ? 'Opening…' : 'Start'}
          </button>
        </div>
      </div>
    </div>
  );
}
