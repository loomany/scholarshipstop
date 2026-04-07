import Link from 'next/link';
import { Info, Star } from 'lucide-react';

import { cn } from '@/utils/cn';

/** Listing page; relative path works on any deployed host (e.g. production → scholarshiptop.com/scholarships). */
export const SCHOLARSHIPS_BROWSE_HREF = '/scholarships' as const;

const DEMO_TAGS = ['No Essay', 'Easy Apply', 'Verified'] as const;

export type ScholarshipCardPreviewProps = {
  className?: string;
};

/**
 * Landing-only product mock — “Apply now” links to the real scholarship directory.
 */
export default function ScholarshipCardPreview({
  className = ''
}: ScholarshipCardPreviewProps) {
  return (
    <article
      className={cn(
        'flex min-h-[280px] w-full max-w-md flex-1 cursor-default overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm select-none',
        className
      )}
    >
      <div
        className="w-1.5 shrink-0 self-stretch rounded-l-[0.75rem] bg-gray-900"
        aria-hidden
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-between gap-4 p-4 sm:p-5">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col text-left">
          <div className="flex min-w-0 items-center justify-between gap-2 text-xs font-medium text-gray-500 sm:text-[13px]">
            <div className="flex min-w-0 flex-1 items-center gap-1.5">
              <span
                className="pointer-events-none flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-amber-50/95 text-amber-800 ring-1 ring-amber-200/60"
                aria-hidden
              >
                <Star
                  className="h-3 w-3 fill-amber-400/90 text-amber-600/80"
                  aria-hidden
                />
              </span>
              <Info className="h-3.5 w-3.5 shrink-0 text-gray-400" aria-hidden />
              <span className="min-w-0 truncate">Honor Society®</span>
            </div>
            <span className="pointer-events-none shrink-0 rounded-md bg-[#FF7A1A] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
              NEW
            </span>
          </div>
          <h2 className="mt-1.5 min-w-0 text-lg font-semibold leading-snug tracking-tight text-gray-900 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
            $10,000 Honor Society® Scholarship
          </h2>
          <p className="mt-1.5 min-w-0 text-sm leading-relaxed text-gray-500">
            No requirements
          </p>
          <div className="mt-2.5 flex min-w-0 flex-wrap items-center gap-1.5">
            {DEMO_TAGS.map((label) => (
              <span
                key={label}
                className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 ring-1 ring-gray-200/80"
              >
                {label}
              </span>
            ))}
          </div>
          <p className="mt-3 text-sm font-semibold tabular-nums text-gray-900">
            <span aria-hidden>🔥 </span>12k applicants
          </p>
          <div className="mt-3 border-t border-gray-100 pt-3">
            <p className="text-[11px] font-normal uppercase tracking-wide text-gray-500">
              Deadline
            </p>
            <p className="mt-0.5 text-sm font-semibold text-gray-900">
              <span aria-hidden>⏳ </span>Ends in 3 days
            </p>
          </div>
        </div>

        <Link
          href={SCHOLARSHIPS_BROWSE_HREF}
          className="pointer-events-auto w-full shrink-0 cursor-pointer rounded-xl bg-emerald-500 px-5 py-2.5 text-center text-sm font-medium text-white transition hover:bg-emerald-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          aria-label="Browse scholarships"
        >
          Apply now
        </Link>
      </div>
    </article>
  );
}
