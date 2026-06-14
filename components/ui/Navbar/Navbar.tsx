import { headers } from 'next/headers';

import { getIqLocaleFromRequestHeaders } from '@/lib/iq/i18n/getIqLocaleFromRequest';
import { IQ_SUBDOMAIN_HOST } from '@/lib/iq/i18n/iqLocales';
import type { SupportedLocale } from '@/lib/i18n/types';
import Navlinks from './Navlinks';
import s from './Navbar.module.css';

function normalizeRequestHost(value: string | null): string {
  return (value ?? '').split(',')[0]?.trim().toLowerCase().replace(/:\d+$/, '') ?? '';
}

export default function Navbar({
  locale = 'en'
}: {
  locale?: SupportedLocale;
}) {
  const requestHeaders = headers();
  const requestHost = normalizeRequestHost(
    requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host')
  );
  const isIqSubdomainHost = requestHost === IQ_SUBDOMAIN_HOST;
  const iqLocale = isIqSubdomainHost
    ? getIqLocaleFromRequestHeaders(requestHeaders)
    : undefined;

  return (
    <nav className={s.root}>
      <a href="#skip" className="sr-only focus:not-sr-only">
        Skip to content
      </a>
      <div className="mx-auto max-w-6xl pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] sm:pl-6 sm:pr-6">
        <Navlinks
          initialNavbarAuth={null}
          initialLocale={locale}
          isIqSubdomainHost={isIqSubdomainHost}
          iqLocale={iqLocale}
        />
      </div>
    </nav>
  );
}
