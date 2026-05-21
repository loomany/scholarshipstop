export const SUPPORTED_LOCALES = [
  'en',
  'es',
  'fr',
  'de',
  'pt',
  'ar',
  'zh-Hans',
  'hi',
  'id',
  'vi',
  'ru'
] as const;

export const DEFAULT_LOCALE = 'en';
export const ROOT_LOCALE = 'en';
export const RTL_LOCALES = ['ar'] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export type RtlLocale = (typeof RTL_LOCALES)[number];
export type LocaleDirection = 'ltr' | 'rtl';

const SUPPORTED_LOCALE_SET = new Set<string>(SUPPORTED_LOCALES);
const RTL_LOCALE_SET = new Set<string>(RTL_LOCALES);

export function isSupportedLocale(value: unknown): value is SupportedLocale {
  return typeof value === 'string' && SUPPORTED_LOCALE_SET.has(value);
}

export function isRootLocale(value: unknown): value is typeof ROOT_LOCALE {
  return value === ROOT_LOCALE;
}

export function isRtlLocale(value: unknown): value is RtlLocale {
  return typeof value === 'string' && RTL_LOCALE_SET.has(value);
}

export function getLocaleDirection(locale: SupportedLocale): LocaleDirection {
  return isRtlLocale(locale) ? 'rtl' : 'ltr';
}
