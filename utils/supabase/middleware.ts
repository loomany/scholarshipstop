import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

import { hasSupabaseAuthCookie } from '@/utils/supabase/authCookie';

/** GoTrue rejects refresh; cookies must be cleared or every request will retry and spam logs. */
function isStaleRefreshAuthError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: string; message?: string };
  const code = typeof e.code === 'string' ? e.code : '';
  if (code === 'refresh_token_not_found') return true;
  if (code === 'invalid_grant') return true;
  const msg = (typeof e.message === 'string' ? e.message : '').toLowerCase();
  if (msg.includes('refresh token not found')) return true;
  if (msg.includes('invalid refresh token')) return true;
  return false;
}

export const createClient = (request: NextRequest) => {
  // Create an unmodified response
  let response = NextResponse.next({
    request: {
      headers: request.headers
    }
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // If the cookie is updated, update the cookies for the request and response
          request.cookies.set({
            name,
            value,
            ...options
          });
          response = NextResponse.next({
            request: {
              headers: request.headers
            }
          });
          response.cookies.set({
            name,
            value,
            ...options
          });
        },
        remove(name: string, options: CookieOptions) {
          // If the cookie is removed, update the cookies for the request and response
          request.cookies.set({
            name,
            value: '',
            ...options
          });
          response = NextResponse.next({
            request: {
              headers: request.headers
            }
          });
          response.cookies.set({
            name,
            value: '',
            ...options
          });
        }
      }
    }
  );

  return { supabase, response };
};

export const updateSession = async (request: NextRequest) => {
  if (!hasSupabaseAuthCookie(request.cookies.getAll())) {
    return NextResponse.next({
      request: {
        headers: request.headers
      }
    });
  }

  try {
    const { supabase, response } = createClient(request);

    // Refreshes session when needed (Server Components / RSC cookie contract).
    // https://supabase.com/docs/guides/auth/server-side/nextjs
    try {
      const { error } = await supabase.auth.getUser();
      if (error && isStaleRefreshAuthError(error)) {
        await supabase.auth.signOut();
      }
    } catch (authErr) {
      if (isStaleRefreshAuthError(authErr)) {
        await supabase.auth.signOut();
      } else {
        throw authErr;
      }
    }

    return response;
  } catch {
    return NextResponse.next({
      request: {
        headers: request.headers
      }
    });
  }
};
