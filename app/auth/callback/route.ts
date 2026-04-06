import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import { syncOnboardingFromMetadataIfPresent } from '@/lib/onboarding/profilesOnboardingSync';
import type { Database } from '@/types_db';
import { getErrorRedirect, getStatusRedirect } from '@/utils/helpers';

function safeAppPath(next: string | null): string | null {
  if (!next) return null;
  let path: string;
  try {
    path = decodeURIComponent(next);
  } catch {
    return null;
  }
  if (!path.startsWith('/') || path.startsWith('//')) return null;
  if (path.includes('://')) return null;
  return path;
}

/**
 * PKCE email-confirm / OAuth callback.
 * Must attach session cookies to the **redirect** Response (Route Handler cannot rely on
 * `cookies()` from `next/headers` for this — sets are often dropped).
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = requestUrl.origin;
  const nextPath = safeAppPath(requestUrl.searchParams.get('next'));

  if (!code) {
    return NextResponse.redirect(new URL('/signin', origin));
  }

  const defaultSuccessUrl = getStatusRedirect(
    `${origin}/dashboard`,
    'Success!',
    'You are now signed in.'
  );
  const successUrl = nextPath ? `${origin}${nextPath}` : defaultSuccessUrl;

  const response = NextResponse.redirect(successUrl);

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
    return NextResponse.redirect(
      getErrorRedirect(
        `${origin}/signin`,
        error.name,
        "Sorry, we weren't able to log you in. Please try again."
      )
    );
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user?.user_metadata && typeof user.user_metadata === 'object') {
    await syncOnboardingFromMetadataIfPresent(
      supabase,
      user.id,
      user.user_metadata as Record<string, unknown>
    );
  }

  return response;
}
