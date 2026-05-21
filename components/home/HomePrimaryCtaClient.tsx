'use client';

import Link from 'next/link';
import type { MouseEvent } from 'react';

import { useScholarshipEntryHref } from '@/components/navigation/useScholarshipEntryHref';
import type { LocalizedUiLocale } from '@/lib/i18n/localizedHref';

type HomePrimaryCtaClientProps = {
  className: string;
  children: React.ReactNode;
  id?: string;
  locale?: LocalizedUiLocale;
};

export default function HomePrimaryCtaClient({
  className,
  children,
  id,
  locale = 'en'
}: HomePrimaryCtaClientProps) {
  const { href, resolved } = useScholarshipEntryHref(locale);

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (resolved) return;
    event.preventDefault();
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
