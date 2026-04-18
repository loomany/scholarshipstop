import { createClient, type AuthError, type Session, type User } from '@supabase/supabase-js';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import { sendRegistrationVerificationEmail } from '@/lib/email/sendRegistrationVerificationEmail';
import { logRegistrationPipeline } from '@/lib/auth/registrationPipelineLog';
import { isSignupConversionEligibleUser } from '@/lib/analytics/googleAdsSignupConversion';
import { consumePendingOnboardingDraftAfterOAuth } from '@/lib/onboarding/pendingOAuthOnboarding.server';
import {
  firstLastFromOAuthUserMetadata,
  syncOAuthNamesToProfilesIfEmpty,
  syncOnboardingFromMetadataIfPresent
} from '@/lib/onboarding/profilesOnboardingSync';
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

/** GoTrue email links: admin `generateLink` / magic links often use `token_hash` + `type`, not PKCE `code`. */
const SUPABASE_EMAIL_OTP_TYPES = [
  'signup',
  'invite',
  'magiclink',
  'recovery',
  'email_change',
  'email'
] as const;

type SupabaseEmailOtpType = (typeof SUPABASE_EMAIL_OTP_TYPES)[number];

function parseEmailOtpType(raw: string | null): SupabaseEmailOtpType | null {
  if (!raw) return null;
  return (SUPABASE_EMAIL_OTP_TYPES as readonly string[]).includes(raw)
    ? (raw as SupabaseEmailOtpType)
    : null;
}

/**
 * PKCE (`code`) + OTP (`token_hash` + `type`) / OAuth callback.
 * Must attach session cookies to the **redirect** Response (Route Handler cannot rely on
 * `cookies()` from `next/headers` for this — sets are often dropped).
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const token_hash = requestUrl.searchParams.get('token_hash');
  const otpTypeRaw = requestUrl.searchParams.get('type');
  /**
   * Must follow the browser’s public host (x-forwarded-host), not `getURL()` / NEXT_PUBLIC_SITE_URL
   * alone — a mis-set env like https://localhost:8080 on Railway would otherwise redirect users
   * off the real domain after auth.
   */
  const publicOrigin = getServerAuthSiteOrigin().replace(/\/+$/, '');
  const nextPath = safeAppPath(requestUrl.searchParams.get('next'));

  if (!code && !(token_hash && otpTypeRaw)) {
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

  let authData: { user: User | null; session: Session | null } | null = null;
  let error: AuthError | null = null;

  if (code) {
    const exchanged = await supabase.auth.exchangeCodeForSession(code);
    authData = exchanged.data;
    error = exchanged.error;
  } else {
    const otpType = parseEmailOtpType(otpTypeRaw);
    if (!otpType || !token_hash) {
      return withNoStore(
        NextResponse.redirect(
          getErrorRedirect(
            `${publicOrigin}/signin`,
            'Link invalid',
            'This sign-in link is invalid or expired. Request a new link and try again.'
          )
        )
      );
    }
    const verified = await supabase.auth.verifyOtp({ token_hash, type: otpType });
    authData = verified.data;
    error = verified.error;
  }

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
   * Same-request pitfall: `exchangeCodeForSession` / `verifyOtp` persists the session via `set` on the
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

  /** Full onboarding from DB + HttpOnly cookie (before Google OAuth) — does not rely on localStorage. */
  if (userForSync && session?.access_token) {
    await consumePendingOnboardingDraftAfterOAuth(
      request,
      response,
      userForSync.id,
      session.access_token
    );
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
    await syncOAuthNamesToProfilesIfEmpty(syncClient, userForSync.id, metaObj);
  }

  if (userForSync?.id && userForSync.email) {
    try {
      const firstName =
        metaObj && typeof metaObj.first_name === 'string'
          ? metaObj.first_name
          : metaObj
            ? firstLastFromOAuthUserMetadata(metaObj).first_name
            : null;
      await notifyTelegramSignup({
        userId: userForSync.id,
        email: userForSync.email,
        firstName,
        source: 'auth-callback'
      });
    } catch (e) {
      console.error('[auth:callback] notifyTelegramSignup failed', e);
    }
  }

  /**
   * Same optional “confirm when convenient” Resend email as email onboarding (`enqueueRegistrationVerificationEmail`).
   * OAuth signups never hit that server action — only PKCE callback here.
   */
  const REGISTER_VERIFY_EMAIL_MAX_ACCOUNT_AGE_MS = 15 * 60 * 1000;
  if (userForSync?.email && userForSync.id && userForSync.created_at) {
    const age = Date.now() - new Date(userForSync.created_at).getTime();
    if (age >= 0 && age < REGISTER_VERIFY_EMAIL_MAX_ACCOUNT_AGE_MS) {
      const displayName =
        metaObj && typeof metaObj.first_name === 'string'
          ? metaObj.first_name
          : metaObj
            ? firstLastFromOAuthUserMetadata(metaObj).first_name
            : null;
      void sendRegistrationVerificationEmail(userForSync.email, userForSync.id, {
        displayName: displayName ?? undefined
      }).then((result) => {
        if (!result.ok && result.skipped) {
          console.warn('[auth:callback] registration verification email', result.skipped);
        }
      });
    }
  }

  if (userForSync?.email_confirmed_at) {
    try {
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
        logRegistrationPipeline('EmailConfirmed', {
          source: 'auth-callback',
          userId: userForSync.id,
          via: 'gotrue_email_confirmed_at'
        });
        await notifyTelegramEmailVerified({
          userId: userForSync.id,
          email: userForSync.email
        });
      }
    } catch (e) {
      console.error('[auth:callback] email verified sync / telegram failed', e);
    }
  }

  /**
   * New-account sign-in / email confirm: one client-side hop so gtag can fire
   * `conversion` + `dataLayer.push({ event: 'signup_success' })` (not URL-based).
   */
  if (userForSync && isSignupConversionEligibleUser(userForSync)) {
    try {
      const u = new URL(successUrl);
      const nextAfterAuth = `${u.pathname}${u.search}`;
      const conversionUrl = new URL('/auth/register-conversion', publicOrigin);
      conversionUrl.searchParams.set('next', nextAfterAuth);
      conversionUrl.searchParams.set('eligible', '1');
      response.headers.set('Location', conversionUrl.toString());
    } catch {
      /* keep original Location */
    }
  }

  return withNoStore(response);
}
