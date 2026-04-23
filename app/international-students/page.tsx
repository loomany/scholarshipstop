import type { Metadata } from 'next';
import Link from 'next/link';

import { homePrimaryCtaClass } from '@/components/home/homeMarketingCtaClasses';
import SiteFooter from '@/components/ui/Footer/SiteFooter';
import { SiteFaqAccordion, type SiteFaqItem } from '@/components/ui/SiteFaqAccordion';
import { getURL } from '@/utils/helpers';

const container = 'mx-auto w-full max-w-7xl';

const homeSectionPadX =
  'pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] sm:pl-6 sm:pr-6';

const ledeMuted =
  'text-lg leading-relaxed text-gray-600 sm:text-xl sm:leading-relaxed';

const h2Section =
  'text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl lg:text-[2.35rem] lg:leading-[1.15] xl:text-[2.5rem]';

const pageDescription =
  'Find scholarships open to international students and F1 visa holders in the USA. Filter by eligibility, country, and degree level. Updated listings with official application links.';

const pageCanonical = getURL('international-students');
const getScholarshipsCtaPath = '/get-scholarships';

export const metadata: Metadata = {
  title: 'Scholarships for International Students in the USA 2026 | ScholarshipTop',
  description: pageDescription,
  alternates: {
    canonical: pageCanonical
  },
  openGraph: {
    title: 'Scholarships for International Students in the USA 2026 | ScholarshipTop',
    description: pageDescription,
    url: pageCanonical,
    type: 'website',
    siteName: 'ScholarshipTop',
    locale: 'en_US',
    images: [
      {
        url: '/logo-preview.png',
        width: 1200,
        height: 630,
        alt: 'ScholarshipTop Logo'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Scholarships for International Students in the USA 2026 | ScholarshipTop',
    description: pageDescription,
    images: ['/logo-preview.png']
  }
};

const painPoints = [
  {
    icon: '❌',
    title: 'Most scholarships are US citizens only',
    body: "You spend hours reading eligibility rules — only to find out at the end you don't qualify."
  },
  {
    icon: '🔍',
    title: 'No real filter for F1 visa holders',
    body: "Big scholarship sites list everything together. There's no clean way to see only what's open to you."
  },
  {
    icon: '⏳',
    title: "Deadlines slip while you're still searching",
    body: 'By the time you find a good match, the deadline is already gone.'
  }
] as const;

const howWeHelpItems = [
  {
    title: 'International-only results',
    body: 'See only scholarships that accept international students.'
  },
  {
    title: 'Smart matching',
    body: 'We show scholarships based on your profile.'
  },
  {
    title: 'Deadline alerts',
    body: 'Never miss an application again.'
  }
] as const;

const whatYouGetBullets = [
  'Only scholarships you qualify for',
  'No wasted time reading eligibility rules',
  'Faster applications',
  'Clear deadlines'
] as const;

const trustPoints = [
  'Thousands of scholarships tracked',
  'Updated daily',
  'Built specifically for international students'
] as const;

const stats = [
  {
    value: '200+',
    label: 'Scholarships open to international students'
  },
  {
    value: '2 min',
    label: 'Average time to get your first matches'
  },
  {
    value: '$10,000+',
    label: 'Average award amount in our catalog'
  }
] as const;

const scholarshipTypes = [
  {
    title: 'University Merit Scholarships',
    body: 'Many US universities offer merit-based aid that is open to international applicants. These are often the largest awards.'
  },
  {
    title: 'Private Foundation Scholarships',
    body: 'Independent foundations fund scholarships with no citizenship requirement. We track hundreds of these.'
  },
  {
    title: 'Corporate Scholarships',
    body: 'Companies like Google, Boeing, and others run scholarship programs open to international STEM students.'
  },
  {
    title: 'No-Essay Scholarships',
    body: 'Fast-apply opportunities with minimal requirements — useful for building your application pipeline quickly.'
  }
] as const;

const faqItems: SiteFaqItem[] = [
  {
    question: 'Can I apply to US scholarships on an F1 visa?',
    answer:
      'Yes. Many private scholarships, foundation awards, and university programs are open to F1 visa holders. The key is finding ones that explicitly allow non-US citizens — which is exactly what our filter does.'
  },
  {
    question: 'Are there fully funded scholarships for international students?',
    answer:
      "Yes, though competitive. Fulbright, Hubert Humphrey, and many university-specific programs offer full tuition + living stipend. We list these and flag when they're open to your country."
  },
  {
    question: 'How is ScholarshipTop different from Fastweb or Scholarships.com?',
    answer:
      'Those platforms show all scholarships together with no clean international filter. We built a dedicated pathway for international students so you only see what you can actually apply to.'
  }
];

export default function InternationalStudentsPage() {
  return (
    <div className="bg-white text-gray-900 antialiased">
      <section
        className={`border-b border-gray-100 bg-white pt-10 pb-12 sm:pt-12 sm:pb-14 lg:pt-14 lg:pb-16 ${homeSectionPadX}`}
      >
        <div className={`${container} max-w-4xl text-center`}>
          <h1 className="text-pretty text-[clamp(1.8125rem,5.25vw+0.8rem,2.25rem)] font-bold leading-[1.08] tracking-tight text-gray-900 sm:text-5xl sm:leading-[1.06] lg:text-[3rem] lg:leading-[1.05]">
            Find scholarships you can actually apply to
          </h1>
          <p className={`mx-auto mt-5 max-w-3xl text-pretty sm:mt-6 ${ledeMuted}`}>
            Stop wasting time on scholarships you don’t qualify for. We show only
            opportunities open to international students.
          </p>
          <div className="mx-auto mt-8 flex max-w-2xl flex-col gap-4 sm:mt-10 sm:flex-row sm:justify-center sm:gap-5">
            <Link href={getScholarshipsCtaPath} className={homePrimaryCtaClass}>
              Find My Scholarships
            </Link>
          </div>
        </div>
      </section>

      <section
        className={`border-b border-gray-100 bg-gray-50 py-8 sm:py-10 ${homeSectionPadX}`}
        aria-label="Why trust ScholarshipTop"
      >
        <div className={`${container} max-w-5xl`}>
          <ul className="grid gap-4 sm:grid-cols-3 sm:gap-6">
            {trustPoints.map((line) => (
              <li
                key={line}
                className="flex items-start gap-3 rounded-2xl border border-gray-200/80 bg-white px-5 py-4 text-left text-sm font-medium text-gray-800 shadow-sm sm:flex-col sm:items-center sm:px-4 sm:py-5 sm:text-center"
              >
                <span
                  className="mt-0.5 text-lg text-emerald-600 sm:mt-0"
                  aria-hidden
                >
                  ✔
                </span>
                <span className="leading-snug sm:text-base">{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        className={`border-b border-gray-100 bg-white py-12 sm:py-14 lg:py-16 ${homeSectionPadX}`}
      >
        <div className={`${container} max-w-5xl`}>
          <h2 className={`text-center text-pretty ${h2Section}`}>
            Why international students struggle to find scholarships
          </h2>
          <div className="mt-10 grid gap-6 sm:mt-12 sm:grid-cols-3 sm:gap-7">
            {painPoints.map((item) => (
              <article
                key={item.title}
                className="flex min-h-[230px] items-start gap-4 rounded-2xl border border-gray-200 bg-white p-7 shadow-[0_4px_20px_-10px_rgba(15,23,42,0.07)] transition duration-200 hover:border-gray-300 hover:shadow-[0_10px_32px_-18px_rgba(15,23,42,0.11)]"
              >
                <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-2xl ring-1 ring-gray-100">
                  {item.icon}
                </span>
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold leading-snug tracking-tight text-gray-900">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-gray-600 sm:text-[0.9375rem]">
                    {item.body}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        className={`border-b border-gray-100 bg-gray-50 py-12 sm:py-14 lg:py-16 ${homeSectionPadX}`}
      >
        <div className={`${container} max-w-5xl`}>
          <h2 className={`text-center text-pretty ${h2Section}`}>
            Built for international students specifically
          </h2>
          <div className="mt-10 grid gap-6 sm:mt-12 sm:grid-cols-3 sm:gap-7">
            {howWeHelpItems.map((item) => (
              <article
                key={item.title}
                className="rounded-2xl border border-gray-200 bg-white p-7 shadow-[0_4px_20px_-10px_rgba(15,23,42,0.07)] transition duration-200 hover:border-gray-300 hover:shadow-[0_10px_32px_-18px_rgba(15,23,42,0.11)]"
              >
                <h3 className="text-lg font-semibold leading-snug tracking-tight text-gray-900">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-gray-600 sm:text-[0.9375rem]">
                  {item.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        className={`border-b border-gray-100 bg-white py-12 sm:py-14 lg:py-16 ${homeSectionPadX}`}
        aria-labelledby="what-you-get-heading"
      >
        <div className={`${container} max-w-2xl`}>
          <h2
            id="what-you-get-heading"
            className={`text-center text-pretty ${h2Section}`}
          >
            What you get with ScholarshipTop
          </h2>
          <ul className="mt-8 space-y-3 sm:mt-10 sm:space-y-3.5">
            {whatYouGetBullets.map((line) => (
              <li
                key={line}
                className="flex items-start gap-3 text-base leading-relaxed text-gray-700"
              >
                <span
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-900"
                  aria-hidden
                />
                {line}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        className={`border-b border-gray-100 bg-gray-50 py-10 sm:py-12 lg:py-14 ${homeSectionPadX}`}
      >
        <div className={`${container} max-w-5xl`}>
          <div className="grid gap-6 sm:grid-cols-3 sm:gap-7">
            {stats.map((stat) => (
              <div
                key={stat.value}
                className="rounded-2xl border border-gray-200 bg-white px-6 py-7 text-center shadow-[0_4px_20px_-10px_rgba(15,23,42,0.07)]"
              >
                <p className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                  {stat.value}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-gray-600 sm:text-[0.9375rem]">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        className={`border-b border-gray-100 bg-white py-12 sm:py-14 lg:py-16 ${homeSectionPadX}`}
      >
        <div className={`${container} max-w-5xl`}>
          <h2 className={`text-center text-pretty ${h2Section}`}>
            Real scholarships you can apply to
          </h2>
          <div className="mt-10 grid gap-6 sm:mt-12 sm:grid-cols-2 sm:gap-7">
            {scholarshipTypes.map((item) => (
              <article
                key={item.title}
                className="rounded-2xl border border-gray-200 bg-white p-7 shadow-[0_4px_20px_-10px_rgba(15,23,42,0.07)] transition duration-200 hover:border-gray-300 hover:shadow-[0_10px_32px_-18px_rgba(15,23,42,0.11)]"
              >
                <h3 className="text-lg font-semibold leading-snug tracking-tight text-gray-900">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-gray-600 sm:text-[0.9375rem]">
                  {item.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        className={`border-b border-gray-100 bg-gray-50 py-12 sm:py-14 lg:py-16 ${homeSectionPadX}`}
      >
        <div className={`${container} max-w-3xl`}>
          <SiteFaqAccordion
            items={faqItems}
            heading="Common questions from international students"
            headingClassName={`text-pretty text-center ${h2Section}`}
            headingId="international-students-faq-heading"
            headingToAccordionClassName="mt-8 sm:mt-10"
            idPrefix="international-students-faq"
            initialOpenIndex={0}
          />
        </div>
      </section>

      <section
        className={`border-b border-gray-200 bg-white py-14 sm:py-16 lg:py-20 ${homeSectionPadX}`}
        aria-labelledby="international-students-final-cta-heading"
      >
        <div className={`${container} max-w-3xl text-center`}>
          <h2
            id="international-students-final-cta-heading"
            className="text-pretty text-2xl font-bold leading-[1.1] tracking-tight text-gray-900 sm:text-4xl sm:leading-[1.08] lg:text-[2.5rem]"
          >
            Stop wasting time. Start applying.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-gray-600 sm:mt-5 sm:text-xl">
            Answer a few questions about your background and degree — we&apos;ll
            show you scholarships you&apos;re actually eligible for.
          </p>
          <Link
            href={getScholarshipsCtaPath}
            className={`mx-auto mt-9 w-full max-w-md sm:mt-10 sm:max-w-lg ${homePrimaryCtaClass}`}
          >
            Find My Scholarships
          </Link>
          <p className="mt-5 text-sm font-medium text-gray-500 sm:mt-6">
            Verified listings · No spam · Takes 2 minutes
          </p>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
