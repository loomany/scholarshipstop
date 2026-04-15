'use client';

import type { ReactNode } from 'react';
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Sparkles, Star } from 'lucide-react';

import Button from '@/components/ui/Button';
import {
  SCHOLARSHIP_ACTION_FILL,
  SCHOLARSHIP_ACTION_FOCUS_VISIBLE,
  SUBSCRIPTION_CURRENT_PLAN_BUTTON_FILL,
  SUBSCRIPTION_CURRENT_PLAN_BUTTON_FOCUS
} from '@/lib/constants/scholarshipActionUi';
import { cn } from '@/utils/cn';
import { type BillingPlanKey, getCheckoutURL } from '@/app/actions/billing';

declare global {
  interface Window {
    LemonSqueezy?: {
      Setup?: (options: {
        eventHandler?: (event: { event?: string }) => void;
      }) => void;
      Refresh?: () => void;
      Url?: {
        Open?: (url: string) => void;
        /** Dismisses the in-app overlay (documented Lemon.js API). */
        Close?: () => void;
      };
    };
  }
}

/**
 * Lemon billing / portal / update-card URLs.
 * Prefer a **new tab** so the app page stays put. If popups are blocked, fall back to the overlay, then full navigation.
 *
 * Do **not** pass `noopener` in the third argument to `window.open`: in that case the return value is always
 * `null` even when a tab opened, so we would wrongly fall through to `location.assign` and navigate away too.
 */
function openLemonHostedUrl(url: string) {
  if (typeof window === 'undefined') return;

  const tab = window.open(url, '_blank');
  if (tab) {
    tab.opener = null;
    return;
  }

  if (typeof window.LemonSqueezy?.Url?.Open === 'function') {
    window.LemonSqueezy.Url.Open(url);
    return;
  }

  window.location.assign(url);
}

/** Compact trial note — same language as `ScholarshipsEmailConfirmationBanner`. */
function PlanTrialBetweenFeaturesAndCta() {
  return (
    <div
      className="w-full rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 py-2.5 text-xs shadow-sm sm:text-sm"
      role="status"
    >
      <p className="text-center leading-snug">
        <span className="block font-semibold text-zinc-900">
          🎁 3-Day Free Trial
        </span>
        <span className="mt-0.5 block text-zinc-600">
          included with all plans.
        </span>
      </p>
    </div>
  );
}

function PlanFeatureList({ items }: { items: string[] }) {
  return (
    <ul
      className="flex w-full flex-col justify-center gap-1.5 text-left"
      role="list"
    >
      {items.map((line) => (
        <li key={line} className="flex gap-2">
          <span
            className="shrink-0 text-sm font-bold text-green-500"
            aria-hidden
          >
            ✓
          </span>
          <span className="text-sm text-gray-600">{line}</span>
        </li>
      ))}
    </ul>
  );
}

type PlanRowProps = {
  title: string;
  badge?: ReactNode;
  price: string;
  billing: string;
  features: string[];
  buttonClassName: string;
  planKey: BillingPlanKey;
  featured?: boolean;
  ctaAbove?: ReactNode;
  hasActiveSubscription?: boolean;
  /** Disabled CTA label when this tier is the user’s current plan (from subscription status). */
  currentPlanStatusLabel?: string;
  manageSubscriptionUrl?: string | null;
  updatePaymentUrl?: string | null;
  isCurrentPlan?: boolean;
  showResumeAction?: boolean;
  showUpdatePaymentAction?: boolean;
  pastDueBillingAccent?: boolean;
  showSkipTrialAction?: boolean;
  isSkippingTrial?: boolean;
  onSkipTrial?: () => void;
  /** False when user already maps to a tier (e.g. past_due — subscription exists, payment failed). */
  showNewSubscriberTrialPromo?: boolean;
  /** Server API cancel (preferred); else `manageSubscriptionUrl` opens Lemon portal. */
  onCancelSubscription?: () => void | Promise<void>;
  isCancellingSubscription?: boolean;
  onResumeSubscription?: () => void | Promise<void>;
  isResumingSubscription?: boolean;
  isLoading: boolean;
  isBusy: boolean;
  onSelect: (planKey: BillingPlanKey, title: string) => void;
};

