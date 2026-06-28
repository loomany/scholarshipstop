'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { SITE_INPUT_FOCUS_CLASS } from '@/lib/constants/siteInputFocus';
import { ONBOARDING_PRIMARY_BUTTON_CLASS } from '@/lib/onboarding/onboardingPrimaryCta';
import { localizedScholarshipOnboardingSignupEntryHref } from '@/lib/onboarding/onboardingResume';
import { handleRequest } from '@/utils/auth-helpers/client';
import { requestPasswordUpdate } from '@/utils/auth-helpers/server';
import { getAuthUiCopy } from '@/lib/i18n/authUiCopy';
import type { LocalizedUiLocale } from '@/lib/i18n/localizedHref';

/** Aligned with `PasswordSignIn` — same auth card rhythm. */
const fieldClass = `w-full rounded-xl border border-zinc-200/90 bg-white px-4 py-3.5 text-[15px] text-zinc-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition-[border-color,box-shadow] placeholder:text-zinc-400/80 ${SITE_INPUT_FOCUS_CLASS}`;

const labelClass = 'mb-1.5 block text-sm font-medium text-zinc-700';

interface ForgotPasswordProps {
  redirectMethod: string;
  disableButton?: boolean;
  locale?: LocalizedUiLocale;
  signInHref?: string;
  signUpHref?: string;
}

export default function ForgotPassword({
  redirectMethod,
  disableButton,
  locale = 'en',
  signInHref,
  signUpHref
}: ForgotPasswordProps) {
  const clientRouter = useRouter();
  const router = redirectMethod === 'client' ? clientRouter : null;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const ui = getAuthUiCopy(locale);
  const localeSignInHref =
    signInHref ??
    (locale === 'en'
      ? '/signin/password_signin'
      : `/${locale}/signin/password_signin`);
  const localeSignUpHref =
    signUpHref ?? localizedScholarshipOnboardingSignupEntryHref(locale);

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
            {ui.emailLabel}
          </label>
          <input
            id="email"
            placeholder={ui.emailPlaceholder}
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
          disabled={isSubmitting || disableButton}
          className={ONBOARDING_PRIMARY_BUTTON_CLASS}
        >
          {isSubmitting ? ui.sendResetLinkLoading : ui.sendResetLink}
        </button>
      </form>

      <div className="mt-10 space-y-4 text-sm">
        <p>
          <Link
            href={localeSignInHref}
            className="text-gray-600 no-underline transition hover:text-black hover:underline"
          >
            {ui.backToSignIn}
          </Link>
        </p>
        <p className="text-zinc-600">
          {ui.noAccountQuestion}{' '}
          <Link
            href={localeSignUpHref}
            className="font-semibold text-zinc-900 underline-offset-4 transition hover:text-zinc-700 hover:underline"
          >
            {ui.createOneAction}
          </Link>
        </p>
      </div>
    </div>
  );
}
