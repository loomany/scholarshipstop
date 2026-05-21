import {
  isRootLocale,
  isSupportedLocale,
  ROOT_LOCALE
} from '@/lib/i18n/locales';
import type { SupportedLocale } from '@/lib/i18n/types';

function pathOnly(value: string): string {
  const raw = value.trim() || '/';
  try {
    return new URL(raw).pathname || '/';
  } catch {
    return raw.split(/[?#]/, 1)[0] || '/';
  }
}

export function normalizeCanonicalPath(canonicalPath: string = '/'): string {
  const pathname = pathOnly(canonicalPath);
  const withSlash = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const collapsed = withSlash.replace(/\/{2,}/g, '/');
  return collapsed === '/' ? '/' : collapsed.replace(/\/+$/, '');
}

function firstPathSegment(pathname: string): string | null {
  const normalized = normalizeCanonicalPath(pathname);
  const first = normalized.split('/').filter(Boolean)[0];
  return first ?? null;
}

export function extractLocaleFromPath(
  pathname: string
): SupportedLocale | null {
  const first = firstPathSegment(pathname);
  if (!first || first === ROOT_LOCALE) return null;
  return isSupportedLocale(first) ? first : null;
}

export function stripLocalePrefix(pathname: string): string {
  const normalized = normalizeCanonicalPath(pathname);
  const locale = extractLocaleFromPath(normalized);
  if (!locale) return normalized;
  const stripped = normalized.replace(new RegExp(`^/${locale}(?=/|$)`), '');
  return stripped || '/';
}

export function localizedPath(
  locale: SupportedLocale,
  canonicalPath: string = '/'
): string {
  const path = stripLocalePrefix(canonicalPath);
  if (isRootLocale(locale)) return path;
  return path === '/' ? `/${locale}` : `/${locale}${path}`;
}