type PlanConfig = Omit<
  PlanRowProps,
  | 'isLoading'
  | 'isBusy'
  | 'onSelect'
  | 'showSkipTrialAction'
  | 'isSkippingTrial'
  | 'onSkipTrial'
  | 'currentPlanStatusLabel'
  | 'showNewSubscriberTrialPromo'
  | 'onCancelSubscription'
  | 'isCancellingSubscription'
  | 'onResumeSubscription'
  | 'isResumingSubscription'
>;

function PlanGrantCard({
  title,
  badge,
  price,
  billing,
  features,
  buttonClassName,
  planKey,
  featured = false,
  ctaAbove,
  hasActiveSubscription = false,
  currentPlanStatusLabel = 'Active Plan',
  manageSubscriptionUrl = null,
  updatePaymentUrl = null,
  isCurrentPlan = false,
  showResumeAction = false,
  showUpdatePaymentAction = false,
  pastDueBillingAccent = false,
  showSkipTrialAction = false,
  isSkippingTrial = false,
  onSkipTrial,
  showNewSubscriberTrialPromo = false,
  onCancelSubscription,
  isCancellingSubscription = false,
  onResumeSubscription,
  isResumingSubscription = false,
  isLoading,
  isBusy,
  onSelect
}: PlanRowProps) {
  const isBusyOrLocked = isBusy || isCurrentPlan;
  const buttonLabel = !isCurrentPlan
    ? hasActiveSubscription
      ? `Upgrade to ${title}`
      : 'Start Free Trial'
    : currentPlanStatusLabel;

  const showCancelSplit =
    isCurrentPlan &&
    !showResumeAction &&
    (Boolean(onCancelSubscription) || Boolean(manageSubscriptionUrl));

  return (
    <article
      className={cn(
        'group relative flex h-full min-h-0 min-w-0 max-w-full flex-col overflow-hidden rounded-xl border bg-white shadow-sm transition duration-200 hover:border-gray-300 hover:shadow-lg focus-within:border-gray-300 focus-within:shadow-lg',
        featured
          ? 'border-emerald-200 shadow-md ring-1 ring-emerald-500/15'
          : 'border-gray-200',
        featured ? 'border-l-4 border-l-emerald-500' : 'border-l-4 border-l-gray-900'
      )}
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col p-4 sm:p-5">
        <div className="min-w-0 w-full shrink-0 text-center">
          {ctaAbove ? (
            <div className="mb-2 flex justify-center sm:mb-2.5">{ctaAbove}</div>
          ) : (
            <div
              className="mb-2 min-h-[1.875rem] sm:mb-2.5 sm:min-h-[2.125rem]"
              aria-hidden
            />
          )}
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
            <h2 className="text-base font-semibold tracking-tight text-gray-900 sm:text-lg">
              {title}
            </h2>
            {badge}
          </div>
          <div className="mt-2">
            <span className="text-3xl font-bold tabular-nums text-gray-900 sm:text-4xl">
              {price}
            </span>
            <span className="text-sm text-gray-500">/mo</span>
          </div>
          <p className="mt-0.5 text-sm text-gray-500">{billing}</p>
        </div>

        <div className="min-h-0 w-full flex-1 border-t border-gray-100 pt-4 text-left">
          <PlanFeatureList items={features} />
        </div>

        <div className="mt-auto flex w-full min-w-0 flex-col gap-3 border-t border-gray-100 pt-4">
          {showNewSubscriberTrialPromo ? <PlanTrialBetweenFeaturesAndCta /> : null}
          <div className="flex w-full flex-col gap-2">
            {isCurrentPlan ? (
              showCancelSplit ? (
                <div
                  role="group"
                  aria-label={`${buttonLabel}. Cancel ends renewal at period end.`}
                  title={`${buttonLabel} | Cancel`}
                  className={cn(
                    'inline-flex w-full min-w-0 items-stretch overflow-hidden rounded-xl text-center text-xs font-semibold leading-none text-white sm:text-sm sm:leading-tight',
                    SUBSCRIPTION_CURRENT_PLAN_BUTTON_FILL
                  )}
                >
                  <span
                    className="flex min-w-0 flex-1 cursor-default items-center justify-center px-2 py-2.5 sm:px-3"
                    aria-current="page"
                  >
                    <span className="truncate">{buttonLabel}</span>
                  </span>
                  <span
                    className="flex shrink-0 items-center px-0.5 text-white/50"
                    aria-hidden
                  >
                    |
                  </span>
                  <button
                    type="button"
                    disabled={isCancellingSubscription}
                    onClick={() => {
                      if (onCancelSubscription) {
                        void onCancelSubscription();
                      } else if (manageSubscriptionUrl) {
                        openLemonHostedUrl(manageSubscriptionUrl);
                      }
                    }}
                    className="shrink-0 px-3 py-2.5 underline-offset-2 hover:underline focus:outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#FFB27D] enabled:cursor-pointer disabled:cursor-wait disabled:opacity-80 sm:px-4"
                    aria-label="Cancel subscription"
                  >
                    {isCancellingSubscription ? (
                      <Loader2 className="mx-0.5 h-4 w-4 shrink-0 animate-spin" aria-hidden />
                    ) : (
                      'Cancel'
                    )}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled
                  tabIndex={-1}
                  aria-current="page"
                  title={buttonLabel}
                  className={cn(
                    'inline-flex w-full min-w-0 cursor-default items-center justify-center rounded-xl px-2 py-2.5 text-center text-xs font-semibold leading-none whitespace-nowrap text-white sm:px-3 sm:text-sm sm:leading-tight',
                    SUBSCRIPTION_CURRENT_PLAN_BUTTON_FILL,
                    SUBSCRIPTION_CURRENT_PLAN_BUTTON_FOCUS,
                    'disabled:opacity-100'
                  )}
                >
                  {buttonLabel}
                </button>
              )
            ) : (
              <Button
                type="button"
                variant="slim"
                loading={isLoading}
                disabled={isBusyOrLocked}
                onClick={() => onSelect(planKey, title)}
                title={isLoading ? undefined : buttonLabel}
                className={cn(
                  'lemonsqueezy-button',
                  'inline-flex w-full min-w-0 items-center justify-center rounded-xl px-2 py-2.5 text-center text-xs font-semibold leading-none whitespace-nowrap transition focus:outline-none disabled:cursor-not-allowed disabled:opacity-70 sm:px-3 sm:text-sm sm:leading-tight',
                  SCHOLARSHIP_ACTION_FOCUS_VISIBLE,
                  buttonClassName
                )}
              >
                {isLoading ? 'Redirecting...' : buttonLabel}
              </Button>
            )}
            {isCurrentPlan && showUpdatePaymentAction && updatePaymentUrl ? (
              <button
                type="button"
                onClick={() => openLemonHostedUrl(updatePaymentUrl)}
                className={cn(
                  'inline-flex w-full items-center justify-center rounded-xl px-3 py-2.5 text-center text-xs font-semibold transition sm:text-[13px]',
                  pastDueBillingAccent
                    ? 'border-2 border-orange-500 bg-orange-50 text-orange-950 shadow-sm shadow-orange-500/20 ring-2 ring-orange-500/75 hover:bg-orange-100 dark:bg-orange-950/40 dark:text-orange-50 dark:ring-orange-400/80'
                    : 'border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100'
                )}
              >
                Update Billing Info
              </button>
            ) : null}
            {showSkipTrialAction && onSkipTrial ? (
              <button
                type="button"
                onClick={onSkipTrial}
                disabled={isSkippingTrial}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-600 bg-emerald-600 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition hover:border-emerald-700 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSkippingTrial ? (
                  <>
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                    Processing…
                  </>
                ) : (
                  'Skip Trial & Pay Now'
                )}
              </button>
            ) : null}
            {isCurrentPlan &&
            showResumeAction &&
            (onResumeSubscription || manageSubscriptionUrl) ? (
              <button
                type="button"
                disabled={isResumingSubscription}
                onClick={() => {
                  if (onResumeSubscription) {
                    void onResumeSubscription();
                  } else if (manageSubscriptionUrl) {
                    openLemonHostedUrl(manageSubscriptionUrl);
                  }
                }}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-center text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-wait disabled:opacity-70"
              >
                {isResumingSubscription ? (
                  <>
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                    Resuming…
                  </>
                ) : (
                  'Resume Subscription'
                )}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

const MONTHLY_FEATURES: string[] = [
  'Full access to AI scholarship matches',
  'Precision filters (intent, nationality)',
  'Save 20+ hours of manual research',
  'Unlimited AI Mentor & Essay Generation'
];

const QUARTERLY_FEATURES: string[] = [
  'Everything in Monthly, plus:',
  'Priority support & early grant alerts',
  'Track applications for the full season',
  'Advanced AI essay checks & humanization'
];

const YEARLY_FEATURES: string[] = [
  'Everything in Quarterly, plus:',
  'Lock in our maximum 52% discount',
  'Uninterrupted access for a full year',
  'Unlimited premium AI usage all year round'
];

const PLANS: PlanConfig[] = [
  {
    title: 'Monthly',
    planKey: 'monthly',
    price: '$25',
    billing: 'Billed $25 every month.',
    features: MONTHLY_FEATURES,
    buttonClassName:
      'border border-gray-300 bg-white text-gray-900 hover:bg-gray-50'
  },
  {
    title: 'Quarterly',
    planKey: 'quarterly',
    price: '$19',
    billing: 'Billed $57 every 3 months.',
    features: QUARTERLY_FEATURES,
    buttonClassName:
      'border border-[#FF7A1A] bg-[#FF7A1A] text-white shadow-sm hover:border-[#E6670C] hover:bg-[#E6670C] focus-visible:ring-[#FFB27D] focus-visible:ring-offset-2',
    badge: (
      <span className="shrink-0 rounded-full bg-[#FF7A1A]/18 px-2.5 py-0.5 text-xs font-semibold text-[#C2410C] ring-1 ring-[#FF7A1A]/35">
        Save 24%
      </span>
    ),
    ctaAbove: (
      <span
        className="inline-flex max-w-full shrink-0 items-center justify-center gap-1.5 self-center whitespace-nowrap rounded-full bg-amber-50/95 px-2.5 py-1 text-[11px] font-semibold text-amber-900 ring-1 ring-amber-200/60 sm:px-3 sm:text-xs"
        aria-label="Most popular plan"
      >
        <Star
          className="h-3 w-3 shrink-0 fill-amber-400/90 text-amber-600/80"
          strokeWidth={2}
          aria-hidden
        />
        Most Popular
      </span>
    )
  },
  {
    title: 'Yearly',
    planKey: 'yearly',
    price: '$12',
    billing: 'Billed $144 annually.',
    features: YEARLY_FEATURES,
    buttonClassName:
      'border border-emerald-500 bg-emerald-500 text-white shadow-sm hover:border-emerald-600 hover:bg-emerald-600',
    featured: true,
    badge: (
      <span className="shrink-0 rounded-full bg-emerald-500/18 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-500/35">
        Save 52% 🔥
      </span>
    ),
    ctaAbove: (
      <span
        className="inline-flex max-w-full shrink-0 items-center justify-center gap-1.5 self-center whitespace-nowrap rounded-full bg-emerald-50/95 px-2.5 py-1 text-[11px] font-semibold text-emerald-900 ring-1 ring-emerald-200/70 sm:px-3 sm:text-xs"
        aria-label="Smart choice plan"
      >
        <Sparkles
          className="h-3 w-3 shrink-0 text-emerald-600"
          strokeWidth={2.2}
          aria-hidden
        />
        Smart Choice
      </span>
    )
  }
];

export default function SubscriptionPricingClient({
  currentPlanKey = null,
  currentPlanStatusLabel = 'Active Plan',
  hasActiveSubscription: hasActiveSubscriptionProp,
  manageSubscriptionUrl = null,
  updatePaymentUrl = null,
  showResumeAction = false,
  showUpdatePaymentAction = false,
  pastDueBillingAccent = false,
  isEligibleForSkipTrial = false
}: {
  currentPlanKey?: BillingPlanKey | null;
  /** Shown on the disabled button for the tier that matches `currentPlanKey`. */
  currentPlanStatusLabel?: string;
  /** When set, overrides the legacy heuristic (`currentPlanKey !== null`). */
  hasActiveSubscription?: boolean;
  manageSubscriptionUrl?: string | null;
  updatePaymentUrl?: string | null;
  showResumeAction?: boolean;
  showUpdatePaymentAction?: boolean;
  pastDueBillingAccent?: boolean;
  /** Server-computed: Lemon Squeezy trial row matches `skip-trial` API eligibility. */
  isEligibleForSkipTrial?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activePlanTitle, setActivePlanTitle] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isSkippingTrial, setIsSkippingTrial] = useState(false);
  const [skipTrialError, setSkipTrialError] = useState<string | null>(null);
  const [isCancellingSubscription, setIsCancellingSubscription] = useState(false);
  const [isResumingSubscription, setIsResumingSubscription] = useState(false);
  const [billingActionError, setBillingActionError] = useState<string | null>(null);
  const isBusy = activePlanTitle !== null;
  const hasActiveSubscription =
    typeof hasActiveSubscriptionProp === 'boolean'
      ? hasActiveSubscriptionProp
      : currentPlanKey !== null;

  /** Trial blurb is for first-time checkout only — not when a Lemon tier is already tied (incl. past_due). */
  const showNewSubscriberTrialPromo =
    !hasActiveSubscription && currentPlanKey == null;

  useEffect(() => {
    window.LemonSqueezy?.Setup?.({
      eventHandler: (event) => {
        if (event?.event === 'Checkout.Success') {
          setActivePlanTitle(null);
          setCheckoutError(null);
          window.location.assign('/scholarships?status=success');
        }
      }
    });
    window.LemonSqueezy?.Refresh?.();

    const onEscape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      window.LemonSqueezy?.Url?.Close?.();
    };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, []);

  const handleCancelSubscription = async () => {
    setBillingActionError(null);
    setIsCancellingSubscription(true);
    try {
      const res = await fetch('/api/billing/cancel-subscription', { method: 'POST' });
      let message = 'Could not cancel subscription.';
      try {
        const data = (await res.json()) as { error?: string };
        if (typeof data.error === 'string' && data.error.trim()) {
          message = data.error.trim();
        }
      } catch {
        /* ignore */
      }
      if (!res.ok) {
        setBillingActionError(message);
        return;
      }
      router.refresh();
    } catch {
      setBillingActionError('Something went wrong. Please try again.');
    } finally {
      setIsCancellingSubscription(false);
    }
  };

  const handleResumeSubscription = async () => {
    setBillingActionError(null);
    setIsResumingSubscription(true);
    try {
      const res = await fetch('/api/billing/resume-subscription', { method: 'POST' });
      let message = 'Could not resume subscription.';
      try {
        const data = (await res.json()) as { error?: string };
        if (typeof data.error === 'string' && data.error.trim()) {
          message = data.error.trim();
        }
      } catch {
        /* ignore */
      }
      if (!res.ok) {
        setBillingActionError(message);
        return;
      }
      router.refresh();
    } catch {
      setBillingActionError('Something went wrong. Please try again.');
    } finally {
      setIsResumingSubscription(false);
    }
  };

  const handleSkipTrial = async () => {
    setSkipTrialError(null);
    setCheckoutError(null);
    setIsSkippingTrial(true);
    try {
      const res = await fetch('/api/billing/skip-trial', { method: 'POST' });
      let message = 'Something went wrong.';
      try {
        const data = (await res.json()) as { error?: string };
        if (typeof data.error === 'string' && data.error.trim()) {
          message = data.error.trim();
        }
      } catch {
        /* ignore */
      }
      if (!res.ok) {
        setSkipTrialError(message);
        return;
      }
      router.refresh();
    } catch {
      setSkipTrialError('Something went wrong. Please try again.');
    } finally {
      setIsSkippingTrial(false);
    }
  };

  const handleCheckout = (planKey: BillingPlanKey, title: string) => {
    setActivePlanTitle(title);
    setCheckoutError(null);
    setSkipTrialError(null);

    const shouldChangeExistingPlan =
      hasActiveSubscription &&
      currentPlanKey != null &&
      currentPlanKey !== planKey;

    startTransition(async () => {
      try {
        if (shouldChangeExistingPlan) {
          const res = await fetch('/api/billing/update-subscription', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ plan: planKey })
          });
          let message = 'Plan change failed. Please try again.';
          let detail: string | undefined;
          try {
            const data = (await res.json()) as {
              error?: string;
              detail?: unknown;
            };
            if (typeof data.error === 'string' && data.error.trim()) {
              message = data.error.trim();
            }
            if (data.detail != null && typeof data.detail === 'object') {
              detail = JSON.stringify(data.detail).slice(0, 300);
            } else if (typeof data.detail === 'string') {
              detail = data.detail.slice(0, 300);
            }
          } catch {
            /* ignore */
          }
          if (!res.ok) {
            setCheckoutError(detail ? `${message} (${detail})` : message);
            setActivePlanTitle(null);
            return;
          }
          setActivePlanTitle(null);
          router.refresh();
          return;
        }

        const checkoutUrl = await getCheckoutURL(planKey);
        const opened =
          typeof window !== 'undefined' &&
          typeof window.LemonSqueezy?.Url?.Open === 'function';
        if (opened) {
          window.LemonSqueezy!.Url!.Open!(checkoutUrl);
          return;
        }
        window.location.assign(checkoutUrl);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to start checkout.';
        setCheckoutError(message);
        setActivePlanTitle(null);
      }
    });
  };

  return (
    <>
      <div className="mx-auto mt-10 grid w-full max-w-6xl grid-cols-1 items-stretch gap-4 md:grid-cols-3 md:gap-5 lg:gap-6">
        {PLANS.map((plan) => (
          <PlanGrantCard
            key={plan.title}
            title={plan.title}
            price={plan.price}
            billing={plan.billing}
            features={plan.features}
            planKey={plan.planKey}
            buttonClassName={plan.buttonClassName}
            badge={plan.badge}
            featured={plan.featured}
            ctaAbove={plan.ctaAbove}
            hasActiveSubscription={hasActiveSubscription}
            currentPlanStatusLabel={currentPlanStatusLabel}
            manageSubscriptionUrl={manageSubscriptionUrl}
            updatePaymentUrl={updatePaymentUrl}
            isCurrentPlan={currentPlanKey === plan.planKey}
            showResumeAction={showResumeAction}
            showUpdatePaymentAction={showUpdatePaymentAction}
            pastDueBillingAccent={pastDueBillingAccent}
            showSkipTrialAction={
              Boolean(isEligibleForSkipTrial) && currentPlanKey === plan.planKey
            }
            showNewSubscriberTrialPromo={showNewSubscriberTrialPromo}
            onCancelSubscription={handleCancelSubscription}
            isCancellingSubscription={isCancellingSubscription}
            onResumeSubscription={handleResumeSubscription}
            isResumingSubscription={isResumingSubscription}
            isSkippingTrial={isSkippingTrial}
            onSkipTrial={handleSkipTrial}
            isLoading={isPending && activePlanTitle === plan.title}
            isBusy={isBusy}
            onSelect={handleCheckout}
          />
        ))}
      </div>
      {checkoutError || skipTrialError || billingActionError ? (
        <div className="mx-auto mt-6 flex max-w-2xl flex-col gap-2 text-center text-sm">
          {checkoutError ? <p className="text-red-600">{checkoutError}</p> : null}
          {skipTrialError ? <p className="text-red-600">{skipTrialError}</p> : null}
          {billingActionError ? (
            <div className="flex flex-col items-center gap-3">
              <p className="text-red-600">{billingActionError}</p>
              {/** Portal URL is often missing in `raw_payload`; update-payment URL still opens Lemon hosted billing. */}
              {manageSubscriptionUrl || updatePaymentUrl ? (
                <button
                  type="button"
                  onClick={() =>
                    openLemonHostedUrl(
                      manageSubscriptionUrl ?? updatePaymentUrl ?? ''
                    )
                  }
                  className="inline-flex items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2"
                >
                  {manageSubscriptionUrl
                    ? 'Open billing portal'
                    : 'Open billing in Lemon'}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
