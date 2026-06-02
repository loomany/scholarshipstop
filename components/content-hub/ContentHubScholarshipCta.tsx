import clsx from 'clsx';
import { ArrowRight, SearchCheck } from 'lucide-react';

import ScholarshipCatalogEntryLink from '@/components/scholarships/ScholarshipCatalogEntryLink';

const buttonClass =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-center text-sm font-semibold text-white shadow-[0_16px_34px_-24px_rgba(15,23,42,0.85)] transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/70';

export type ContentHubScholarshipCtaProps = {
  title: string;
  description: string;
  buttonText: string;
  className?: string;
};

export default function ContentHubScholarshipCta({
  title,
  description,
  buttonText,
  className
}: ContentHubScholarshipCtaProps) {
  const normalizedTitle = title
    .trim()
    .replace(/^[^A-Za-z0-9]+/, '')
    .trim();

  return (
    <aside
      className={clsx(
        'rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm ring-1 ring-slate-100/80 sm:p-5',
        className
      )}
      aria-label="Scholarship directory"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-700 ring-1 ring-orange-100">
            <SearchCheck className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
              Scholarship workspace
            </p>
            <p className="mt-1 text-base font-bold tracking-tight text-slate-950 sm:text-lg">
              {normalizedTitle}
            </p>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
              {description}
            </p>
          </div>
        </div>
        <ScholarshipCatalogEntryLink className={buttonClass}>
          {buttonText}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </ScholarshipCatalogEntryLink>
      </div>
    </aside>
  );
}
