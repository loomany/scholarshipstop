import clsx from 'clsx';

import ContinueScholarshipSearchCardGrid from '@/components/scholarships/ContinueScholarshipSearchCardGrid';
import {
  categoryListingBrowseWord,
  categoryListingFaqItems,
  categoryListingFaqSectionTitle
} from '@/app/scholarships/category/categoryListingSeoCopy';
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

type Props = {
  canonicalSlug: string;
  categoryId: ScholarshipCategoryId | null;
};

export default function ScholarshipCategoryPostListingSeo({
  canonicalSlug,
  categoryId
}: Props) {
  const categoryWordForFaq = categoryListingBrowseWord(categoryId, canonicalSlug);
  const faqItems = categoryListingFaqItems(categoryWordForFaq);
  const faqLd = categoryListingFaqPageJsonLd(faqItems);
  const faqSectionHeading = categoryListingFaqSectionTitle(categoryId, canonicalSlug);
  const idPrefix = `category-${canonicalSlug}-faq`;

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
