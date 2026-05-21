'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { hrefForLocalizedUiRequired } from '@/lib/i18n/localizedHref';
import { getStage2LocaleFromPathname } from '@/lib/i18n/pilotRoutes';

type Props = {
  className?: string;
  children: React.ReactNode;
};

/** Home link that preserves ES/FR locale from the current URL. */
export function LocaleAwareHomeLink({ className, children }: Props) {
  const pathname = usePathname() ?? '/';
  const locale = getStage2LocaleFromPathname(pathname) ?? 'en';
  const href = hrefForLocalizedUiRequired(locale, '/');

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
