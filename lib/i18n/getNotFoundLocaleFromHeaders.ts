import 'server-only';

import { headers } from 'next/headers';

import { isStage2PilotLocale, type Stage2PilotLocale } from '@/lib/i18n/pilotRoutes';

export function notFoundLocaleFromHeaderValue(
  headerLocale: string | null | undefined
): 'en' | Stage2PilotLocale {
  return isStage2PilotLocale(headerLocale) ? headerLocale : 'en';
}

/** Locale for 404 UI — from middleware `x-scholarshiptop-locale`, not route params. */
export function getNotFoundLocaleFromHeaders(): 'en' | Stage2PilotLocale {
  return notFoundLocaleFromHeaderValue(headers().get('x-scholarshiptop-locale'));
}
