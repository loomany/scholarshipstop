import 'server-only';

import { headers } from 'next/headers';

import {
  getStage2LocaleFromPathname,
  isStage2PilotLocale,
  type Stage2PilotLocale
} from '@/lib/i18n/pilotRoutes';

export const SCHOLARSHIPTOP_LOCALE_HEADER = 'x-scholarshiptop-locale';
export const SCHOLARSHIPTOP_PATHNAME_HEADER = 'x-scholarshiptop-pathname';

export function notFoundLocaleFromHeaderValue(
  headerLocale: string | null | undefined
): 'en' | Stage2PilotLocale {
  return isStage2PilotLocale(headerLocale) ? headerLocale : 'en';
}

/** Locale for 404 UI — middleware headers first, then pathname prefix. */
export function getNotFoundLocaleFromHeaders(): 'en' | Stage2PilotLocale {
  const requestHeaders = headers();
  const fromLocaleHeader = notFoundLocaleFromHeaderValue(
    requestHeaders.get(SCHOLARSHIPTOP_LOCALE_HEADER)
  );
  if (fromLocaleHeader !== 'en') return fromLocaleHeader;

  const pathname = requestHeaders.get(SCHOLARSHIPTOP_PATHNAME_HEADER);
  if (pathname) {
    const fromPath = getStage2LocaleFromPathname(pathname);
    if (fromPath) return fromPath;
  }

  return 'en';
}
