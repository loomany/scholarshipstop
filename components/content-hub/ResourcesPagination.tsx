import Link from 'next/link';

import {
  paginationControlsRowClassName,
  visiblePaginationItems
} from '@/lib/pagination/visiblePaginationItems';

type ResourcesPaginationProps = {
  currentPage: number;
  totalPages: number;
  buildHref: (page: number) => string;
  /** Override outer nav layout (e.g. margin). Defaults match the Resources index. */
  navClassName?: string;
  /** Default `true`. Set `false` for hash URLs so Next does not scroll to top. */
  linkScroll?: boolean;
};

const linkClass =
  'inline-flex min-h-9 min-w-9 items-center justify-center rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/50 focus-visible:ring-offset-1';

const activeClass =
  'border-orange-500 bg-orange-50 font-semibold text-orange-900 ring-1 ring-orange-500/25';

const disabledClass =
  'pointer-events-none border-gray-100 bg-gray-50 text-gray-400 shadow-none';

const defaultNavClassName =
  'mt-10 flex flex-col items-center gap-3 sm:mt-12';

export default function ResourcesPagination({
  currentPage,
  totalPages,
  buildHref,
  navClassName = defaultNavClassName,
  linkScroll = true
}: ResourcesPaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const items = visiblePaginationItems(currentPage, totalPages);
  const prevDisabled = currentPage <= 1;
  const nextDisabled = currentPage >= totalPages;

  return (
    <nav className={navClassName} aria-label="Pagination">
      <p className="text-sm text-gray-500">
        Page {currentPage} of {totalPages}
      </p>
      <div className={paginationControlsRowClassName}>
        {prevDisabled ? (
          <span
            className={`${linkClass} ${disabledClass}`}
            aria-disabled="true"
          >
            Previous
          </span>
        ) : (
          <Link
            href={buildHref(currentPage - 1)}
            className={linkClass}
            scroll={linkScroll}
            prefetch={false}
          >
            Previous
          </Link>
        )}

        {items.map((item, i) =>
          item === 'ellipsis' ? (
            <span
              key={`e-${i}`}
              className="px-1 text-sm font-medium text-gray-400"
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
              scroll={linkScroll}
              prefetch={false}
            >
              {item}
            </Link>
          )
        )}

        {nextDisabled ? (
          <span
            className={`${linkClass} ${disabledClass}`}
            aria-disabled="true"
          >
            Next
          </span>
        ) : (
          <Link
            href={buildHref(currentPage + 1)}
            className={linkClass}
            scroll={linkScroll}
            prefetch={false}
          >
            Next
          </Link>
        )}
      </div>
    </nav>
  );
}
