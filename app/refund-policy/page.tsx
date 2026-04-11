import type { Metadata } from 'next';
import Link from 'next/link';
import clsx from 'clsx';

import SiteFooter from '@/components/ui/Footer/SiteFooter';
import { siteNavLink as nav } from '@/components/ui/nav/siteNavLink';

export const metadata: Metadata = {
  title: 'Refund Policy',
  description: 'Refund Policy for Daur M. (Freebee KZ) and ScholarshipTop.'
};

const sectionClass = 'mt-12 first:mt-10';
const h2Class = 'text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl';
const pClass = 'mt-4 text-base leading-relaxed text-zinc-700';
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
            At ScholarshipTop, operated by Daur M. (Freebee KZ), we want
            you to be satisfied with our service.
          </p>

          <section className={sectionClass} aria-labelledby="r1">
            <h2 id="r1" className={h2Class}>
              1. Refund Window
            </h2>
            <p className={pClass}>
              You can request a full refund within 14 days of your initial
              purchase if you haven&apos;t extensively used the database.
            </p>
          </section>

          <section className={sectionClass} aria-labelledby="r2">
            <h2 id="r2" className={h2Class}>
              2. Free Trial
            </h2>
            <p className={pClass}>
              If you are on a 3-day free trial, you can cancel at any time before
              the trial ends to avoid being charged.
            </p>
          </section>

          <section className={sectionClass} aria-labelledby="r3">
            <h2 id="r3" className={h2Class}>
              3. How to Request
            </h2>
            <p className={pClass}>
              To request a refund or cancel your subscription, please contact us
              at{' '}
              <a
                href="mailto:support@scholarshiptop.com"
                className="font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-4 transition hover:decoration-zinc-500"
              >
                support@scholarshiptop.com
              </a>{' '}
              .
            </p>
          </section>

          <section className={sectionClass} aria-labelledby="r4">
            <h2 id="r4" className={h2Class}>
              4. Processing
            </h2>
            <p className={pClass}>
              Refunds are processed via our payment provider, LemonSqueezy.
            </p>
          </section>
        </div>
      </article>
      <SiteFooter />
    </>
  );
}
