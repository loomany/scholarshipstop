'use client';

import { BrainCircuit } from 'lucide-react';
import type { ElementType, ReactNode } from 'react';

import HomePrimaryCtaClient from '@/components/home/HomePrimaryCtaClient';
import type { LocalizedUiLocale } from '@/lib/i18n/localizedHref';

type ScholarshipMatchCtaCardProps = {
  locale?: LocalizedUiLocale;
  kicker?: string;
  heading: string;
  button: ReactNode;
  className?: string;
  as?: ElementType;
  ariaLabel?: string;
  headingId?: string;
};

/** Shared “Match workspace” CTA — mobile layout matches scholarship detail reference card. */
export default function ScholarshipMatchCtaCard({
  locale = 'en',
  kicker = 'Match workspace',
  heading,
  button,
  className = '',
  as: Tag = 'div',
  ariaLabel,
  headingId
}: ScholarshipMatchCtaCardProps) {
  return (
    <Tag
      className={`rounded-lg border border-slate-200 bg-white p-4 shadow-sm ring-1 ring-slate-100/80 sm:p-5 ${className}`.trim()}
      aria-label={ariaLabel}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-center text-xs font-bold uppercase tracking-[0.14em] text-slate-500 sm:text-left">
            {kicker}
          </p>
          <div className="mt-1 flex items-center justify-center gap-2 sm:justify-start">
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-orange-50 text-orange-700 ring-1 ring-orange-100 sm:h-10 sm:w-10 sm:rounded-lg"
              aria-hidden
            >
              <BrainCircuit className="h-4 w-4 sm:h-5 sm:w-5" />
            </span>
            <p
              id={headingId}
              className="text-center text-base font-bold leading-tight tracking-tight text-slate-950 sm:text-left sm:text-lg"
            >
              {heading}
            </p>
          </div>
        </div>
        {typeof button === 'string' ? (
          <HomePrimaryCtaClient
            locale={locale}
            className="inline-flex min-h-10 w-full shrink-0 items-center justify-center rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_34px_-24px_rgba(15,23,42,0.85)] transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/70 sm:w-auto"
          >
            {button}
          </HomePrimaryCtaClient>
        ) : (
          button
        )}
      </div>
    </Tag>
  );
}

export const scholarshipMatchCtaButtonClass =
  'inline-flex min-h-10 w-full shrink-0 items-center justify-center rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_34px_-24px_rgba(15,23,42,0.85)] transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/70 sm:w-auto';
