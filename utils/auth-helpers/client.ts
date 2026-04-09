'use client';

import { createClient } from '@/utils/supabase/client';
import { type Provider } from '@supabase/supabase-js';
import { getAuthTypes } from '@/utils/auth-helpers/settings';
import {
  getErrorRedirect,
  getOAuthRedirectURL,
  getStatusRedirect
} from '@/utils/helpers';
import { redirectToPath } from './server';
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

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
  const redirectURL = getOAuthRedirectURL('/auth/callback');
  await supabase.auth.signInWithOAuth({
    provider: provider,
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
    return getStatusRedirect('/scholarships', 'Success!', 'You are now signed in.');
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
      emailRedirectTo: getOAuthRedirectURL('/auth/callback'),
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
