'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';

import { ONBOARDING_PRIMARY_BUTTON_CLASS } from '@/lib/onboarding/onboardingPrimaryCta';
import { createClient } from '@/utils/supabase/client';

const secondaryButtonClass =
  'inline-flex w-full cursor-pointer items-center justify-center rounded-2xl border border-zinc-300 bg-white px-6 py-4 text-center text-base font-semibold text-zinc-800 shadow-sm transition hover:border-zinc-400 hover:bg-zinc-50 disabled:pointer-events-none disabled:opacity-60';

type Props = {
  email: string;
  disabled?: boolean;
};

export function ScholarshipOnboardingStep5EmailConfirm({ email, disabled = false }: Props) {
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);

  const handleResend = useCallback(async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setResendError('No email on file. Go back and create your account again.');
      return;
    }
    setResendError(null);
    setResendMessage(null);
    setResending(true);
    try {
      const supabase = createClient();
      const emailRedirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent('/scholarships')}`;
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: trimmed,
        options: { emailRedirectTo }
      });
      if (error) {
        setResendError(error.message);
        return;
      }
      setResendMessage('Email sent again.');
    } catch {
      setResendError('Something went wrong. Check your connection and try again.');
    } finally {
      setResending(false);
    }
  }, [email]);

  const displayEmail = email.trim() || 'your email';

  return (
    <div className="w-full space-y-6">
      <div className="mx-auto max-w-lg text-center">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
          Step 5 of 5 · Email
        </p>
        <h2
          id="onboarding-step5-title"
          className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl"
        >
          Confirm your email
        </h2>
        <p className="mx-auto mt-3 max-w-md text-base font-medium leading-7 text-zinc-600 sm:max-w-lg">
          We&apos;ve sent a confirmation link to your email. Please check your inbox and click the
          link to activate your account.
        </p>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-center text-sm text-zinc-800">
        <span className="text-zinc-500">Sent to </span>
        <span className="break-all font-medium">{displayEmail}</span>
      </div>

      <div className="space-y-4">
        <button
          type="button"
          onClick={handleResend}
          disabled={disabled || resending}
          className={ONBOARDING_PRIMARY_BUTTON_CLASS}
        >
          {resending ? 'Sending…' : 'Resend email'}
        </button>

        <Link href="/" className={secondaryButtonClass}>
          Back to home
        </Link>

        <p className="text-center text-sm text-zinc-600">
          Already confirmed?{' '}
          <Link
            href="/signin"
            className="font-medium text-zinc-900 underline-offset-2 hover:underline"
          >
            Sign in
          </Link>
        </p>

        {resendMessage ? (
          <p className="text-center text-sm font-medium text-emerald-700" role="status">
            {resendMessage}
          </p>
        ) : null}
        {resendError ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-center text-sm text-amber-950">
            {resendError}
          </p>
        ) : null}
      </div>
    </div>
  );
}
