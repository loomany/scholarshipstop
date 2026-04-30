import type { Metadata } from 'next';
import Link from 'next/link';
import clsx from 'clsx';
import { Building, FileText, HeartHandshake, Target } from 'lucide-react';

import PartnerRequestAccess from '@/components/submit-grant/PartnerRequestAccess';
import { siteNavLink as nav } from '@/components/ui/nav/siteNavLink';
import { getCanonical } from '@/lib/seo/canonical';

const description =
  'Request a verified organization account on ScholarshipTop. Access your partner dashboard to publish and manage scholarship programs.';

const canonical = getCanonical('/submit-grant');

export const metadata: Metadata = {
  title: 'Request an Organization Account',
  description,
  alternates: { canonical },
  openGraph: {
    title: 'Request an Organization Account | ScholarshipTop',
    description,
    url: canonical,
    type: 'website',
    siteName: 'ScholarshipTop',
    locale: 'en_US',
    images: [{ url: '/logo-preview.png', width: 1200, height: 630, alt: 'ScholarshipTop Logo' }]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Request an Organization Account | ScholarshipTop',
    description,
    images: ['/logo-preview.png']
  }
};

const PARTNER_BENEFITS: {
  icon: typeof Building;
  title: string;
  description: string;
}[] = [
  {
    icon: Building,
    title: 'Verified Profile',
    description:
      'A dedicated page for your university or foundation.'
  },
  {
    icon: FileText,
    title: 'Easy Management',
    description:
      'Publish, edit, and manage your grants in one place.'
  },
  {
    icon: Target,
    title: 'Targeted Reach',
    description:
      'Ensure your scholarships are seen by the right candidates.'
  },
  {
    icon: HeartHandshake,
    title: 'Priority Support',
    description: 'Direct assistance from our team.'
  }
];

export default function SubmitGrantPage() {
  return (
    <>
      <div className="min-h-[calc(100dvh-5rem)] bg-white pb-16 pt-10 sm:pb-20 sm:pt-14">
        <div className="mx-auto max-w-2xl px-6">
          <Link href="/for-organizations" className={clsx(nav.legal, 'mb-8')}>
            ← For organizations
          </Link>

          <header className="max-w-xl">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Request an Organization Account
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-gray-600 sm:text-xl sm:leading-relaxed">
              Join ScholarshipTop as a verified partner. Request an account to
              access your organization dashboard, where you can easily publish,
              manage, and update your scholarship programs.
            </p>
          </header>

          <div className="mt-10 rounded-2xl border border-gray-200 bg-gray-50 p-6 shadow-[0_4px_20px_-10px_rgba(15,23,42,0.07)] sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Partner benefits
            </p>
            <ul className="mt-6 list-none space-y-5 p-0">
              {PARTNER_BENEFITS.map(({ icon: Icon, title, description }) => (
                <li key={title} className="flex gap-3 sm:gap-3.5">
                  <span
                    className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white ring-1 ring-gray-200/80"
                    aria-hidden
                  >
                    <Icon
                      className="h-[1.125rem] w-[1.125rem] text-orange-500 sm:h-5 sm:w-5"
                      strokeWidth={2}
                    />
                  </span>
                  <div className="min-w-0">
                    <p className="text-base font-semibold leading-snug text-gray-900">
                      {title}
                      <span className="font-normal text-gray-600">
                        : {description}
                      </span>
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            <PartnerRequestAccess />
          </div>

          <p className="mt-10 text-base leading-relaxed text-gray-600">
            You can also start from the{' '}
            <Link
              href="/for-organizations"
              className="font-medium text-orange-600 underline-offset-4 hover:underline"
            >
              For organizations
            </Link>{' '}
            overview.
          </p>
        </div>
      </div>
    </>
  );
}
