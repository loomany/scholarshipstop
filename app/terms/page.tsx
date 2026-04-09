import type { Metadata } from 'next';
import Link from 'next/link';
import clsx from 'clsx';

import SiteFooter from '@/components/ui/Footer/SiteFooter';
import { siteNavLink as nav } from '@/components/ui/nav/siteNavLink';

export const metadata: Metadata = {
  title: 'Terms | ScholarshipTop',
  description: 'Terms of Use for ScholarshipTop'
};

const sectionClass = 'mt-12 first:mt-10';
const h2Class = 'text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl';
const pClass = 'mt-4 text-base leading-relaxed text-zinc-700';
const listClass = 'mt-4 list-disc space-y-2 pl-6 text-base leading-relaxed text-zinc-700';

export default function TermsPage() {
  return (
    <>
      <article className="mx-auto max-w-[52rem] px-6 py-16 sm:py-20">
        <Link href="/" className={clsx(nav.legal, 'mb-6')}>
          ← Back to home
        </Link>
        <header className="border-b border-zinc-200 pb-10">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            Terms of Service
          </h1>
          <p className="mt-3 text-sm text-zinc-500">Last updated: April 9, 2026</p>
        </header>

        <div className="pt-10">
          <p className="text-base leading-relaxed text-zinc-700">
            These Terms of Service govern your access to and use of
            ScholarshipTop, a service operated by IE Daur Mussatay (FREEBEE), and
            its related services. By using ScholarshipTop, you agree to these
            Terms.
          </p>

          <section className={sectionClass} aria-labelledby="t1">
            <h2 id="t1" className={h2Class}>
              1. Use of the Service
            </h2>
            <p className={pClass}>
              ScholarshipTop provides scholarship listings, filters, profile-based
              recommendations, and related tools to help users discover
              scholarship opportunities.
            </p>
            <p className={pClass}>
              You may use the service only for lawful and personal use.
            </p>
          </section>

          <section className={sectionClass} aria-labelledby="t2">
            <h2 id="t2" className={h2Class}>
              2. No Guarantee of Results
            </h2>
            <p className={pClass}>ScholarshipTop does not guarantee:</p>
            <ul className={listClass}>
              <li>scholarship eligibility</li>
              <li>acceptance by any scholarship provider</li>
              <li>funding decisions</li>
              <li>award outcomes</li>
            </ul>
            <p className={pClass}>
              All scholarship decisions are made by the scholarship providers, not
              by ScholarshipTop.
            </p>
          </section>

          <section className={sectionClass} aria-labelledby="t3">
            <h2 id="t3" className={h2Class}>
              3. User Information
            </h2>
            <p className={pClass}>
              You are responsible for providing accurate information in your
              account and profile. Inaccurate or incomplete information may affect
              recommendations and matching features.
            </p>
          </section>

          <section className={sectionClass} aria-labelledby="t4">
            <h2 id="t4" className={h2Class}>
              4. Accounts
            </h2>
            <p className={pClass}>
              If you create an account, you are responsible for maintaining the
              confidentiality of your login credentials and for any activity under
              your account.
            </p>
          </section>

          <section className={sectionClass} aria-labelledby="t5">
            <h2 id="t5" className={h2Class}>
              5. Scholarship Listings
            </h2>
            <p className={pClass}>
              ScholarshipTop may display scholarship information from various
              sources. While we aim to keep listings useful and current, we do not
              guarantee that all information is complete, accurate, or up to date
              at all times.
            </p>
            <p className={pClass}>
              Users should always review scholarship details carefully before
              applying.
            </p>
          </section>

          <section className={sectionClass} aria-labelledby="t6">
            <h2 id="t6" className={h2Class}>
              6. Acceptable Use
            </h2>
            <p className={pClass}>You agree not to:</p>
            <ul className={listClass}>
              <li>misuse the platform</li>
              <li>attempt unauthorized access</li>
              <li>copy, scrape, or exploit the service in a harmful way</li>
              <li>interfere with the security or operation of the website</li>
            </ul>
          </section>

          <section className={sectionClass} aria-labelledby="t7">
            <h2 id="t7" className={h2Class}>
              7. Paid Features and Billing
            </h2>
            <p className={pClass}>
              ScholarshipTop offers paid subscriptions and premium features
              through IE Daur Mussatay (FREEBEE). All payments are processed by
              Paddle, our Merchant of Record.
            </p>
            <p className={pClass}>
              By purchasing a subscription, you authorize Paddle to charge the
              applicable subscription fees, taxes, and renewal charges according
              to the plan you select.
            </p>
            <p className={pClass}>
              Subscription cancellations, billing disputes, and refund handling
              are subject to our{' '}
              <Link
                href="/refund-policy"
                className="font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-4 transition hover:decoration-zinc-500"
              >
                Refund Policy
              </Link>
              .
            </p>
          </section>

          <section className={sectionClass} aria-labelledby="t8">
            <h2 id="t8" className={h2Class}>
              8. Intellectual Property
            </h2>
            <p className={pClass}>
              The ScholarshipTop website, design, text, branding, and related
              content are owned by IE Daur Mussatay (FREEBEE) or used with
              permission. You may not reproduce or distribute protected content
              without authorization.
            </p>
          </section>

          <section className={sectionClass} aria-labelledby="t9">
            <h2 id="t9" className={h2Class}>
              9. Disclaimer
            </h2>
            <p className={pClass}>
              ScholarshipTop, operated by IE Daur Mussatay (FREEBEE), is provided
              on an &quot;as is&quot; and &quot;as available&quot; basis. We do not
              guarantee uninterrupted access, error-free performance, or specific
              results from using the service.
            </p>
          </section>

          <section className={sectionClass} aria-labelledby="t10">
            <h2 id="t10" className={h2Class}>
              10. Limitation of Liability
            </h2>
            <p className={pClass}>
              To the maximum extent permitted by law, IE Daur Mussatay (FREEBEE)
              will not be liable for indirect, incidental, special,
              consequential, or reliance-based damages arising out of your use of
              the service.
            </p>
          </section>

          <section className={sectionClass} aria-labelledby="t11">
            <h2 id="t11" className={h2Class}>
              11. Changes to These Terms
            </h2>
            <p className={pClass}>
              We may update these Terms from time to time. If we do, we will post
              the revised version on this page and update the &quot;Last
              updated&quot; date.
            </p>
          </section>

          <section className={sectionClass} aria-labelledby="t12">
            <h2 id="t12" className={h2Class}>
              12. Contact
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

          <p className={`${pClass} mt-14 border-t border-zinc-200 pt-10 text-zinc-800`}>
            By using ScholarshipTop, you agree to these Terms of Service.
          </p>

          <Link href="/" className={clsx(nav.legal, 'mt-10')}>
            ← Back to home
          </Link>
        </div>
      </article>
      <SiteFooter />
    </>
  );
}
