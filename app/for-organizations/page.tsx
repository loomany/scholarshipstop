import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  ClipboardList,
  Globe2,
  Inbox,
  LayoutDashboard,
  ShieldCheck,
  Users
} from 'lucide-react';

import { SiteFaqAccordion } from '@/components/ui/SiteFaqAccordion';
import { getURL } from '@/utils/helpers';

const container = 'mx-auto w-full max-w-7xl';

const homeSectionPadX =
  'pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] sm:pl-6 sm:pr-6';

const ledeMuted =
  'text-lg leading-relaxed text-gray-600 sm:text-xl sm:leading-relaxed';

const h2Section =
  'text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl lg:text-[2.35rem] lg:leading-[1.15] xl:text-[2.5rem]';

const heroPrimaryCtaClass =
  'inline-flex w-full cursor-pointer items-center justify-center rounded-2xl bg-black px-8 py-4 text-center text-lg font-semibold text-white shadow-[0_10px_36px_-10px_rgba(0,0,0,0.55)] transition duration-200 ease-out hover:scale-[1.03] hover:bg-zinc-900 hover:shadow-[0_18px_48px_-12px_rgba(0,0,0,0.48)] active:scale-[0.99] sm:w-auto sm:py-[1.25rem] sm:text-xl';

const orgDescription =
  'ScholarshipTop connects universities and foundations with motivated students worldwide. Publish your grants in one trusted place and reach candidates who are actively searching for funding.';

const pageCanonical = getURL('for-organizations');

export const metadata: Metadata = {
  title: 'For organizations',
  description: orgDescription,
  alternates: {
    canonical: pageCanonical
  },
  openGraph: {
    title: 'For organizations | ScholarshipTop',
    description: orgDescription,
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
    title: 'For organizations | ScholarshipTop',
    description: orgDescription,
    images: ['/logo-preview.png']
  }
};

const FAQ_ITEMS = [
  {
    question: 'How much does it cost to publish a grant?',
    answer:
      'Listing pricing may vary by program and volume. Contact us through the grant submission flow and we will share current options for universities and foundations.'
  },
  {
    question: 'How long does moderation take?',
    answer:
      'Most submissions are reviewed within a few business days. Complex listings or missing details may take longer—we will reach out if we need clarification.'
  },
  {
    question: 'Can I edit a grant after it is published?',
    answer:
      'Yes. Updates go through a quick review so students always see accurate deadlines and requirements. Reach out with changes through the same channel you used to submit.'
  },
  {
    question: 'Who can list grants on ScholarshipTop?',
    answer:
      'Accredited institutions, scholarship foundations, and other legitimate education funders. We verify publisher identity to keep listings trustworthy for students.'
  }
];

