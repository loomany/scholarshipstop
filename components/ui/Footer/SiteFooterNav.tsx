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
  { href: '/faq', label: 'FAQ', isActive: (p) => p === '/faq' || p.startsWith('/faq/') }
];

export default function SiteFooterNav() {
  const pathname = usePathname() ?? '';

  return (
    <nav
      className="flex shrink-0 flex-row flex-wrap items-center justify-start gap-x-2 gap-y-2 sm:gap-x-3"
      aria-label="Footer"
    >
      {ITEMS.map(({ href, label, isActive }) => (
        <Link
          key={href}
          href={href}
          className={clsx(
            n.light,
            n.lightXs,
            isActive(pathname) && n.lightActive
          )}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
