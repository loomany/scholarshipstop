'use client';

import type { ReactNode } from 'react';
import { useEffect, useState, useTransition } from 'react';
import { Sparkles, Star } from 'lucide-react';

import Button from '@/components/ui/Button';
import { SCHOLARSHIP_ACTION_FOCUS_VISIBLE } from '@/lib/constants/scholarshipActionUi';
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
      };
    };
  }
}

/** Compact trial note — same language as `ScholarshipsEmailConfirmationBanner`. */
function PlanTrialBetweenFeaturesAndCta() {
  return (
    <div className="flex w-full max-w-md shrink-0 flex-col items-center justify-center border-t border-gray-100 pt-4 lg:w-[12rem] lg:max-w-[13rem] lg:min-w-[10.5rem] lg:items-stretch lg:border-l lg:border-t-0 lg:pl-3 lg:pr-0 lg:pt-0 xl:w-[13rem]">
      <div
        className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-xs shadow-sm sm:text-sm"
        role="status"
      >
        <p className="text-center leading-snug lg:text-left">
          <span className="block font-semibold text-zinc-900">
            🎁 3-Day Free Trial
          </span>
          <span className="mt-0.5 block text-zinc-600">
            included with all plans.
          </span>
        </p>
      </div>
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
  isCurrentPlan?: boolean;
  isLoading: boolean;
  isBusy: boolean;
  onSelect: (planKey: BillingPlanKey, title: string) => void;
};

type PlanConfig = Omit<PlanRowProps, 'isLoading' | 'isBusy' | 'onSelect'>;

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
  isCurrentPlan = false,
  isLoading,
  isBusy,
  onSelect
}: PlanRowProps) {
  const isDisabled = isBusy || isCurrentPlan;
  const buttonLabel = !isCurrentPlan
    ? hasActiveSubscription
      ? `Upgrade to ${title}`
      : 'Start Free Trial'
    : 'Active Plan';

  return (
    <article
      className={`group relative flex w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition duration-200 hover:border-gray-300 hover:shadow-lg focus-within:border-gray-300 focus-within:shadow-lg lg:w-fit ${
        featured ? 'shadow-md' : ''
      }`}
    >
      <div
        className="relative z-[1] w-1.5 shrink-0 self-stretch rounded-l-[0.75rem] bg-gray-900"
        aria-hidden
      />
      <div className="flex min-w-0 flex-1 flex-col items-center gap-4 p-4 sm:gap-5 sm:px-5 sm:py-5 lg:flex-row lg:items-stretch lg:gap-3">
        <div className="min-w-0 w-full shrink-0 text-center lg:w-[200px] lg:text-left xl:w-[220px]">
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 lg:justify-start">
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

        <div className="min-w-0 w-full flex-1 border-t border-gray-100 pt-4 lg:w-auto lg:max-w-[min(100%,22rem)] lg:flex-none lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
          <PlanFeatureList items={features} />
        </div>

        <PlanTrialBetweenFeaturesAndCta />

        <div className="flex w-full max-w-md shrink-0 flex-col items-center gap-2 border-t border-gray-100 pt-4 lg:max-w-none lg:w-44 lg:items-stretch lg:justify-center lg:border-l lg:border-t-0 lg:pl-3 lg:pt-0">
          {ctaAbove}
          <Button
            type="button"
            variant="slim"
            loading={isLoading}
            disabled={isDisabled}
            onClick={() => onSelect(planKey, title)}
            className={cn(
              'lemonsqueezy-button',
              'inline-flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-center text-sm font-semibold transition focus:outline-none disabled:cursor-not-allowed disabled:opacity-70',
              SCHOLARSHIP_ACTION_FOCUS_VISIBLE,
              buttonClassName
            )}
          >
            {isLoading ? 'Redirecting...' : buttonLabel}
          </Button>
        </div>
      </div>
    </article>
  );
}

const MONTHLY_FEATURES: string[] = [
  'Full access to AI scholarship matches',
  'Precision filters (intent, nationality)',
  'Save 20+ hours of manual research'
];

const QUARTERLY_FEATURES: string[] = [
  'Everything in Monthly, plus:',
  'Priority support & early grant alerts',
  'Track applications for the full season'
];

const YEARLY_FEATURES: string[] = [
  'Everything in Quarterly, plus:',
  'Lock in our maximum 52% discount',
  'Uninterrupted access for a full year'
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
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-amber-50/95 px-3 py-1 text-xs font-semibold text-amber-900 ring-1 ring-amber-200/60"
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
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-emerald-50/95 px-3 py-1 text-xs font-semibold text-emerald-900 ring-1 ring-emerald-200/70"
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
  hasActiveSubscription: hasActiveSubscriptionProp
}: {
  currentPlanKey?: BillingPlanKey | null;
  /** When set, overrides the legacy heuristic (`currentPlanKey !== null`). */
  hasActiveSubscription?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [activePlanTitle, setActivePlanTitle] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const isBusy = activePlanTitle !== null;
  const hasActiveSubscription =
    typeof hasActiveSubscriptionProp === 'boolean'
      ? hasActiveSubscriptionProp
      : currentPlanKey !== null;

  useEffect(() => {
    window.LemonSqueezy?.Setup?.({
      eventHandler: (event) => {
        if (event?.event === 'Checkout.Success') {
          setActivePlanTitle(null);
          setCheckoutError(null);
          window.location.assign('/scholarships');
        }
      }
    });
    window.LemonSqueezy?.Refresh?.();
  }, []);

  const handleCheckout = (planKey: BillingPlanKey, title: string) => {
    setActivePlanTitle(title);
    setCheckoutError(null);
    startTransition(async () => {
      try {
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
      <div className="mx-auto mt-10 flex max-w-full flex-col items-center gap-4">
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
            isCurrentPlan={currentPlanKey === plan.planKey}
            isLoading={isPending && activePlanTitle === plan.title}
            isBusy={isBusy}
            onSelect={handleCheckout}
          />
        ))}
      </div>
      {checkoutError ? (
        <p className="mx-auto mt-6 max-w-2xl text-center text-sm text-red-600">
          {checkoutError}
        </p>
      ) : null}
    </>
  );
}
