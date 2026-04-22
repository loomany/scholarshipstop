'use client';

import Link from 'next/link';
import type { MouseEvent } from 'react';

import { useScholarshipEntryHref } from '@/components/navigation/useScholarshipEntryHref';

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
  const { href, resolved } = useScholarshipEntryHref();

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (!resolved) {
      event.preventDefault();
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
