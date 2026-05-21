'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

import { siteNavLink as n } from '@/components/ui/nav/siteNavLink';
import {
  getFooterLinks,
  isFooterLinkActive,
  type FooterLinkLocale
} from '@/lib/i18n/localizedFooterLinks';
import { getStage2LocaleFromPathname } from '@/lib/i18n/pilotRoutes';
import type { SupportedLocale } from '@/lib/i18n/types';
import { stripLocalePrefix } from '@/lib/i18n/paths';

const linkClass = (active: boolean) =>
  clsx(
    n.light,
    'text-[11px] tracking-tight sm:text-sm sm:tracking-normal',
    active && n.lightActive
  );

export default function SiteFooterNav({
  initialLocale = 'en'
}: {
  initialLocale?: SupportedLocale;
}) {
  const pathname = usePathname() ?? '';

  const locale: FooterLinkLocale =
    getStage2LocaleFromPathname(pathname) ??
    (initialLocale === 'es' || initialLocale === 'fr' ? initialLocale : 'en');
  const canonicalPathname = stripLocalePrefix(pathname);
  const links = getFooterLinks(locale);

  return (
    <nav
      className="flex w-auto max-w-full min-w-0 shrink-0 flex-row flex-wrap items-center justify-center gap-x-2 gap-y-1.5 md:gap-x-3 md:gap-y-2"
      aria-label="Footer"
    >
      {links.map(({ href, label, canonicalPath }) => (
        <Link
          key={canonicalPath}
          href={href}
          className={linkClass(isFooterLinkActive(canonicalPath, canonicalPathname))}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
