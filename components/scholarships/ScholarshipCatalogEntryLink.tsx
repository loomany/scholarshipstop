'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { MouseEvent } from 'react';
import { useMemo } from 'react';

import { useScholarshipEntryHref } from '@/components/navigation/useScholarshipEntryHref';
import { extractLocaleFromPath } from '@/lib/i18n/paths';
import { isStage2PilotLocale } from '@/lib/i18n/pilotRoutes';
import type { LocalizedUiLocale } from '@/lib/i18n/localizedHref';

type Props = {
  className?: string;
  children: React.ReactNode;
  id?: string;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
};

export default function ScholarshipCatalogEntryLink({
  className,
  children,
  id,
  onClick
}: Props) {
  const pathname = usePathname();
  const locale = useMemo<LocalizedUiLocale>(() => {
    const loc = extractLocaleFromPath(pathname ?? '/');
    return loc && isStage2PilotLocale(loc) ? loc : 'en';
  }, [pathname]);
  const { href, resolved } = useScholarshipEntryHref(locale);

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (!resolved) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  return (
    <Link
      id={id}
      href={href}
      className={className}
      onClick={handleClick}
      aria-disabled={!resolved}
    >
      {children}
    </Link>
  );
}
