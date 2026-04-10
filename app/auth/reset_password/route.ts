import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/types_db';
import { getServerAuthSiteOrigin } from '@/utils/auth-email-redirect.server';
import { getErrorRedirect, getStatusRedirect } from '@/utils/helpers';

function withNoStore(response: NextResponse) {
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const publicOrigin = getServerAuthSiteOrigin().replace(/\/+$/, '');
  const successUrl = getStatusRedirect(
    `${publicOrigin}/signin/update_password`,
    'You are now signed in.',
    'Please enter a new password for your account.'
  );

  console.info('[auth:reset-password] incoming recovery request', {
    origin: requestUrl.origin,
    publicOrigin,
    path: requestUrl.pathname,
    hasCode: Boolean(code),
    hostHeader: request.headers.get('host'),
    forwardedHost: request.headers.get('x-forwarded-host'),
    forwardedProto: request.headers.get('x-forwarded-proto')
  });

  if (!code) {
    return withNoStore(NextResponse.redirect(new URL('/signin', publicOrigin)));
  }

  const response = withNoStore(NextResponse.redirect(successUrl));
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: '', ...options, maxAge: 0 });
        }
      }
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return withNoStore(
      NextResponse.redirect(
        getErrorRedirect(
          `${publicOrigin}/signin/forgot_password`,
          error.name,
          "Sorry, we weren't able to log you in. Please try again."
        )
      )
    );
  }

  return response;
}