export default function ForOrganizationsPage() {
  return (
    <div className="bg-white text-gray-900 antialiased">
      {/* Hero */}
      <section
        className={`border-b border-gray-100 bg-white pt-10 pb-12 sm:pt-12 sm:pb-14 lg:pt-14 lg:pb-16 ${homeSectionPadX}`}
      >
        <div className={`${container} max-w-4xl text-center`}>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-orange-600">
            Universities &amp; foundations
          </p>
          <h1 className="mt-4 text-pretty text-[clamp(1.8125rem,5.25vw+0.8rem,2.25rem)] font-bold leading-[1.08] tracking-tight text-gray-900 sm:text-5xl sm:leading-[1.06] lg:text-[3rem] lg:leading-[1.05]">
            Reach global talent
          </h1>
          <p className={`mx-auto mt-5 max-w-2xl text-pretty sm:mt-6 ${ledeMuted}`}>
            ScholarshipTop is the best way to put your programs in front of
            students who are already searching for funding—so you find stronger
            applicants without extra noise.
          </p>
          <div className="mx-auto mt-9 flex flex-col items-center gap-4 sm:mt-10 sm:flex-row sm:justify-center sm:gap-5">
            <Link href="/submit-grant" className={heroPrimaryCtaClass}>
              Publish a grant
            </Link>
          </div>
        </div>
      </section>

      {/* Why us */}
      <section
        className={`border-b border-gray-100 bg-gray-50 py-12 sm:py-14 lg:py-16 ${homeSectionPadX}`}
      >
        <div className={`${container} max-w-5xl`}>
          <h2 className={`text-center text-pretty ${h2Section}`}>Why us</h2>
          <p
            className={`mx-auto mt-4 max-w-2xl text-center text-pretty ${ledeMuted}`}
          >
            Built for outcomes: relevance for students, visibility for your
            programs.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-3 sm:gap-7 lg:mt-12">
            {[
              {
                icon: Users,
                title: 'Targeted audience',
                body:
                  'Your programs surface to students who match your criteria—so outreach stays focused and applications are more meaningful.'
              },
              {
                icon: Globe2,
                title: 'Global reach',
                body:
                  'Connect with students from more than 50 countries who use ScholarshipTop to discover funding.'
              },
              {
                icon: LayoutDashboard,
                title: 'Simple management',
                body:
                  'A streamlined workflow today—with a dashboard for tracking interest and applications coming soon.'
              }
            ].map((card) => (
              <div
                key={card.title}
                className="group flex min-h-[200px] flex-col rounded-2xl border border-gray-200 bg-white p-7 text-center shadow-[0_4px_20px_-10px_rgba(15,23,42,0.07)] transition duration-200 hover:border-gray-300 hover:shadow-[0_10px_32px_-18px_rgba(15,23,42,0.11)] sm:min-h-[220px] sm:p-8 sm:text-left"
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-gray-50 text-gray-900 ring-1 ring-gray-100 transition group-hover:bg-gray-100/90 sm:mx-0">
                  <card.icon className="h-7 w-7" strokeWidth={2} aria-hidden />
                </div>
                <h3 className="mt-5 text-lg font-semibold leading-snug tracking-tight text-gray-900 sm:text-[1.125rem]">
                  {card.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-gray-600 sm:text-[0.9375rem]">
                  {card.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section
        className={`border-b border-gray-100 bg-white py-12 sm:py-14 lg:py-16 ${homeSectionPadX}`}
      >
        <div className={`${container} max-w-5xl`}>
          <h2 className={`text-center text-pretty ${h2Section}`}>
            How it works
          </h2>
          <p
            className={`mx-auto mt-4 max-w-2xl text-center text-pretty ${ledeMuted}`}
          >
            Three simple steps from form to live listing.
          </p>
          <ol className="mx-auto mt-10 grid max-w-3xl gap-8 sm:mt-12 sm:grid-cols-3 sm:gap-6 lg:gap-8">
            {[
              {
                title: 'Fill out the form',
                body: 'Share program details, eligibility, and deadlines in one structured submission.',
                icon: ClipboardList
              },
              {
                title: 'Quick moderation',
                body: 'We verify legitimacy and clarity so students can trust what they see.',
                icon: ShieldCheck
              },
              {
                title: 'Receive applications',
                body: 'Students discover your grant and apply through the channels you specify.',
                icon: Inbox
              }
            ].map((item) => (
              <li
                key={item.title}
                className="flex flex-col items-center text-center sm:items-stretch sm:text-left"
              >
                <div className="mb-3 flex justify-center sm:justify-start">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600 ring-1 ring-orange-100/80">
                    <item.icon
                      className="h-5 w-5"
                      strokeWidth={2}
                      aria-hidden
                    />
                  </span>
                </div>
                <h3 className="text-base font-semibold leading-snug text-gray-900 sm:text-lg">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600 sm:text-[0.9375rem]">
                  {item.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* FAQ */}
      <section
        className={`border-b border-gray-100 bg-gray-50 py-12 sm:py-14 lg:py-16 ${homeSectionPadX}`}
      >
        <div className={`${container} max-w-3xl`}>
          <SiteFaqAccordion
            items={FAQ_ITEMS}
            heading="Frequently asked questions"
            headingClassName={`text-pretty text-center ${h2Section}`}
            headingId="for-orgs-faq-heading"
            headingToAccordionClassName="mt-8 sm:mt-10"
            idPrefix="for-orgs-faq"
            initialOpenIndex={0}
          />
        </div>
      </section>

      {/* Final CTA */}
      <section
        className={`border-b border-gray-200 bg-white py-14 sm:py-16 lg:py-20 ${homeSectionPadX}`}
        aria-labelledby="for-orgs-final-cta-heading"
      >
        <div className={`${container} max-w-3xl text-center`}>
          <h2
            id="for-orgs-final-cta-heading"
            className="text-pretty text-2xl font-bold leading-[1.1] tracking-tight text-gray-900 sm:text-4xl sm:leading-[1.08] lg:text-[2.5rem]"
          >
            Ready to list your grant?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg font-medium leading-snug text-gray-600 sm:mt-5 sm:text-xl">
            Start the submission process—we will help you go live on
            ScholarshipTop.
          </p>
          <Link
            href="/submit-grant"
            className="mx-auto mt-9 inline-flex w-full max-w-md items-center justify-center gap-2 rounded-2xl bg-black px-8 py-[1.0625rem] text-center text-lg font-semibold text-white shadow-[0_6px_24px_-6px_rgba(0,0,0,0.22)] transition duration-200 ease-out hover:scale-[1.02] hover:bg-zinc-900 hover:shadow-[0_10px_30px_-8px_rgba(0,0,0,0.28)] active:scale-[0.99] sm:mt-10 sm:max-w-lg sm:py-5 sm:text-xl"
          >
            Get started now
            <ArrowRight className="h-5 w-5 shrink-0" aria-hidden />
          </Link>
        </div>
      </section>
    </div>
  );
}
