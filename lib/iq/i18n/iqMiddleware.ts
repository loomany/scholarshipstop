import { NextResponse, type NextRequest } from 'next/server';

import { IQ_LOCALE_HEADER } from '@/lib/iq/i18n/getIqLocaleFromRequest';
import { IQ_SUBDOMAIN_HOST } from '@/lib/iq/i18n/iqLocales';
import {
  iqInternalRewritePath,
  parseIqPublicPathname,
  pathnameHasForbiddenIqEnPrefix
} from '@/lib/iq/i18n/iqPaths';

export { IQ_SUBDOMAIN_HOST };

function withIqLocaleHeader(
  request: NextRequest,
  locale: 'en' | 'es' | 'fr',
  init?: ResponseInit
): NextResponse {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(IQ_LOCALE_HEADER, locale);
  return NextResponse.next({
    ...init,
    request: { headers: requestHeaders }
  });
}

function rewriteWithIqLocale(
  request: NextRequest,
  locale: 'en' | 'es' | 'fr',
  internalPathname: string
): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = internalPathname;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(IQ_LOCALE_HEADER, locale);
  return NextResponse.rewrite(url, {
    request: { headers: requestHeaders }
  });
}

/**
 * IQ subdomain routing: locale prefixes, internal `/iq` rewrites, no main-site `[locale]` catch-all.
 */
export function handleIqSubdomainMiddleware(
  request: NextRequest
): NextResponse | null {
  const { pathname } = request.nextUrl;

  if (pathname === '/iq' || pathname === '') {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url, 308);
  }

  if (pathname.startsWith('/iq/')) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(/^\/iq/, '') || '/';
    return NextResponse.redirect(url, 308);
  }

  if (pathnameHasForbiddenIqEnPrefix(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname =
      pathname.replace(new RegExp(`^/en(?=/|$)`), '') || '/';
    return NextResponse.redirect(url, 308);
  }

  const { locale, pathnameWithoutLocale } = parseIqPublicPathname(pathname);
  const internalPath = iqInternalRewritePath(pathnameWithoutLocale);

  if (internalPath) {
    return rewriteWithIqLocale(request, locale, internalPath);
  }

  /** Avoid main-site `app/[locale]` for `/es/...` on the IQ host. */
  if (locale !== 'en') {
    return rewriteWithIqLocale(request, locale, '/iq');
  }

  return withIqLocaleHeader(request, locale);
}
