/**
 * Shared pagination UI — matches providers & resources (gray chrome, orange active).
 */

export const sitePaginationLinkClass =
  'inline-flex min-h-9 min-w-9 items-center justify-center rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/50 focus-visible:ring-offset-1';

export const sitePaginationActiveClass =
  'border-orange-500 bg-orange-50 font-semibold text-orange-900 ring-1 ring-orange-500/25';

export const sitePaginationDisabledClass =
  'pointer-events-none border-gray-100 bg-gray-50 text-gray-400 shadow-none';

export const sitePaginationEllipsisClass =
  'px-1 text-sm font-medium text-gray-400';

export const sitePaginationPageMetaClass = 'text-sm text-gray-500';

/** Outer `<nav>`: margins match providers / resources index. */
export const sitePaginationNavOuterClassName =
  'mt-10 flex flex-col items-center gap-3 sm:mt-12';
