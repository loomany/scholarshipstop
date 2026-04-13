import { NextResponse, type NextRequest } from 'next/server';
import { preferredScholarshipSlugForLegacySlug } from '@/lib/seo/legacyScholarshipSlugAliases';
import { updateSession } from '@/utils/supabase/middleware';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /**
   * Legacy URLs from the previous stack used scholarship slugs at the domain root
   * (e.g. /study-in-…-2019/). Current canonical paths live under /scholarships/[slug].
   * Map long WP slugs → real catalog slugs (see legacyScholarshipSlugAliases).
   */
  const legacyRootYear = pathname.match(/^\/(.+-2019)\/?$/i);
  if (legacyRootYear?.[1]) {
    const slug = preferredScholarshipSlugForLegacySlug(legacyRootYear[1]);
    const url = request.nextUrl.clone();
    url.pathname = `/scholarships/${encodeURIComponent(slug)}`;
    return NextResponse.redirect(url, 308);
  }

  /** Long legacy slugs under `/scholarships/…` → shorter canonical slug when known. */
  const schSeg = pathname.match(/^\/scholarships\/([^/]+)\/?$/);
  if (schSeg?.[1]) {
    const decoded = decodeURIComponent(schSeg[1]);
    const preferred = preferredScholarshipSlugForLegacySlug(decoded);
    if (preferred !== decoded) {
      const url = request.nextUrl.clone();
      url.pathname = `/scholarships/${encodeURIComponent(preferred)}`;
      return NextResponse.redirect(url, 308);
    }
  }

  if (pathname === '/content-hub' || pathname.startsWith('/content-hub/')) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(/^\/content-hub/, '/resources');
    return NextResponse.redirect(url, 308);
  }
  /** Refresh Supabase session cookies on recovery hand-off (browser sets session just before this). */
  if (
    pathname === '/signin/update_password' ||
    pathname === '/auth/reset_password'
  ) {
    return await updateSession(request);
  }
  if (
    pathname === '/signin' ||
    pathname.startsWith('/signin/') ||
    pathname === '/auth' ||
    pathname.startsWith('/auth/')
  ) {
    return NextResponse.next();
  }
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
  ]
};
