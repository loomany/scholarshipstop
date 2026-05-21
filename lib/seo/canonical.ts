import type { SupportedLocale } from '@/lib/i18n/types';
import { localizedPath } from '@/lib/i18n/paths';
import { ROOT_LOCALE } from '@/lib/i18n/locales';

export const CANONICAL_ORIGIN = 'https://scholarshiptop.com';

export function getCanonical(path: string = '/'): string {
  const raw = path.trim() || '/';
  let pathname = raw;

  try {
    const parsed = new URL(raw);
    pathname = parsed.pathname;
  } catch {
    pathname = raw.split(/[?#]/, 1)[0] || '/';
  }

  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const cleanPath =
    normalizedPath === '/' ? '/' : normalizedPath.replace(/\/+$/, '');

  return `${CANONICAL_ORIGIN}${cleanPath}`;
}

export function getLocalizedCanonical(
  canonicalPath: string = '/',
  locale: SupportedLocale = ROOT_LOCALE
): string {
  return `${CANONICAL_ORIGIN}${localizedPath(locale, canonicalPath)}`;
}
