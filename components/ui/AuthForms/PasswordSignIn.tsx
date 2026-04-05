'use client';

import Link from 'next/link';
import { ONBOARDING_PRIMARY_BUTTON_CLASS } from '@/lib/onboarding/onboardingPrimaryCta';
import { SCHOLARSHIP_ONBOARDING_SIGNUP_ENTRY_HREF } from '@/lib/onboarding/onboardingResume';
import { signInWithPassword } from '@/utils/auth-helpers/server';
import { handleRequest } from '@/utils/auth-helpers/client';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';

const fieldClass =
  'w-full rounded-xl border border-zinc-200/90 bg-white px-4 py-3.5 text-[15px] text-zinc-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition-[border-color,box-shadow] placeholder:text-zinc-400/80 focus:border-teal-400 focus:ring-2 focus:ring-teal-500/25';

const labelClass = 'mb-1.5 block text-sm font-medium text-zinc-700';

interface PasswordSignInProps {
  redirectMethod: string;
}

export default function PasswordSignIn({ redirectMethod }: PasswordSignInProps) {
  const router = redirectMethod === 'client' ? useRouter() : null;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    setIsSubmitting(true);
    await handleRequest(e, signInWithPassword, router, {
      refreshAfterPush: true
    });
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
        <button
          type="submit"
          disabled={isSubmitting}
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
