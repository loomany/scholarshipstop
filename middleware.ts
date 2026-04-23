import { NextResponse, type NextRequest } from 'next/server';
import { preferredScholarshipSlugForLegacySlug } from '@/lib/seo/legacyScholarshipSlugAliases';
import { canonicalStateVsSlug } from '@/lib/seo/stateCompareSlug';
import { canonicalUniversityVsSlug } from '@/lib/seo/universityCompareSlug';
import { updateSession } from '@/utils/supabase/middleware';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /** Canonical alphabetically sorted `-vs-` pairs for university comparison URLs. */
  const compareSeg = pathname.match(/^\/compare\/universities\/([^/]+)\/?$/i);
  if (compareSeg?.[1]) {
    const raw = decodeURIComponent(compareSeg[1]).trim().toLowerCase();
    const canon = canonicalUniversityVsSlug(raw);
    if (canon && canon !== raw) {
      const url = request.nextUrl.clone();
      url.pathname = `/compare/universities/${encodeURIComponent(canon)}`;
      return NextResponse.redirect(url, 301);
    }
  }

  /** Canonical alphabetically sorted `-vs-` pairs for state comparison URLs. */
  const stateCompareSeg = pathname.match(/^\/compare\/states\/([^/]+)\/?$/i);
  if (stateCompareSeg?.[1]) {
    const raw = decodeURIComponent(stateCompareSeg[1]).trim().toLowerCase();
    const canon = canonicalStateVsSlug(raw);
    if (canon && canon !== raw) {
      const url = request.nextUrl.clone();
      url.pathname = `/compare/states/${encodeURIComponent(canon)}`;
      return NextResponse.redirect(url, 301);
    }
  }

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

  /** Old hub tab «Saved Filters» (tab=recommended) — send users to catalog Matches. */
  if (pathname === '/scholarships' || pathname === '/scholarships/') {
    if (request.nextUrl.searchParams.get('tab') === 'recommended') {
      const url = request.nextUrl.clone();
      url.searchParams.set('tab', 'matches');
      if (!url.searchParams.get('scope')) {
        url.searchParams.set('scope', 'catalog');
      }
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
