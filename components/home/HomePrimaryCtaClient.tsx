'use client';

import Link from 'next/link';
import type { MouseEvent } from 'react';

import { useScholarshipEntryHref } from '@/components/navigation/useScholarshipEntryHref';

type HomePrimaryCtaClientProps = {
  className: string;
  children: React.ReactNode;
  id?: string;
};

export default function HomePrimaryCtaClient({
  className,
  children,
  id
}: HomePrimaryCtaClientProps) {
  const { href, resolved } = useScholarshipEntryHref();

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
