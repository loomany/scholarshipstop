'use client';

import { usePathname } from 'next/navigation';

import SitePagination from '@/components/ui/pagination/SitePagination';
import { getSitePaginationCopy } from '@/lib/i18n/sitePaginationCopy';
import type { LocalizedUiLocale } from '@/lib/i18n/localizedHref';
import { resolveNavLocaleFromPathname } from '@/lib/i18n/resolveNavLocale';

type ContentHubPaginationProps = {
  currentPage: number;
  totalPages: number;
  buildHref: (page: number) => string;
  locale?: LocalizedUiLocale;
};

export default function ContentHubPagination({
  locale: localeProp,
  ...props
}: ContentHubPaginationProps) {
  const pathname = usePathname() ?? '/';
  const locale = localeProp ?? resolveNavLocaleFromPathname(pathname);
  const copy = getSitePaginationCopy(locale);

  return (
    <SitePagination
      {...props}
      locale={locale}
      ariaLabel={copy.ariaLabelArticles}
    />
  );
}
