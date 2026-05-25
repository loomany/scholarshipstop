'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

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
import type { LocalizedUiLocale } from '@/lib/i18n/localizedHref';
import { getSitePaginationCopy } from '@/lib/i18n/sitePaginationCopy';
import { resolveNavLocaleFromPathname } from '@/lib/i18n/resolveNavLocale';

export type SitePaginationProps = {
  currentPage: number;
  totalPages: number;
  buildHref: (page: number) => string;
  locale?: LocalizedUiLocale;
  /** Override outer nav layout (e.g. margin). Defaults match the Resources index. */
  navClassName?: string;
  /** Default `true`. Set `false` for hash URLs so Next does not scroll to top. */
  linkScroll?: boolean;
  ariaLabel?: string;
};

const linkClass = sitePaginationLinkClass;
const activeClass = sitePaginationActiveClass;
const disabledClass = sitePaginationDisabledClass;
const defaultNavClassName = sitePaginationNavOuterClassName;

export default function SitePagination({
  currentPage,
  totalPages,
  buildHref,
  locale: localeProp,
  navClassName = defaultNavClassName,
  linkScroll = true,
  ariaLabel
}: SitePaginationProps) {
  const pathname = usePathname() ?? '/';
  const locale = localeProp ?? resolveNavLocaleFromPathname(pathname);
  const copy = getSitePaginationCopy(locale);

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

  const renderPrevNext = (layoutKey: string) => (
    <>
      {prevDisabled ? (
        <span className={`${linkClass} ${disabledClass}`} aria-disabled="true">
          {copy.previous}
        </span>
      ) : (
        <Link
          href={buildHref(currentPage - 1)}
          className={linkClass}
          scroll={linkScroll}
          prefetch={false}
        >
          {copy.previous}
        </Link>
      )}
      {renderItems(layoutKey === 'm' ? itemsMobile : itemsDesktop, layoutKey)}
      {nextDisabled ? (
        <span className={`${linkClass} ${disabledClass}`} aria-disabled="true">
          {copy.next}
        </span>
      ) : (
        <Link
          href={buildHref(currentPage + 1)}
          className={linkClass}
          scroll={linkScroll}
          prefetch={false}
        >
          {copy.next}
        </Link>
      )}
    </>
  );

  return (
    <nav className={navClassName} aria-label={ariaLabel ?? copy.ariaLabel}>
      <p className={sitePaginationPageMetaClass}>
        {copy.pageOf(currentPage, totalPages)}
      </p>
      <div className={`${paginationControlsRowClassName} lg:hidden`}>
        {renderPrevNext('m')}
      </div>
      <div className={`${paginationControlsRowClassName} hidden lg:flex`}>
        {renderPrevNext('d')}
      </div>
    </nav>
  );
}
