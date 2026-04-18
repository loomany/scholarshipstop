'use client';

import Link from 'next/link';
import { SITE_INPUT_FOCUS_CLASS } from '@/lib/constants/siteInputFocus';
import { ONBOARDING_PRIMARY_BUTTON_CLASS } from '@/lib/onboarding/onboardingPrimaryCta';
import { SCHOLARSHIP_ONBOARDING_SIGNUP_ENTRY_HREF } from '@/lib/onboarding/onboardingResume';
import {
  handleRequest,
  signInWithPasswordClient
} from '@/utils/auth-helpers/client';
import { getAuthTypes } from '@/utils/auth-helpers/settings';
import { getOAuthRedirectURL } from '@/utils/helpers';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';

const fieldClass = `w-full rounded-xl border border-zinc-200/90 bg-white px-4 py-3.5 text-[15px] text-zinc-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition-[border-color,box-shadow] placeholder:text-zinc-400/80 ${SITE_INPUT_FOCUS_CLASS}`;

const labelClass = 'mb-1.5 block text-sm font-medium text-zinc-700';

interface PasswordSignInProps {
  redirectMethod: string;
}

export default function PasswordSignIn({ redirectMethod }: PasswordSignInProps) {
  const router = redirectMethod === 'client' ? useRouter() : null;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [oauthPending, setOauthPending] = useState(false);
  const { allowOauth } = getAuthTypes();

  const handleGoogleAuth = async () => {
    setOauthPending(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: getOAuthRedirectURL('/auth/callback')
      }
    });
    if (error) {
      setOauthPending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    setIsSubmitting(true);
    await handleRequest(e, signInWithPasswordClient, router);
    setIsSubmitting(false);
  };

  return (
    <div>
      <form noValidate className="space-y-5" onSubmit={(e) => handleSubmit(e)}>
        <div className="space-y-4">
          <div>
            <label htmlFor="email" className={labelClass}>
              Email
            </label>
            <input
              id="email"
              placeholder="you@example.com"
              type="email"
              name="email"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect="off"
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor="password" className={labelClass}>
              Password
            </label>
            <input
              id="password"
              placeholder="Enter your password"
              type="password"
              name="password"
              autoComplete="current-password"
              className={fieldClass}
            />
          </div>
        </div>
        {allowOauth ? (
          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={isSubmitting || oauthPending}
            className="bg-white border border-gray-300 rounded-xl py-3 px-4 w-full flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors text-gray-700 font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 48 48"
              width={20}
              height={20}
              aria-hidden
            >
              <path
                fill="#EA4335"
                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
              />
              <path
                fill="#4285F4"
                d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.8 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
              />
              <path
                fill="#FBBC05"
                d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
              />
              <path
                fill="#34A853"
                d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
              />
              <path fill="none" d="M0 0h48v48H0z" />
            </svg>
            Вход с гуглом
          </button>
        ) : null}
        <button
          type="submit"
          disabled={isSubmitting || oauthPending}
          className={ONBOARDING_PRIMARY_BUTTON_CLASS}
        >
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <div className="mt-10 space-y-4 text-sm">
        <p>
          <Link
            href="/signin/forgot_password"
            className="text-gray-600 no-underline transition hover:text-black hover:underline"
          >
            Forgot your password?
          </Link>
        </p>
        <p className="text-zinc-600">
          Don&apos;t have an account?{' '}
          <Link
            href={SCHOLARSHIP_ONBOARDING_SIGNUP_ENTRY_HREF}
            className="font-semibold text-zinc-900 underline-offset-4 transition hover:text-zinc-700 hover:underline"
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
