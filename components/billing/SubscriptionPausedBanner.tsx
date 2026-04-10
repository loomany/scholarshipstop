'use client';

type SubscriptionPausedBannerProps = {
  resumeUrl: string;
  className?: string;
};

/**
 * Soft gold / amber accent aligned with ScholarshipTop warm palette.
 */
export default function SubscriptionPausedBanner({
  resumeUrl,
  className = ''
}: SubscriptionPausedBannerProps) {
  return (
    <div
      className={`rounded-xl border border-amber-300/60 bg-amber-400/15 px-4 py-3 shadow-sm ring-1 ring-amber-400/25 dark:border-amber-500/35 dark:bg-amber-500/10 ${className}`}
      role="status"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <p className="text-sm font-medium leading-snug text-amber-950 dark:text-amber-100">
          Your subscription is currently paused. You can resume it anytime to regain full access.
        </p>
        <button
          type="button"
          onClick={() => window.location.assign(resumeUrl)}
          className="inline-flex shrink-0 items-center justify-center rounded-lg border border-amber-500/50 bg-amber-500/20 px-4 py-2 text-sm font-semibold text-amber-950 transition hover:bg-amber-500/30 dark:text-amber-50"
        >
          Resume Access
        </button>
      </div>
    </div>
  );
}
