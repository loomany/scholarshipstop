import Link from 'next/link';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Sparkles, Star } from 'lucide-react';

import { SCHOLARSHIP_ACTION_FOCUS_VISIBLE } from '@/lib/constants/scholarshipActionUi';
import { cn } from '@/utils/cn';

export const metadata: Metadata = {
  title: 'Unlock Premium Precision'
};

/** Compact trial note — same language as `ScholarshipsEmailConfirmationBanner`. */
function PlanTrialBetweenFeaturesAndCta() {
  return (
    <div className="flex w-full shrink-0 flex-col justify-center border-t border-gray-100 pt-4 lg:w-[12rem] lg:min-w-[10.5rem] lg:max-w-[13rem] lg:border-l lg:border-t-0 lg:pl-3 lg:pr-0 lg:pt-0 xl:w-[13rem]">
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
      className="flex flex-col gap-1.5 justify-center text-left"
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
  href: string;
  /** Stronger shadow / emphasis (yearly). */
  featured?: boolean;
  /** e.g. “Most Popular” above the CTA in the right column */
  ctaAbove?: ReactNode;
};

function PlanGrantCard({
  title,
  badge,
  price,
  billing,
  features,
  buttonClassName,
  href,
  featured = false,
  ctaAbove
}: PlanRowProps) {
  return (
    <article
      className={`group relative flex w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition duration-200 hover:border-gray-300 hover:shadow-lg focus-within:border-gray-300 focus-within:shadow-lg lg:w-fit ${
        featured ? 'shadow-md' : ''
      }`}
    >
      {/* Same left accent as `ScholarshipCard` listing cards */}
      <div
        className="relative z-[1] w-1.5 shrink-0 self-stretch rounded-l-[0.75rem] bg-gray-900"
        aria-hidden
      />
      <div className="flex min-w-0 flex-1 flex-col gap-4 p-4 sm:gap-5 sm:px-5 sm:py-5 lg:flex-row lg:items-stretch lg:gap-3">
        {/* Left: plan + price */}
        <div className="min-w-0 shrink-0 lg:w-[200px] xl:w-[220px]">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
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

        {/* Middle: progressive features — no flex-1 on lg so trial sits closer to copy */}
        <div className="min-w-0 w-full flex-1 border-t border-gray-100 pt-4 lg:w-auto lg:max-w-[min(100%,22rem)] lg:flex-none lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
          <PlanFeatureList items={features} />
        </div>

        <PlanTrialBetweenFeaturesAndCta />

        {/* Right: optional label + CTA */}
        <div className="flex w-full shrink-0 flex-col gap-2 border-t border-gray-100 pt-4 lg:w-44 lg:max-w-[11rem] lg:justify-center lg:border-t-0 lg:border-l lg:pl-3 lg:pt-0">
          {ctaAbove}
          <Link
            href={href}
            className={cn(
              'inline-flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-center text-sm font-semibold transition focus:outline-none',
              SCHOLARSHIP_ACTION_FOCUS_VISIBLE,
              buttonClassName
            )}
          >
            Start Free Trial
          </Link>
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

export default function SubscriptionPage() {
  const trialHref = '/account';

  return (
    <section className="min-h-screen bg-zinc-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Unlock Premium Precision
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-base text-gray-500 sm:text-lg">
            Start your 3-day free trial today. Cancel anytime.
          </p>
        </header>

        <div className="mx-auto mt-10 flex max-w-full flex-col items-center gap-4">
          <PlanGrantCard
            title="Monthly"
            price="$25"
            billing="Billed $25 every month."
            features={MONTHLY_FEATURES}
            href={trialHref}
            buttonClassName="border border-gray-300 bg-white text-gray-900 hover:bg-gray-50"
          />

          <PlanGrantCard
            title="Quarterly"
            badge={
              <span className="shrink-0 rounded-full bg-[#FF7A1A]/18 px-2.5 py-0.5 text-xs font-semibold text-[#C2410C] ring-1 ring-[#FF7A1A]/35">
                Save 24%
              </span>
            }
            price="$19"
            billing="Billed $57 every 3 months."
            features={QUARTERLY_FEATURES}
            href={trialHref}
            buttonClassName="border border-[#FF7A1A] bg-[#FF7A1A] text-white shadow-sm hover:border-[#E6670C] hover:bg-[#E6670C] focus-visible:ring-[#FFB27D] focus-visible:ring-offset-2"
            ctaAbove={
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
            }
          />

          <PlanGrantCard
            title="Yearly"
            featured
            badge={
              <span className="shrink-0 rounded-full bg-emerald-500/18 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-500/35">
                Save 52% 🔥
              </span>
            }
            price="$12"
            billing="Billed $144 annually."
            features={YEARLY_FEATURES}
            href={trialHref}
            buttonClassName="border border-emerald-500 bg-emerald-500 text-white shadow-sm hover:border-emerald-600 hover:bg-emerald-600"
            ctaAbove={
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
            }
          />
        </div>

        <p className="mx-auto mt-10 max-w-2xl text-center text-xs text-gray-500">
          Secure payments processed by Lemon Squeezy.
        </p>
      </div>
    </section>
  );
}
