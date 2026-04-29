'use client';

import { useState } from 'react';
import clsx from 'clsx';

import { SiteFaqAccordion, type SiteFaqItem } from '@/components/ui/SiteFaqAccordion';

const MAX_VISIBLE = 3;

function truncateAnswer(text: string, maxChars = 260): string {
  const t = text.trim();
  if (t.length <= maxChars) return t;
  return `${t.slice(0, maxChars).trim()}…`;
}

type Props = {
  items: SiteFaqItem[];
  idPrefix?: string;
};

/**
 * Compact FAQ for SEO listings: first questions visible, rest behind “Show more”.
 * Answers shortened when very long (schema elsewhere unchanged).
 */
export default function SeoListingFaqExpandable({
  items,
  idPrefix = 'seo-listing-faq'
}: Props) {
  const [expanded, setExpanded] = useState(false);
  if (items.length === 0) return null;

  const displayItems = items.map((item) => ({
    question: item.question,
    answer: truncateAnswer(item.answer)
  }));

  const head = displayItems.slice(0, MAX_VISIBLE);
  const tail = displayItems.slice(MAX_VISIBLE);
  const showToggle = tail.length > 0;

  return (
    <section
      className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
      aria-labelledby={`${idPrefix}-heading`}
    >
      <h2
        id={`${idPrefix}-heading`}
        className="text-xl font-bold tracking-tight text-slate-900 md:text-2xl"
      >
        FAQ
      </h2>
      <div className="mt-4">
        <SiteFaqAccordion
          items={head}
          showHeading={false}
          as="div"
          headingToAccordionClassName="mt-0"
          idPrefix={`${idPrefix}-head`}
          initialOpenIndex={null}
          accordionClassName="rounded-xl border border-slate-200 shadow-sm"
          summaryClassName="py-3 text-sm font-semibold text-gray-900 hover:bg-slate-50 sm:px-4"
          answerClassName="text-sm leading-relaxed text-gray-600 sm:px-4 pb-4 pt-2"
        />
      </div>
      {showToggle ? (
        <>
          {expanded ? (
            <div className="mt-3 border-t border-slate-100 pt-3">
              <SiteFaqAccordion
                items={tail}
                showHeading={false}
                as="div"
                headingToAccordionClassName="mt-0"
                idPrefix={`${idPrefix}-tail`}
                initialOpenIndex={null}
                accordionClassName="rounded-xl border border-slate-200 shadow-sm"
                summaryClassName="py-3 text-sm font-semibold text-gray-900 hover:bg-slate-50 sm:px-4"
                answerClassName="text-sm leading-relaxed text-gray-600 sm:px-4 pb-4 pt-2"
              />
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className={clsx(
              'mt-3 text-sm font-semibold text-orange-600 underline decoration-orange-400/40 underline-offset-2 transition hover:text-orange-700'
            )}
          >
            {expanded ? 'Show less' : 'Show more'}
          </button>
        </>
      ) : null}
    </section>
  );
}
