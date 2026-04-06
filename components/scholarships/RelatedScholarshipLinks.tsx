'use client';

import Link from 'next/link';

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
    <div className={className}>
      <h2 className="text-base font-semibold text-zinc-900 sm:text-lg">Related pages</h2>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
        {LONG_TAIL_SLUGS.filter((slug) => slug !== currentSlug).map(
          (slug) => (
            <Link
              key={slug}
              href={`/scholarships/${slug}`}
              className="text-sm font-medium text-teal-700 underline decoration-teal-600/40 underline-offset-2 transition hover:text-teal-900"
            >
              {LONG_TAIL_LINK_LABELS[slug]}
            </Link>
          )
        )}
      </div>
    </div>
  );
}
