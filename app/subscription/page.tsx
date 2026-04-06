import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'How to Get Full Access to Premium Results'
};

export default function SubscriptionPage() {
  return (
    <section className="min-h-screen bg-zinc-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-3xl">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
            How to Get Full Access to Premium Results
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-600 sm:text-base">
            Subscribe to unlock the best recommendations and access to advanced
            filters for scholarships. We are offering you 3 days of free access
            to experience everything.
          </p>

          <div className="mt-6 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
            <p className="text-sm font-semibold text-emerald-900">
              3-day free access included
            </p>
            <p className="mt-1 text-sm text-emerald-800">
              Try premium recommendations first, then decide whether to continue.
            </p>
          </div>

          <h2 className="mt-8 text-lg font-semibold text-zinc-900">Benefits</h2>
          <ul className="mt-3 list-inside list-disc space-y-2 text-sm text-zinc-700 sm:text-base">
            <li>Best recommendations based on your profile</li>
            <li>Smart filters for more relevant scholarship results</li>
            <li>Easy apply options for quicker applications</li>
          </ul>

          <h2 className="mt-8 text-lg font-semibold text-zinc-900">Pricing</h2>
          <p className="mt-2 text-sm text-zinc-700 sm:text-base">
            Subscription cost: shown on the checkout page (monthly plan).
          </p>

          <h2 className="mt-8 text-lg font-semibold text-zinc-900">Cancellation</h2>
          <p className="mt-2 text-sm text-zinc-700 sm:text-base">
            You can cancel anytime with no further charges after cancellation.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-zinc-900 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800"
            >
              Continue to plans
            </Link>
            <Link
              href="/scholarships?tab=matches&scope=catalog"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
            >
              Maybe later
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
