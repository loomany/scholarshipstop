import { createClient } from '@supabase/supabase-js';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import { syncOnboardingFromMetadataIfPresent } from '@/lib/onboarding/profilesOnboardingSync';
import type { Database } from '@/types_db';
import { getServerAuthSiteOrigin } from '@/utils/auth-email-redirect.server';
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
  /**
   * Must follow the browser’s public host (x-forwarded-host), not `getURL()` / NEXT_PUBLIC_SITE_URL
   * alone — a mis-set env like https://localhost:8080 on Railway would otherwise redirect users
   * off the real domain after auth.
   */
  const publicOrigin = getServerAuthSiteOrigin().replace(/\/+$/, '');
  const nextPath = safeAppPath(requestUrl.searchParams.get('next'));

  if (!code) {
    return NextResponse.redirect(new URL('/signin', publicOrigin));
  }

  /** No `next` param (typical email confirm / OAuth): land on site home, not /dashboard. */
  const defaultSuccessUrl = getStatusRedirect(
    `${publicOrigin}/`,
    'Success!',
    'Your email is confirmed. You are signed in.'
  );
  const successUrl = nextPath ? `${publicOrigin}${nextPath}` : defaultSuccessUrl;

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

  const { data: authData, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      getErrorRedirect(
        `${publicOrigin}/signin`,
        error.name,
        "Sorry, we weren't able to log you in. Please try again."
      )
    );
  }

  /**
   * Same-request pitfall: `exchangeCodeForSession` persists the session via `set` on the
   * redirect Response, but `getUser()` / `getSession()` read **request** cookies only.
   * Until the browser stores those cookies, storage looks empty — PostgREST then uses the
   * anon key, RLS blocks `profiles` upsert, and onboarding never syncs from metadata.
   * Use the user + access_token returned from the token exchange for this step.
   */
  const session = authData?.session;
  const user = authData?.user ?? session?.user;
  const metadata = user?.user_metadata;
  const metaObj =
    metadata && typeof metadata === 'object' && !Array.isArray(metadata)
      ? (metadata as Record<string, unknown>)
      : undefined;

  if (metaObj) {
    const sp = metaObj.scholarship_profile;
    console.info('[auth:callback] post-exchange metadata snapshot', {
      userId: user?.id ?? null,
      metadataKeys: Object.keys(metaObj),
      hasScholarshipProfile: Object.prototype.hasOwnProperty.call(metaObj, 'scholarship_profile'),
      scholarshipProfileType: typeof sp,
      scholarshipProfileLen:
        typeof sp === 'string' ? sp.length : sp != null && typeof sp === 'object' ? 'object' : null
    });
  } else {
    console.info('[auth:callback] no usable user_metadata object after exchange', {
      userId: user?.id ?? null,
      metadataType: metadata === undefined ? 'undefined' : typeof metadata
    });
  }

  if (user && session?.access_token && metaObj) {
    const syncClient = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        accessToken: async () => session.access_token,
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      }
    );
    await syncOnboardingFromMetadataIfPresent(syncClient, user.id, metaObj);
  }

  return response;
}
