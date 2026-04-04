'use client';

import Link from 'next/link';

type ContentHubPaginationProps = {
  currentPage: number;
  totalPages: number;
  buildHref: (page: number) => string;
};

function visiblePageItems(
  current: number,
  total: number
): (number | 'ellipsis')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const delta = 1;
  const set = new Set<number>();
  set.add(1);
  set.add(total);
  for (let i = current - delta; i <= current + delta; i++) {
    if (i >= 1 && i <= total) set.add(i);
  }
  const sorted = Array.from(set).sort((a, b) => a - b);
  const out: (number | 'ellipsis')[] = [];
  let prev = 0;
  for (const n of sorted) {
    if (prev && n - prev > 1) {
      out.push('ellipsis');
    }
    out.push(n);
    prev = n;
  }
  return out;
}

/** Matches `ScholarshipsPagination` for visual consistency across the site. */
const linkClass =
  'inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg border border-slate-200/90 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/40 focus-visible:ring-offset-1';

const activeClass =
  'border-teal-500 bg-teal-50 font-semibold text-teal-900 ring-1 ring-teal-500/30';

const disabledClass =
  'pointer-events-none border-slate-100 bg-slate-50 text-slate-400 shadow-none';

export default function ContentHubPagination({
  currentPage,
  totalPages,
  buildHref
}: ContentHubPaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const items = visiblePageItems(currentPage, totalPages);
  const prevDisabled = currentPage <= 1;
  const nextDisabled = currentPage >= totalPages;

  return (
    <nav
      className="mt-8 flex flex-wrap items-center justify-center gap-2"
      aria-label="Articles pagination"
    >
      {prevDisabled ? (
        <span className={`${linkClass} ${disabledClass}`} aria-disabled="true">
          Previous
        </span>
      ) : (
        <Link
          href={buildHref(currentPage - 1)}
          className={linkClass}
          scroll
          prefetch={false}
        >
          Previous
        </Link>
      )}

      {items.map((item, i) =>
        item === 'ellipsis' ? (
          <span
            key={`e-${i}`}
            className="px-1 text-sm font-medium text-slate-400"
            aria-hidden
          >
            …
          </span>
        ) : (
          <Link
            key={item}
            href={buildHref(item)}
            className={`${linkClass} ${item === currentPage ? activeClass : ''}`}
            aria-current={item === currentPage ? 'page' : undefined}
            scroll
            prefetch={false}
          >
            {item}
          </Link>
        )
      )}

      {nextDisabled ? (
        <span className={`${linkClass} ${disabledClass}`} aria-disabled="true">
          Next
        </span>
      ) : (
        <Link
          href={buildHref(currentPage + 1)}
          className={linkClass}
          scroll
          prefetch={false}
        >
          Next
        </Link>
      )}
    </nav>
  );
}
