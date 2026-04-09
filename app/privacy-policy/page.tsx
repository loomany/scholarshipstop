import type { Metadata } from 'next';
import Link from 'next/link';
import clsx from 'clsx';

import SiteFooter from '@/components/ui/Footer/SiteFooter';
import { siteNavLink as nav } from '@/components/ui/nav/siteNavLink';

export const metadata: Metadata = {
  title: 'Privacy Policy | ScholarshipTop',
  description: 'Privacy Policy for ScholarshipTop'
};

const sectionClass = 'mt-12 first:mt-10';
const h2Class = 'text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl';
const pClass = 'mt-4 text-base leading-relaxed text-zinc-700';
const listClass = 'mt-4 list-disc space-y-2 pl-6 text-base leading-relaxed text-zinc-700';

export default function PrivacyPolicyPage() {
  return (
    <>
      <article className="mx-auto max-w-[52rem] px-6 py-16 sm:py-20">
        <Link href="/" className={clsx(nav.legal, 'mb-6')}>
          ← Back to home
        </Link>
        <header className="border-b border-zinc-200 pb-10">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            Privacy Policy
          </h1>
          <p className="mt-3 text-sm text-zinc-500">Last updated: April 9, 2026</p>
        </header>

        <div className="pt-10">
          <p className="text-base leading-relaxed text-zinc-700">
            ScholarshipTop, operated by IE Daur Mussatay (FREEBEE), values your
            privacy. This Privacy Policy explains what information we collect, how
            we use it, and how we protect it when you use our website and related
            services.
          </p>

          <section className={sectionClass} aria-labelledby="s1">
            <h2 id="s1" className={h2Class}>
              1. Information We Collect
            </h2>
            <p className={pClass}>
              We may collect information you provide directly to us, including:
            </p>
            <ul className={listClass}>
              <li>your name</li>
              <li>email address</li>
              <li>
                profile details such as school level, field of study, GPA,
                citizenship, and related scholarship preference data
              </li>
              <li>account and login information</li>
              <li>information you submit when contacting us</li>
            </ul>
            <p className={pClass}>
              We may also collect limited technical information automatically, such
              as:
            </p>
            <ul className={listClass}>
              <li>browser type</li>
              <li>device type</li>
              <li>IP address</li>
              <li>pages visited</li>
              <li>usage activity on our website</li>
            </ul>
          </section>

          <section className={sectionClass} aria-labelledby="s2">
            <h2 id="s2" className={h2Class}>
              2. How We Use Your Information
            </h2>
            <p className={pClass}>We may use your information to:</p>
            <ul className={listClass}>
              <li>create and manage your account</li>
              <li>personalize scholarship recommendations</li>
              <li>improve search, matching, and user experience</li>
              <li>communicate with you about your account or updates</li>
              <li>maintain security and prevent abuse</li>
              <li>analyze product usage and improve our services</li>
            </ul>
          </section>

          <section className={sectionClass} aria-labelledby="s3">
            <h2 id="s3" className={h2Class}>
              3. Scholarship Data and Recommendations
            </h2>
            <p className={pClass}>
              ScholarshipTop may display scholarship listings, filters, and
              recommendation features based on the information you provide in your
              profile. While we aim to improve relevance and accuracy, we do not
              guarantee scholarship eligibility, award decisions, or acceptance
              outcomes.
            </p>
          </section>

          <section className={sectionClass} aria-labelledby="s4">
            <h2 id="s4" className={h2Class}>
              4. Cookies and Analytics
            </h2>
            <p className={pClass}>
              We may use cookies or similar technologies to improve website
              performance, remember preferences, and understand how users interact
              with our service.
            </p>
          </section>

          <section className={sectionClass} aria-labelledby="s5">
            <h2 id="s5" className={h2Class}>
              5. How We Share Information
            </h2>
            <p className={pClass}>We do not sell your personal information.</p>
            <p className={pClass}>
              We may share limited information with service providers that help us
              operate the website, such as hosting, analytics, authentication,
              database, and payment providers, only as needed to run the service.
            </p>
            <p className={pClass}>
              We use LemonSqueezy for payment processing. We do not store your credit
              card details. Your personal data shared with LemonSqueezy is processed
              according to{' '}
              <a
                href="https://www.lemonsqueezy.com/privacy"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-4 transition hover:decoration-zinc-500"
              >
                LemonSqueezy&apos;s Privacy Policy
              </a>
              .
            </p>
            <p className={pClass}>
              We may also disclose information if required by law or to protect
              our rights, users, or platform.
            </p>
          </section>

          <section className={sectionClass} aria-labelledby="s6">
            <h2 id="s6" className={h2Class}>
              6. Data Storage and Security
            </h2>
            <p className={pClass}>
              We take reasonable steps to protect your information. However, no
              method of transmission or storage is completely secure, and we cannot
              guarantee absolute security.
            </p>
          </section>

          <section className={sectionClass} aria-labelledby="s7">
            <h2 id="s7" className={h2Class}>
              7. Your Choices
            </h2>
            <p className={pClass}>You may choose to:</p>
            <ul className={listClass}>
              <li>update or correct your profile information</li>
              <li>stop using the service at any time</li>
              <li>contact us regarding your account or personal data</li>
            </ul>
          </section>

          <section className={sectionClass} aria-labelledby="s8">
            <h2 id="s8" className={h2Class}>
              8. Children&apos;s Privacy
            </h2>
            <p className={pClass}>
              ScholarshipTop is intended for students and users researching
              scholarships. If you believe personal information has been submitted
              inappropriately, please contact us so we can review and address the
              issue.
            </p>
          </section>

          <section className={sectionClass} aria-labelledby="s9">
            <h2 id="s9" className={h2Class}>
              9. Changes to This Policy
            </h2>
            <p className={pClass}>
              We may update this Privacy Policy from time to time. If we make
              material changes, we will post the updated version on this page and
              update the &quot;Last updated&quot; date.
            </p>
          </section>

          <section className={sectionClass} aria-labelledby="s10">
            <h2 id="s10" className={h2Class}>
              10. Contact Us
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
            By using ScholarshipTop, you agree to this Privacy Policy.
          </p>
        </div>
      </article>
      <SiteFooter />
    </>
  );
}
