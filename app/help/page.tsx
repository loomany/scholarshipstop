import type { Metadata } from 'next';
import Link from 'next/link';
import clsx from 'clsx';

import { siteNavLink as nav } from '@/components/ui/nav/siteNavLink';

export const metadata: Metadata = {
  title: 'Help',
  description: 'Help and support for ScholarshipTop users'
};

const sectionClass = 'mt-12 first:mt-10';
const h2Class =
  'text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl';
const pClass = 'mt-4 text-base leading-relaxed text-zinc-700';
const linkClass =
  'font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-4 transition hover:decoration-zinc-500';

export default function HelpPage() {
  return (
    <article className="mx-auto max-w-[52rem] px-6 py-16 sm:py-20">
      <Link href="/" className={clsx(nav.legal, 'mb-6')}>
        ← Back to home
      </Link>

      <header className="border-b border-zinc-200 pb-10">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          Help
        </h1>
        <p className="mt-4 text-base leading-relaxed text-zinc-700">
          Need help using ScholarshipTop?
        </p>
        <p className="mt-3 text-base leading-relaxed text-zinc-700">
          This page explains the basics of how the platform works and where to
          go if you need support.
        </p>
      </header>

      <div className="pt-10">
        <section className={sectionClass} aria-labelledby="help-using">
          <h2 id="help-using" className={h2Class}>
            Using ScholarshipTop
          </h2>
          <p className={pClass}>
            ScholarshipTop helps you discover scholarship opportunities, explore
            listings, and see scholarship recommendations based on the
            information in your profile.
          </p>
          <p className={pClass}>
            You can browse scholarships, review deadlines, and save opportunities
            you want to come back to later.
          </p>
        </section>

        <section className={sectionClass} aria-labelledby="help-profile">
          <h2 id="help-profile" className={h2Class}>
            Profile and Matching
          </h2>
          <p className={pClass}>
            Your profile helps ScholarshipTop show more relevant scholarship
            recommendations.
          </p>
          <p className={pClass}>
            The more accurate your profile information is, the better your
            matches may be.
          </p>
        </section>

        <section className={sectionClass} aria-labelledby="help-saved">
          <h2 id="help-saved" className={h2Class}>
            Saved Scholarships
          </h2>
          <p className={pClass}>
            You can save scholarships to keep track of the opportunities that
            matter most to you.
          </p>
          <p className={pClass}>
            Saved scholarships make it easier to return later and stay organized
            while exploring options.
          </p>
        </section>

        <section className={sectionClass} aria-labelledby="help-eligibility">
          <h2 id="help-eligibility" className={h2Class}>
            Eligibility and Results
          </h2>
          <p className={pClass}>
            ScholarshipTop helps surface scholarship opportunities, but we do not
            guarantee eligibility, acceptance, or funding results.
          </p>
          <p className={pClass}>
            Final decisions are made by scholarship providers.
          </p>
        </section>

        <section className={sectionClass} aria-labelledby="help-support">
          <h2 id="help-support" className={h2Class}>
            Need Support?
          </h2>
          <p className={pClass}>
            If you need help with your account or have a support question,
            contact us at:{' '}
            <a href="mailto:support@scholarshiptop.com" className={linkClass}>
              support@scholarshiptop.com
            </a>
          </p>
        </section>

        <p className={`${pClass} mt-12 text-zinc-800`}>
          We&apos;re working to make scholarship search simpler, faster, and
          easier to manage.
        </p>

        <Link href="/" className={clsx(nav.legal, 'mt-10')}>
          ← Back to home
        </Link>
      </div>
    </article>
  );
}
