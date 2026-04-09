import type { Metadata } from 'next';
import Link from 'next/link';
import clsx from 'clsx';

import SiteFooter from '@/components/ui/Footer/SiteFooter';
import { siteNavLink as nav } from '@/components/ui/nav/siteNavLink';

export const metadata: Metadata = {
  title: 'Refund Policy | ScholarshipTop',
  description: 'Refund Policy for ScholarshipTop subscriptions and free trials.'
};

const sectionClass = 'mt-12 first:mt-10';
const h2Class = 'text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl';
const pClass = 'mt-4 text-base leading-relaxed text-zinc-700';
const listClass = 'mt-4 list-disc space-y-2 pl-6 text-base leading-relaxed text-zinc-700';

export default function RefundPolicyPage() {
  return (
    <>
      <article className="mx-auto max-w-[52rem] px-6 py-16 sm:py-20">
        <Link href="/" className={clsx(nav.legal, 'mb-6')}>
          ← Back to home
        </Link>
        <header className="border-b border-zinc-200 pb-10">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            Refund Policy
          </h1>
          <p className="mt-3 text-sm text-zinc-500">Last updated: April 9, 2026</p>
        </header>

        <div className="pt-10">
          <p className="text-base leading-relaxed text-zinc-700">
            This Refund Policy explains how free trials, cancellations, and
            subscription billing are handled for ScholarshipTop.
          </p>

          <section className={sectionClass} aria-labelledby="r1">
            <h2 id="r1" className={h2Class}>
              1. Free Trial
            </h2>
            <p className={pClass}>
              ScholarshipTop offers a 3-day free trial. You may cancel anytime
              during the trial period and you will not be charged.
            </p>
          </section>

          <section className={sectionClass} aria-labelledby="r2">
            <h2 id="r2" className={h2Class}>
              2. Subscription Cancellation
            </h2>
            <p className={pClass}>
              You can cancel your subscription at any time through your account
              dashboard or by contacting support.
            </p>
            <ul className={listClass}>
              <li>
                If you cancel during the free trial, your trial access will end
                without billing.
              </li>
              <li>
                If you cancel after a paid billing cycle has started, your access
                will continue until the end of the current paid period unless
                stated otherwise by law.
              </li>
            </ul>
          </section>

          <section className={sectionClass} aria-labelledby="r3">
            <h2 id="r3" className={h2Class}>
              3. Refunds
            </h2>
            <p className={pClass}>
              Because ScholarshipTop provides immediate access to digital content,
              including our scholarship database and premium tools, refunds are
              generally not provided after the free trial period ends and a paid
              billing cycle has started.
            </p>
            <p className={pClass}>
              If you believe you were charged in error, contact us at{' '}
              <a
                href="mailto:support@scholarshiptop.com"
                className="font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-4 transition hover:decoration-zinc-500"
              >
                support@scholarshiptop.com
              </a>{' '}
              and we will review the request.
            </p>
          </section>

          <section className={sectionClass} aria-labelledby="r4">
            <h2 id="r4" className={h2Class}>
              4. Contact
            </h2>
            <p className={pClass}>
              Email:{' '}
              <a
                href="mailto:support@scholarshiptop.com"
                className="font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-4 transition hover:decoration-zinc-500"
              >
                support@scholarshiptop.com
              </a>{' '}
              | Address: IE Daur Mussatay, Karaganda, 10000, Kazakhstan
            </p>
          </section>
        </div>
      </article>
      <SiteFooter />
    </>
  );
}
