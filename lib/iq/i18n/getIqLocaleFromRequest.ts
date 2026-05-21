import { headers } from 'next/headers';

import {
  IQ_DEFAULT_LOCALE,
  isIqLocale,
  type IqLocale
} from '@/lib/iq/i18n/iqLocales';

export const IQ_LOCALE_HEADER = 'x-iq-locale';

export function getIqLocaleFromRequestHeaders(
  requestHeaders: Pick<Headers, 'get'>
): IqLocale {
  const fromHeader = requestHeaders.get(IQ_LOCALE_HEADER);
  return isIqLocale(fromHeader) ? fromHeader : IQ_DEFAULT_LOCALE;
}

export function getIqLocaleFromRequest(): IqLocale {
  return getIqLocaleFromRequestHeaders(headers());
}
