import clsx from 'clsx';
import Link from 'next/link';

import ContinueScholarshipSearchCardGrid from '@/components/scholarships/ContinueScholarshipSearchCardGrid';
import {
  categoryListingBrowseWord,
  categoryListingFaqItems,
  categoryListingFaqSectionTitle
} from '@/app/scholarships/category/categoryListingSeoCopy';
import {
  resolveCategoryExpertContent,
  type CategoryExpertContent
} from '@/app/scholarships/category/categoryExpertContent';
import type { ScholarshipCategoryId } from '@/app/scholarships/scholarshipCategories';

function categoryListingFaqPageJsonLd(
  faq: { question: string; answer: string }[]
): Record<string, unknown> | null {
  if (faq.length === 0) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer
      }
    }))
  };
}

function categoryHowThisPageWorksText(
  expertContent: CategoryExpertContent | null,
  categoryWord: string
): string {
  return (
    expertContent?.howThisPageWorks ??
    `This page helps you review ${categoryWord} scholarships from the ScholarshipTop catalog. Use filters to narrow results by deadline, award amount, GPA, eligibility, location, and application requirements before opening provider details.`
  );
}

function categoryChanceBullets(
  expertContent: CategoryExpertContent | null,
  categoryWord: string
): string[] {
  return (
    expertContent?.howToIncreaseChances ?? [
      `Focus first on ${categoryWord} scholarships where your background matches the listed eligibility requirements.`,
      'Compare deadlines and required materials before choosing which applications to prioritize.',
      'Prepare essays, transcripts, recommendation requests, and proof of enrollment before the final week.',
      'Confirm official provider requirements and submission instructions before applying.'
    ]
  );
}

function categoryGuideLink(
  categoryId: ScholarshipCategoryId | null
): { href: string; label: string; description: string } | null {
  if (categoryId !== 'medical') return null;
  return {
    href: '/resources/medical-scholarships-guide',
    label: 'Read the medical scholarships guide',
    description:
      'Get practical advice on healthcare scholarship eligibility, essays, documents, and application planning.'
  };
}

type Props = {
  canonicalSlug: string;
  categoryId: ScholarshipCategoryId | null;
};

export default function ScholarshipCategoryPostListingSeo({
  canonicalSlug,
  categoryId
}: Props) {
  const categoryWordForFaq = categoryListingBrowseWord(categoryId, canonicalSlug);
  const expertContent = resolveCategoryExpertContent(categoryId);
  const faqItems =
    expertContent?.faqItems ?? categoryListingFaqItems(categoryWordForFaq);
  const faqLd = categoryListingFaqPageJsonLd(faqItems);
  const faqSectionHeading = categoryListingFaqSectionTitle(categoryId, canonicalSlug);
  const idPrefix = `category-${canonicalSlug}-faq`;
  const howThisPageWorks = categoryHowThisPageWorksText(
    expertContent,
    categoryWordForFaq
  );
  const chanceBullets = categoryChanceBullets(expertContent, categoryWordForFaq);
  const guideLink = categoryGuideLink(categoryId);

  return (
    <>
      {faqLd ? (
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger -- FAQPage mirrors visible accordion below
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
        />
      ) : null}

      <section
        className="mt-8 grid max-w-5xl gap-4 lg:mx-auto lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
        aria-label={`How to use this ${categoryWordForFaq} scholarships page`}
      >
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-600">
            How this page works
          </p>
          <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-900">
            Compare scholarships with the listing tools above
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {howThisPageWorks}
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-orange-50/40 p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-600">
            How to increase your chances
          </p>
          <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-900">
            Choose applications with a stronger fit
          </h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
            {chanceBullets.map((bullet) => (
              <li key={bullet} className="flex gap-3">
                <span
                  className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500"
                  aria-hidden
                />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        </article>
      </section>

      {guideLink ? (
        <section className="mt-6 max-w-5xl lg:mx-auto" aria-label="Related guide">
          <Link
            href={guideLink.href}
            className="group block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F3F7FA]"
          >
            <span className="text-sm font-semibold text-blue-700 group-hover:text-blue-900">
              {guideLink.label}
            </span>
            <span className="mt-2 block text-sm leading-6 text-slate-600">
              {guideLink.description}
            </span>
          </Link>
        </section>
      ) : null}

      <section
        className="mt-6 grid max-w-5xl gap-3 sm:grid-cols-3 lg:mx-auto"
        aria-label="ScholarshipTop trust resources"
      >
        {[
          {
            href: '/scholarship-verification-methodology',
            label: 'Verification methodology',
            body: 'How we check source, deadline, eligibility, and application-path signals.'
          },
          {
            href: '/financial-aid-disclaimer',
            label: 'Financial aid disclaimer',
            body: 'Why final provider rules control eligibility, selection, and award payment.'
          },
          {
            href: '/scholarship-scam-warning',
            label: 'Scam warning signs',
            body: 'What to verify before paying fees or sharing sensitive information.'
          }
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/70 focus-visible:ring-offset-2"
          >
            <span className="text-sm font-semibold text-slate-950">
              {item.label}
            </span>
            <span className="mt-1 block text-xs leading-5 text-slate-600">
              {item.body}
            </span>
          </Link>
        ))}
      </section>

      <section
        className="mt-8 max-w-5xl lg:mx-auto"
        aria-labelledby={`${idPrefix}-heading`}
      >
        <h2
          id={`${idPrefix}-heading`}
          className="text-2xl font-bold tracking-tight text-slate-900"
        >
          {faqSectionHeading}
        </h2>
        <div className="mt-6 divide-y divide-gray-200 rounded-xl border border-gray-200 bg-white shadow-sm">
          {faqItems.map((item, i) => {
            const openDefault = i === 0;
            return (
              <details
                key={`${canonicalSlug}-faq-${i}`}
                className="group"
                open={openDefault}
              >
                <summary
                  className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 text-left text-sm font-semibold text-gray-900 transition marker:content-none hover:bg-gray-50/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-500/35 sm:px-5 [&::-webkit-details-marker]:hidden"
                  id={`${idPrefix}-q-${i}`}
                >
                  <span className="min-w-0 flex-1 pr-2">{item.question}</span>
                  <svg
                    className="h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 group-open:rotate-180"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </summary>
                <div
                  id={`${idPrefix}-a-${i}`}
                  role="region"
                  aria-labelledby={`${idPrefix}-q-${i}`}
                  className="border-t border-gray-100 px-4 pb-4 pt-3 text-sm leading-relaxed text-gray-600 sm:px-5"
                >
                  {item.answer}
                </div>
              </details>
            );
          })}
        </div>
      </section>

      <ContinueScholarshipSearchCardGrid
        idPrefix={`category-${canonicalSlug}-continue`}
        className={clsx('mt-10 max-w-5xl lg:mx-auto')}
      />
    </>
  );
}
