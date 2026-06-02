'use client';

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

import {
  LONG_TAIL_LINK_LABELS,
  LONG_TAIL_SLUGS,
  type LongTailSlug
} from '@/app/scholarships/scholarshipLongTailPresets';

export function RelatedScholarshipLinks({
  currentSlug = null,
  className = ''
}: {
  /** When null (e.g. composite SEO page), list all curated long-tail links. */
  currentSlug?: LongTailSlug | null;
  className?: string;
}) {
  return (
    <div
      className={`rounded-lg border border-slate-200 bg-white p-4 shadow-sm ring-1 ring-slate-100/80 ${className}`.trim()}
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
        Related scholarship paths
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {LONG_TAIL_SLUGS.filter((slug) => slug !== currentSlug).map((slug) => (
          <Link
            key={slug}
            href={`/scholarships/${slug}`}
            className="group flex min-h-12 items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-sm font-semibold text-slate-800 transition hover:border-orange-200 hover:bg-orange-50/70 hover:text-orange-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60"
          >
            <span className="min-w-0">{LONG_TAIL_LINK_LABELS[slug]}</span>
            <ArrowUpRight
              className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:text-orange-600"
              aria-hidden
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
