'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { ChevronDown } from 'lucide-react';

export type SiteFaqItem = { question: string; answer: string };

export type SiteFaqAccordionProps = {
  items: SiteFaqItem[];
  /** Section / block title. Default `FAQ`. */
  heading?: string;
  /** Applied to the `<h2>` when `showHeading` is true. */
  headingClassName?: string;
  /** `id` on the heading for `aria-labelledby`. */
  headingId?: string;
  /** When false, only the bordered accordion is rendered (parent supplies the title). */
  showHeading?: boolean;
  /** Gap between heading and accordion. Default `mt-6`. */
  headingToAccordionClassName?: string;
  /** Wrapper when `showHeading` is true. Default `section`. */
  as?: 'section' | 'div';
  className?: string;
  /** Classes on the bordered accordion box. */
  accordionClassName?: string;
  idPrefix?: string;
  /** Initially open panel; `null` = all closed. Default `0`. */
  initialOpenIndex?: number | null;
};

/**
 * Unified FAQ accordion: one rounded bordered container, row dividers, chevron toggles.
 * Used across the site except the standalone `/faq` marketing page.
 */
export function SiteFaqAccordion({
  items,
  heading = 'FAQ',
  headingClassName = 'text-xl font-bold tracking-tight text-gray-900',
  headingId = 'site-faq-heading',
  showHeading = true,
  headingToAccordionClassName = 'mt-6',
  as: Tag = 'section',
  className,
  accordionClassName,
  idPrefix = 'site-faq',
  initialOpenIndex = 0
}: SiteFaqAccordionProps) {
  const [open, setOpen] = useState<number | null>(initialOpenIndex);

  if (items.length === 0) return null;

  const accordion = (
    <div
      className={clsx(
        'divide-y divide-gray-200 rounded-2xl border border-gray-200 bg-white',
        accordionClassName
      )}
    >
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={`${i}-${item.question.slice(0, 24)}`}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left text-sm font-semibold text-gray-900 transition hover:bg-gray-50/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-500/35 sm:px-5"
              aria-expanded={isOpen}
              id={`${idPrefix}-q-${i}`}
              aria-controls={`${idPrefix}-a-${i}`}
            >
              <span className="min-w-0 flex-1 pr-2">{item.question}</span>
              <ChevronDown
                className={clsx(
                  'h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200',
                  isOpen ? 'rotate-180' : ''
                )}
                aria-hidden
              />
            </button>
            <div
              id={`${idPrefix}-a-${i}`}
              role="region"
              aria-labelledby={`${idPrefix}-q-${i}`}
              className={clsx(
                'border-t border-gray-100 px-4 text-sm leading-relaxed text-gray-600 sm:px-5',
                isOpen ? 'pb-4 pt-3' : 'hidden'
              )}
            >
              {item.answer}
            </div>
          </div>
        );
      })}
    </div>
  );

  if (!showHeading) {
    return <div className={className}>{accordion}</div>;
  }

  return (
    <Tag
      className={className}
      {...(headingId ? { 'aria-labelledby': headingId } : {})}
    >
      <h2 id={headingId} className={headingClassName}>
        {heading}
      </h2>
      <div className={headingToAccordionClassName}>{accordion}</div>
    </Tag>
  );
}
