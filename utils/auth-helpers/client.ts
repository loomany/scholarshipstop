'use client';

import { createClient } from '@/utils/supabase/client';
import { signInWithGoogleOAuth } from '@/utils/auth-helpers/googleOAuth';
import { type Provider } from '@supabase/supabase-js';
import { getAuthTypes } from '@/utils/auth-helpers/settings';
import {
  getErrorRedirect,
  getOAuthCallbackUrlWithNext,
  getOAuthRedirectURL,
  getStatusRedirect
} from '@/utils/helpers';
import { SCHOLARSHIPS_HUB_BEST_RECOMMENDATION_HREF } from '@/app/scholarships/scholarshipListUrl';
import { isSupabaseAuthCookieName } from '@/utils/supabase/authCookie';
import { redirectToPath } from './server';
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

/**
 * Expire every Supabase auth cookie visible to the browser — including chunked
 * variants (`sb-...-auth-token.0`) and STALE cookies left by a previous Supabase
 * project. After the hosted → self-host migration the cookie name changes
 * (`sb-<oldRef>-auth-token` → `sb-<newRef>-auth-token`), so `supabase.auth.signOut()`
 * only clears the current client's cookie while the orphaned one lingers and keeps
 * the middleware's `hasSupabaseAuthCookie` matching on every request.
 */
export function clearAllSupabaseAuthCookies(): void {
  if (typeof document === 'undefined') return;
  const cookieNames = document.cookie
    .split(';')
    .map((part) => part.split('=')[0]?.trim() ?? '')
    .filter((name) => name.length > 0 && isSupabaseAuthCookieName(name));
  if (cookieNames.length === 0) return;

  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  const labels = host.split('.');
  const apex = labels.length > 2 ? labels.slice(-2).join('.') : host;
  const domains = Array.from(
    new Set([host, `.${host}`, apex, `.${apex}`].filter((d) => d && d !== '.'))
  );

  for (const name of cookieNames) {
    // Host-only cookie (no Domain attribute) — how @supabase/ssr sets them by default.
    document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
    // Domain-scoped fallbacks in case a cookie was set with an explicit Domain.
    for (const domain of domains) {
      document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax; Domain=${domain}`;
    }
  }
}

/**
 * Robust client sign-out for the navbar and account page. Clears the session both
 * locally and on the server, removes any stale/foreign Supabase auth cookies left
 * by the migration, then performs a hard navigation so server components re-read the
 * cleared cookies (a soft `router.refresh()` can race with cookie removal and leave
 * the user appearing logged in).
 */
export async function signOutAndRedirect(redirectTo = '/'): Promise<void> {
  const supabase = createClient();
  try {
    await supabase.auth.signOut();
  } catch {
    // A throwing signOut (network/lock) must not block local cleanup + redirect.
  }
  clearAllSupabaseAuthCookies();
  if (typeof window !== 'undefined') {
    window.location.assign(redirectTo);
  }
}

export async function handleRequest(
  e: React.FormEvent<HTMLFormElement>,
  requestFunc: (formData: FormData) => Promise<string>,
  router: AppRouterInstance | null = null
): Promise<boolean | void> {
  // Prevent default form submission refresh
  e.preventDefault();

  const formData = new FormData(e.currentTarget);
  const redirectUrl: string = await requestFunc(formData);

  if (router) {
    // Server actions set auth cookies; without `refresh`, root layout / Navbar RSC cache
    // and `Navlinks` client state can stay stale until a hard reload.
    await router.push(redirectUrl);
    router.refresh();
    return;
  } else {
    // Otherwise, redirect server-side
    return await redirectToPath(redirectUrl);
  }
}

export async function signInWithOAuth(e: React.FormEvent<HTMLFormElement>) {
  // Prevent default form submission refresh
  e.preventDefault();
  const formData = new FormData(e.currentTarget);
  const provider = String(formData.get('provider')).trim() as Provider;

  // Create client-side supabase client and call signInWithOAuth
  const supabase = createClient();
  const redirectURL = getOAuthCallbackUrlWithNext(
    SCHOLARSHIPS_HUB_BEST_RECOMMENDATION_HREF
  );
  if (provider === 'google') {
    await signInWithGoogleOAuth(supabase, redirectURL);
    return;
  }

  await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: redirectURL
    }
  });
}

function setPreferredSignInViewCookie(view: 'password_signin' | 'email_signin') {
  document.cookie = `preferredSignInView=${view}; Path=/; SameSite=Lax`;
}

export async function signInWithPasswordClient(
  formData: FormData
): Promise<string> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '').trim();
  const supabase = createClient();
  const { error, data } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    return getErrorRedirect('/signin/password_signin', 'Sign in failed.', error.message);
  }

  if (data.user) {
    setPreferredSignInViewCookie('password_signin');
    return getStatusRedirect(
      SCHOLARSHIPS_HUB_BEST_RECOMMENDATION_HREF,
      'Success!',
      'You are now signed in.'
    );
  }

  return getErrorRedirect(
    '/signin/password_signin',
    'Hmm... Something went wrong.',
    'You could not be signed in.'
  );
}

export async function signInWithEmailClient(formData: FormData): Promise<string> {
  const email = String(formData.get('email') ?? '').trim();
  const isValidEmail = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
  if (!isValidEmail.test(email)) {
    return getErrorRedirect(
      '/signin/email_signin',
      'Invalid email address.',
      'Please try again.'
    );
  }

  const { allowPassword } = getAuthTypes();
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: getOAuthCallbackUrlWithNext(
        SCHOLARSHIPS_HUB_BEST_RECOMMENDATION_HREF
      ),
      shouldCreateUser: !allowPassword
    }
  });

  if (error) {
    return getErrorRedirect('/signin/email_signin', 'You could not be signed in.', error.message);
  }

  if (data) {
    setPreferredSignInViewCookie('email_signin');
    return getStatusRedirect(
      '/signin/email_signin',
      'Success!',
      'Please check your email for a magic link. You may now close this tab.',
      true
    );
  }

  return getErrorRedirect(
    '/signin/email_signin',
    'Hmm... Something went wrong.',
    'You could not be signed in.'
  );
}
