import Link from 'next/link';

import {
  sitePaginationActiveClass,
  sitePaginationDisabledClass,
  sitePaginationEllipsisClass,
  sitePaginationLinkClass,
  sitePaginationNavOuterClassName,
  sitePaginationPageMetaClass
} from '@/lib/pagination/sitePaginationClasses';
import {
  paginationControlsRowClassName,
  visiblePaginationItems,
  visiblePaginationItemsDesktop
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

const linkClass = sitePaginationLinkClass;
const activeClass = sitePaginationActiveClass;
const disabledClass = sitePaginationDisabledClass;
const defaultNavClassName = sitePaginationNavOuterClassName;

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

  const itemsMobile = visiblePaginationItems(currentPage, totalPages);
  const itemsDesktop = visiblePaginationItemsDesktop(currentPage, totalPages);
  const prevDisabled = currentPage <= 1;
  const nextDisabled = currentPage >= totalPages;

  const renderItems = (
    items: (number | 'ellipsis')[],
    keyPrefix: string
  ) =>
    items.map((item, i) =>
      item === 'ellipsis' ? (
        <span
          key={`${keyPrefix}-e-${i}`}
          className={sitePaginationEllipsisClass}
          aria-hidden
        >
          …
        </span>
      ) : (
        <Link
          key={`${keyPrefix}-p-${item}`}
          href={buildHref(item)}
          className={`${linkClass} ${item === currentPage ? activeClass : ''}`}
          aria-current={item === currentPage ? 'page' : undefined}
          scroll={linkScroll}
          prefetch={false}
        >
          {item}
        </Link>
      )
    );

  return (
    <nav className={navClassName} aria-label="Pagination">
      <p className={sitePaginationPageMetaClass}>
        Page {currentPage} of {totalPages}
      </p>
      <div className={`${paginationControlsRowClassName} lg:hidden`}>
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
        {renderItems(itemsMobile, 'm')}
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
      <div className={`${paginationControlsRowClassName} hidden lg:flex`}>
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
        {renderItems(itemsDesktop, 'd')}
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
