import { IQ_FORBIDDEN_PUBLIC_LOCALE_SEGMENT, type IqLocale } from '@/lib/iq/i18n/iqLocales';

/** Public paths on iq.scholarshiptop.com that rewrite to `app/iq/*` (without locale prefix). */
export const IQ_SUBDOMAIN_PUBLIC_PATHS = new Set([
  '/about',
  '/help',
  '/privacy-policy',
  '/terms',
  '/refund-policy',
  '/faq',
  '/scholarship-match',
  '/provider-research',
  '/college-fit',
  '/essay-prep',
  '/deadline-strategy',
  '/assessment'
]);

export function normalizeIqPathname(pathname: string): string {
  if (!pathname || pathname === '/') return '/';
  const trimmed = pathname.replace(/\/+$/, '');
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

/**
 * Parse locale prefix from the browser pathname on the IQ host (or `/iq` on www).
 * `/es/assessment` → locale `es`, path `/assessment`.
 */
export function parseIqPublicPathname(pathname: string): {
  locale: IqLocale;
  pathnameWithoutLocale: string;
} {
  const normalized = normalizeIqPathname(pathname);
  const segments = normalized.split('/').filter(Boolean);

  if (segments[0] === 'es' || segments[0] === 'fr') {
    const rest = segments.slice(1).join('/');
    return {
      locale: segments[0],
      pathnameWithoutLocale: rest ? `/${rest}` : '/'
    };
  }

  return { locale: 'en', pathnameWithoutLocale: normalized };
}

export function getIqLocaleFromPathname(pathname: string): IqLocale {
  return parseIqPublicPathname(pathname).locale;
}

export function stripIqLocalePrefix(pathname: string): string {
  return parseIqPublicPathname(pathname).pathnameWithoutLocale;
}

/**
 * Canonical IQ product path used for switcher href building.
 * On www: `/iq`, `/iq/assessment`. On IQ subdomain: `/`, `/assessment`.
 */
export function iqProductPathFromBrowserPathname(
  pathname: string,
  options: { onIqSubdomain: boolean }
): string {
  const withoutLocale = stripIqLocalePrefix(pathname);
  if (!options.onIqSubdomain) {
    const normalized = normalizeIqPathname(pathname);
    if (normalized === '/iq' || normalized.startsWith('/iq/')) {
      return normalized;
    }
    if (withoutLocale.startsWith('/iq')) {
      return normalizeIqPathname(withoutLocale);
    }
    return withoutLocale;
  }
  return withoutLocale;
}

export function isIqPublicLocaleSegment(segment: string): boolean {
  return segment === 'es' || segment === 'fr';
}

export function pathnameHasForbiddenIqEnPrefix(pathname: string): boolean {
  const normalized = normalizeIqPathname(pathname);
  return (
    normalized === `/${IQ_FORBIDDEN_PUBLIC_LOCALE_SEGMENT}` ||
    normalized.startsWith(`/${IQ_FORBIDDEN_PUBLIC_LOCALE_SEGMENT}/`)
  );
}

/**
 * Map public IQ path (no locale) → internal Next.js path under `app/iq`.
 */
export function iqInternalRewritePath(pathnameWithoutLocale: string): string | null {
  const path = normalizeIqPathname(pathnameWithoutLocale);
  if (path === '/') return '/iq';
  if (path === '/assessment') return '/iq/assessment';
  if (path.startsWith('/report/')) return `/iq${path}`;
  if (IQ_SUBDOMAIN_PUBLIC_PATHS.has(path)) return `/iq${path}`;
  return null;
}

export function isIqProductBrowserPathname(
  pathname: string,
  options: { onIqSubdomain: boolean }
): boolean {
  if (!options.onIqSubdomain) {
    const normalized = normalizeIqPathname(pathname);
    return normalized === '/iq' || normalized.startsWith('/iq/');
  }
  const stripped = stripIqLocalePrefix(pathname);
  return (
    stripped === '/' ||
    stripped === '/assessment' ||
    stripped.startsWith('/report/') ||
    IQ_SUBDOMAIN_PUBLIC_PATHS.has(stripped)
  );
}
