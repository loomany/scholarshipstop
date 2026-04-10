import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/utils/supabase/middleware';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
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
