'use client';

import Link from 'next/link';

import Logo from '@/components/icons/Logo';
import { useIqLocale } from '@/components/iq/IqLocaleProvider';
import { getIqFooterCopy, type IqFooterLinkKey } from '@/lib/iq/i18n/iqFooterCopy';
import { getIqLocalizedHref } from '@/lib/iq/i18n/iqLocalizedHref';

const LINK_KEYS: IqFooterLinkKey[] = [
  'home',
  'about',
  'help',
  'privacy',
  'terms',
  'refund',
  'faq'
];

export default function IqProductFooter() {
  const { locale } = useIqLocale();
  const copy = getIqFooterCopy(locale);

  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-3 px-6 py-4 sm:flex-row sm:gap-6 sm:py-5">
        <div className="shrink-0">
          <Link
            href={getIqLocalizedHref('/', locale, { onIqSubdomain: true })}
            className="inline-flex rounded-full bg-black px-4 py-2.5 ring-1 ring-gray-800 transition hover:ring-gray-600"
            aria-label={copy.homeAria}
          >
            <Logo variant="footer" />
          </Link>
        </div>

        <nav
          className="flex min-w-0 flex-wrap items-center justify-center gap-x-4 gap-y-2 text-center text-sm font-medium text-slate-700"
          aria-label={copy.navAria}
        >
          {LINK_KEYS.map((key) => (
            <Link
              key={key}
              href={getIqLocalizedHref(copy.paths[key], locale, {
                onIqSubdomain: true
              })}
              className="transition hover:text-slate-950 hover:underline"
            >
              {copy.links[key]}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
