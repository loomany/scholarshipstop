'use client';

import Button from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createStripePortal } from '@/utils/stripe/server';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import { accountPagePrimaryButtonClass } from '@/lib/constants/scholarshipActionUi';
import { Tables } from '@/types_db';

type Subscription = Tables<'subscriptions'>;
type Price = Tables<'prices'>;
type Product = Tables<'products'>;

type SubscriptionWithPriceAndProduct = Subscription & {
  prices:
    | (Price & {
        products: Product | null;
      })
    | null;
};

interface Props {
  subscription: SubscriptionWithPriceAndProduct | null;
  variant?: 'default' | 'saas';
}

export default function CustomerPortalForm({
  subscription,
  variant = 'default'
}: Props) {
  const router = useRouter();
  const [currentPath, setCurrentPath] = useState('/');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setCurrentPath(window.location.pathname || '/');
  }, []);

  const subscriptionPrice =
    subscription &&
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: subscription?.prices?.currency ?? 'USD',
      minimumFractionDigits: 0
    }).format((subscription?.prices?.unit_amount || 0) / 100);

  const handleStripePortalRequest = async () => {
    setIsSubmitting(true);
    const redirectUrl = await createStripePortal(currentPath);
    setIsSubmitting(false);
    return router.push(redirectUrl);
  };

  const isPro = Boolean(subscription);

  if (variant === 'saas') {
    return (
      <div className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-[0_2px_24px_-8px_rgba(15,23,42,0.08)]">
        <h3 className="text-base font-semibold text-zinc-900">Plan & billing</h3>
        <p className="mt-1 text-sm text-zinc-500">
          {isPro
            ? 'You have full access to scholarship tools and details.'
            : 'Upgrade to unlock the full experience.'}
        </p>

        {isPro ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3">
              <p className="text-sm font-semibold text-emerald-900">Pro plan active</p>
              <p className="mt-1 text-sm text-emerald-800/90">
                {subscriptionPrice}/{subscription?.prices?.interval} —{' '}
                {subscription?.prices?.products?.name ?? 'Pro'}
              </p>
            </div>
            <ul className="space-y-2 text-sm text-zinc-600">
              <li className="flex gap-2">
                <span className="text-emerald-500">✓</span>
                Full listing details &amp; requirements
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-500">✓</span>
                Priority matching &amp; saved lists
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-500">✓</span>
                Manage payment method in the customer portal
              </li>
            </ul>
            <button
              type="button"
              onClick={handleStripePortalRequest}
              disabled={isSubmitting}
              className="rounded-xl border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-800 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 disabled:opacity-60"
            >
              {isSubmitting ? 'Opening…' : 'Open billing portal'}
            </button>
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            <div className="rounded-xl border border-amber-100 bg-amber-50/50 px-4 py-3">
              <p className="text-sm font-semibold text-zinc-900">You are on the Free plan</p>
              <p className="mt-1 text-sm text-zinc-600">
                Limited access to matches and scholarship details.
              </p>
            </div>
            <ul className="space-y-2 text-sm text-zinc-600">
              <li className="flex gap-2">
                <span className="text-zinc-400">—</span>
                Limited access to some listings
              </li>
              <li className="flex gap-2">
                <span className="text-zinc-400">—</span>
                No full requirement &amp; essay details on every grant
              </li>
            </ul>
            <div className="flex flex-wrap gap-3">
              <Link href="/" className={accountPagePrimaryButtonClass}>
                Upgrade to Pro 🔥
              </Link>
              <button
                type="button"
                onClick={handleStripePortalRequest}
                disabled={isSubmitting}
                className="rounded-xl border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60"
              >
                {isSubmitting ? 'Opening…' : 'I already subscribed — portal'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <Card
      title="Your Plan"
      description={
        subscription
          ? `You are currently on the ${subscription?.prices?.products?.name} plan.`
          : 'You are not currently subscribed to any plan.'
      }
      footer={
        <div className="flex flex-col items-start justify-between sm:flex-row sm:items-center">
          <p className="pb-4 text-zinc-600 sm:pb-0">
            Manage your subscription on Stripe.
          </p>
          <Button
            variant="slim"
            onClick={handleStripePortalRequest}
            loading={isSubmitting}
          >
            Open customer portal
          </Button>
        </div>
      }
    >
      <div className="mt-8 mb-4 text-xl font-semibold text-zinc-900">
        {subscription ? (
          `${subscriptionPrice}/${subscription?.prices?.interval}`
        ) : (
          <Link href="/" className="text-teal-700 hover:underline">
            Choose your plan
          </Link>
        )}
      </div>
    </Card>
  );
}
