'use client';

import Link from 'next/link';
import clsx from 'clsx';
import { useEffect, useState } from 'react';

import { siteNavLink as n } from '@/components/ui/nav/siteNavLink';

type FooterLink = {
  href: string;
  label: string;
  isActive: (pathname: string) => boolean;
};

const PRIMARY_LINKS: FooterLink[] = [
  { href: '/', label: 'Home', isActive: (p) => p === '/' },
  {
    href: '/about',
    label: 'About',
    isActive: (p) => p === '/about' || p.startsWith('/about/')
  },
  {
    href: '/how-scholarshiptop-works',
    label: 'How it works',
    isActive: (p) =>
      p === '/how-scholarshiptop-works' ||
      p.startsWith('/how-scholarshiptop-works/')
  },
  {
    href: '/scholarship-verification-methodology',
    label: 'Verification',
    isActive: (p) =>
      p === '/scholarship-verification-methodology' ||
      p.startsWith('/scholarship-verification-methodology/')
  },
  {
    href: '/how-we-rank-scholarships',
    label: 'Ranking',
    isActive: (p) =>
      p === '/how-we-rank-scholarships' ||
      p.startsWith('/how-we-rank-scholarships/')
  },
  {
    href: '/editorial-policy',
    label: 'Editorial Policy',
    isActive: (p) =>
      p === '/editorial-policy' || p.startsWith('/editorial-policy/')
  },
  {
    href: '/corrections',
    label: 'Corrections',
    isActive: (p) => p === '/corrections' || p.startsWith('/corrections/')
  },
  {
    href: '/financial-aid-disclaimer',
    label: 'Disclaimer',
    isActive: (p) =>
      p === '/financial-aid-disclaimer' ||
      p.startsWith('/financial-aid-disclaimer/')
  },
  {
    href: '/how-we-make-money',
    label: 'How we make money',
    isActive: (p) =>
      p === '/how-we-make-money' || p.startsWith('/how-we-make-money/')
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

const linkClass = (active: boolean) =>
  clsx(
    n.light,
    'text-[11px] tracking-tight sm:text-sm sm:tracking-normal',
    active && n.lightActive
  );

export default function SiteFooterNav() {
  const [pathname, setPathname] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setPathname(window.location.pathname || '');
  }, []);

  return (
    <nav
      className="flex w-auto max-w-full min-w-0 shrink-0 flex-row flex-wrap items-center justify-center gap-x-2 gap-y-1.5 md:gap-x-3 md:gap-y-2"
      aria-label="Footer"
    >
      {PRIMARY_LINKS.map(({ href, label, isActive }) => (
        <Link
          key={href}
          href={href}
          className={linkClass(isActive(pathname))}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
