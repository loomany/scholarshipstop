'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

import { siteNavLink as n } from '@/components/ui/nav/siteNavLink';

const ITEMS: {
  href: string;
  label: string;
  isActive: (pathname: string) => boolean;
}[] = [
  { href: '/', label: 'Home', isActive: (p) => p === '/' },
  {
    href: '/about',
    label: 'About',
    isActive: (p) => p === '/about' || p.startsWith('/about/')
  },
  {
    href: '/help',
    label: 'Help',
    isActive: (p) => p === '/help' || p.startsWith('/help/')
  },
  {
    href: '/privacy-policy',
    label: 'Privacy Policy',
    isActive: (p) =>
      p === '/privacy-policy' || p.startsWith('/privacy-policy/')
  },
  {
    href: '/terms',
    label: 'Terms of Service',
    isActive: (p) => p === '/terms' || p.startsWith('/terms/')
  },
  {
    href: '/refund-policy',
    label: 'Refund Policy',
    isActive: (p) => p === '/refund-policy' || p.startsWith('/refund-policy/')
  },
  { href: '/faq', label: 'FAQ', isActive: (p) => p === '/faq' || p.startsWith('/faq/') },
  {
    href: '/how-we-verify-scholarships',
    label: 'How we verify',
    isActive: (p) => p === '/how-we-verify-scholarships'
  },
  {
    href: '/editorial-policy',
    label: 'Editorial policy',
    isActive: (p) => p === '/editorial-policy'
  },
  {
    href: '/how-ai-is-used',
    label: 'How AI is used',
    isActive: (p) => p === '/how-ai-is-used'
  },
  {
    href: '/listing-review-policy',
    label: 'Listing review',
    isActive: (p) => p === '/listing-review-policy'
  }
];

export default function SiteFooterNav() {
  const pathname = usePathname() ?? '';

  return (
    <nav
      className="flex w-full min-w-0 max-w-full shrink-0 flex-row flex-wrap items-center justify-start gap-x-1 gap-y-1.5 sm:gap-x-3 sm:gap-y-2"
      aria-label="Footer"
    >
      {ITEMS.map(({ href, label, isActive }) => (
        <Link
          key={href}
          href={href}
          className={clsx(
            n.light,
            'text-[11px] tracking-tight sm:text-sm sm:tracking-normal',
            isActive(pathname) && n.lightActive
          )}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
