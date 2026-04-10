import { createClient } from '@supabase/supabase-js';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import { syncOnboardingFromMetadataIfPresent } from '@/lib/onboarding/profilesOnboardingSync';
import { notifyTelegramEmailVerified, notifyTelegramSignup } from '@/lib/telegram/bot';
import type { Database } from '@/types_db';
import { getServerAuthSiteOrigin } from '@/utils/auth-email-redirect.server';
import { getErrorRedirect, getStatusRedirect } from '@/utils/helpers';

function withNoStore(response: NextResponse) {
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

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
    return withNoStore(NextResponse.redirect(new URL('/signin', publicOrigin)));
  }

  /** No `next` param (typical email confirm / OAuth): land on site home, not /dashboard. */
  const defaultSuccessUrl = getStatusRedirect(
    `${publicOrigin}/`,
    'Success!',
    'Your email is confirmed. You are signed in.'
  );
  const successUrl = nextPath ? `${publicOrigin}${nextPath}` : defaultSuccessUrl;

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

  const { data: authData, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return withNoStore(
      NextResponse.redirect(
      getErrorRedirect(
        `${publicOrigin}/signin`,
        error.name,
        "Sorry, we weren't able to log you in. Please try again."
      )
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
  const userFromExchange = authData?.user ?? session?.user;

  /**
   * `exchangeCodeForSession` sometimes returns a slim `user` without full `user_metadata`
   * (e.g. `scholarship_profile` missing). GoTrue’s `getUser(jwt)` returns the canonical user
   * record — required to copy onboarding data into `public.profiles` after email confirm.
   */
  let userForSync = userFromExchange;
  if (session?.access_token && userFromExchange) {
    const authReader = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      }
    );
    const { data: jwtUserData, error: jwtUserErr } = await authReader.auth.getUser(
      session.access_token
    );
    if (!jwtUserErr && jwtUserData?.user) {
      userForSync = jwtUserData.user;
    } else if (jwtUserErr) {
      console.warn('[auth:callback] getUser(jwt) after exchange failed', jwtUserErr.message);
    }
  }

  const metadata = userForSync?.user_metadata;
  const metaObj =
    metadata && typeof metadata === 'object' && !Array.isArray(metadata)
      ? (metadata as Record<string, unknown>)
      : undefined;

  if (metaObj) {
    const sp = metaObj.scholarship_profile;
    console.info('[auth:callback] metadata snapshot (after getUser jwt)', {
      userId: userForSync?.id ?? null,
      metadataKeys: Object.keys(metaObj),
      hasScholarshipProfile: Object.prototype.hasOwnProperty.call(metaObj, 'scholarship_profile'),
      scholarshipProfileType: typeof sp,
      scholarshipProfileLen:
        typeof sp === 'string' ? sp.length : sp != null && typeof sp === 'object' ? 'object' : null
    });
  } else {
    console.info('[auth:callback] no usable user_metadata after exchange/getUser', {
      userId: userForSync?.id ?? null,
      metadataType: metadata === undefined ? 'undefined' : typeof metadata
    });
  }

  if (userForSync && session?.access_token && metaObj) {
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
    await syncOnboardingFromMetadataIfPresent(syncClient, userForSync.id, metaObj);
  }

  if (userForSync?.id && userForSync.email) {
    const firstName =
      metaObj && typeof metaObj.first_name === 'string' ? metaObj.first_name : null;
    await notifyTelegramSignup({
      userId: userForSync.id,
      email: userForSync.email,
      firstName,
      source: 'auth-callback'
    });
  }

  if (userForSync?.email_confirmed_at) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (url && key) {
      const admin = createClient<Database>(url, key);
      const { error: evErr } = await admin
        .schema('public')
        .from('profiles')
        .update({
          email_verified: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', userForSync.id);
      if (evErr) {
        console.warn('[auth:callback] profiles email_verified sync', evErr.message);
      }
    }

    if (userForSync.email) {
      await notifyTelegramEmailVerified({
        userId: userForSync.id,
        email: userForSync.email
      });
    }
  }

  return withNoStore(response);
}
