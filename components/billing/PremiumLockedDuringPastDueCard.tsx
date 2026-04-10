import { ShieldOff } from 'lucide-react';

/**
 * Shown in the profile subscription column when payment is past_due (replaces free-tier perk list).
 */
export default function PremiumLockedDuringPastDueCard() {
  return (
    <div
      className="rounded-xl border border-red-200/70 bg-red-500/[0.08] px-4 py-4 text-left shadow-sm ring-1 ring-red-500/10 dark:border-red-400/30 dark:bg-red-500/10"
      role="status"
    >
      <div className="flex gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-500/15 text-red-700 dark:text-red-300">
          <ShieldOff className="h-5 w-5" strokeWidth={2} aria-hidden />
        </span>
        <p className="text-sm font-medium leading-snug text-slate-800 dark:text-slate-100">
          Your premium features are temporarily locked until the payment is resolved.
        </p>
      </div>
    </div>
  );
}
