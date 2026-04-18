'use client';

import Link from 'next/link';
import { Lock } from 'lucide-react';

import { scholarshipGuestLockIconClass } from '@/lib/constants/scholarshipActionUi';
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

type ScholarshipsPaginationProps = {
  currentPage: number;
  totalPages: number;
  buildHref: (page: number) => string;
  /**
   * Guest + Best recommendation: only page 1 is navigable; other page numbers and Next
   * open the registration flow instead of changing the URL.
   */
  guestPaginationLocked?: boolean;
  onGuestLockedClick?: () => void;
};

const linkClass = sitePaginationLinkClass;
const activeClass = sitePaginationActiveClass;
const disabledClass = sitePaginationDisabledClass;

export default function ScholarshipsPagination({
  currentPage,
  totalPages,
  buildHref,
  guestPaginationLocked = false,
  onGuestLockedClick
}: ScholarshipsPaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const itemsMobile = visiblePaginationItems(currentPage, totalPages);
  const itemsDesktop = visiblePaginationItemsDesktop(currentPage, totalPages);
  const prevDisabled = currentPage <= 1;
  const nextDisabled = currentPage >= totalPages;
  const nextGuestLocked =
    guestPaginationLocked && !nextDisabled && Boolean(onGuestLockedClick);

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
      ) : guestPaginationLocked && item > 1 ? (
        <button
          key={`${keyPrefix}-p-${item}`}
          type="button"
          onClick={onGuestLockedClick}
          title="Create a free account to see more pages"
          className={`${linkClass} cursor-pointer ${item === currentPage ? activeClass : ''}`}
          aria-current={item === currentPage ? 'page' : undefined}
        >
          <span className="inline-flex items-center justify-center gap-0.5 tabular-nums">
            {item}
            <Lock
              className={`h-3 w-3 shrink-0 ${scholarshipGuestLockIconClass}`}
              strokeWidth={2}
              aria-hidden
            />
          </span>
        </button>
      ) : (
        <Link
          key={`${keyPrefix}-p-${item}`}
          href={buildHref(item)}
          className={`${linkClass} ${item === currentPage ? activeClass : ''}`}
          aria-current={item === currentPage ? 'page' : undefined}
          scroll
          prefetch={false}
        >
          {item}
        </Link>
      )
    );

  return (
    <nav
      className={sitePaginationNavOuterClassName}
      aria-label="Scholarship list pagination"
    >
      <p className={sitePaginationPageMetaClass}>
        Page {currentPage} of {totalPages}
      </p>
      <div className={`${paginationControlsRowClassName} lg:hidden`}>
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
        {renderItems(itemsMobile, 'm')}
        {nextDisabled ? (
          <span className={`${linkClass} ${disabledClass}`} aria-disabled="true">
            Next
          </span>
        ) : nextGuestLocked ? (
          <button
            type="button"
            onClick={onGuestLockedClick}
            title="Create a free account to see more pages"
            className={`${linkClass} cursor-pointer`}
          >
            <span className="inline-flex items-center justify-center gap-1">
              Next
              <Lock
                className={`h-3.5 w-3.5 shrink-0 ${scholarshipGuestLockIconClass}`}
                strokeWidth={2}
                aria-hidden
              />
            </span>
          </button>
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
      </div>
      <div className={`${paginationControlsRowClassName} hidden lg:flex`}>
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
        {renderItems(itemsDesktop, 'd')}
        {nextDisabled ? (
          <span className={`${linkClass} ${disabledClass}`} aria-disabled="true">
            Next
          </span>
        ) : nextGuestLocked ? (
          <button
            type="button"
            onClick={onGuestLockedClick}
            title="Create a free account to see more pages"
            className={`${linkClass} cursor-pointer`}
          >
            <span className="inline-flex items-center justify-center gap-1">
              Next
              <Lock
                className={`h-3.5 w-3.5 shrink-0 ${scholarshipGuestLockIconClass}`}
                strokeWidth={2}
                aria-hidden
              />
            </span>
          </button>
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
      </div>
    </nav>
  );
}
