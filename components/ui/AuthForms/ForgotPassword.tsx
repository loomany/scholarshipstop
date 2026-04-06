'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { ONBOARDING_PRIMARY_BUTTON_CLASS } from '@/lib/onboarding/onboardingPrimaryCta';
import { SCHOLARSHIP_ONBOARDING_SIGNUP_ENTRY_HREF } from '@/lib/onboarding/onboardingResume';
import { handleRequest } from '@/utils/auth-helpers/client';
import { requestPasswordUpdate } from '@/utils/auth-helpers/server';

/** Aligned with `PasswordSignIn` — same auth card rhythm. */
const fieldClass =
  'w-full rounded-xl border border-zinc-200/90 bg-white px-4 py-3.5 text-[15px] text-zinc-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition-[border-color,box-shadow] placeholder:text-zinc-400/80 focus:border-teal-400 focus:ring-2 focus:ring-teal-500/25';

const labelClass = 'mb-1.5 block text-sm font-medium text-zinc-700';

interface ForgotPasswordProps {
  redirectMethod: string;
  disableButton?: boolean;
}

export default function ForgotPassword({
  redirectMethod,
  disableButton
}: ForgotPasswordProps) {
  const router = redirectMethod === 'client' ? useRouter() : null;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    setIsSubmitting(true);
    await handleRequest(e, requestPasswordUpdate, router);
    setIsSubmitting(false);
  };

  return (
    <div>
      <form noValidate className="space-y-5" onSubmit={(e) => handleSubmit(e)}>
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
        <button
          type="submit"
          disabled={disableButton || isSubmitting}
          className={ONBOARDING_PRIMARY_BUTTON_CLASS}
        >
          {isSubmitting ? 'Sending…' : 'Send reset link'}
        </button>
      </form>

      <div className="mt-10 space-y-4 text-sm">
        <p>
          <Link
            href="/signin/password_signin"
            className="text-gray-600 no-underline transition hover:text-black hover:underline"
          >
            Back to sign in
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
