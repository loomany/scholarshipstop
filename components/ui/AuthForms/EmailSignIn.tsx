'use client';

import Button from '@/components/ui/Button';
import Link from 'next/link';

import { SITE_INPUT_FOCUS_CLASS } from '@/lib/constants/siteInputFocus';

import { localizedScholarshipOnboardingSignupEntryHref } from '@/lib/onboarding/onboardingResume';
import {
  handleRequest,
  signInWithEmailClient
} from '@/utils/auth-helpers/client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { getAuthUiCopy } from '@/lib/i18n/authUiCopy';
import type { LocalizedUiLocale } from '@/lib/i18n/localizedHref';

interface EmailSignInProps {
  allowPassword: boolean;
  redirectMethod: string;
  disableButton?: boolean;
  locale?: LocalizedUiLocale;
  passwordSignInHref?: string;
  signUpHref?: string;
}

export default function EmailSignIn({
  allowPassword,
  redirectMethod,
  disableButton,
  locale = 'en',
  passwordSignInHref,
  signUpHref
}: EmailSignInProps) {
  const clientRouter = useRouter();
  const router = redirectMethod === 'client' ? clientRouter : null;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const ui = getAuthUiCopy(locale);
  const localePasswordHref =
    passwordSignInHref ??
    (locale === 'en'
      ? '/signin/password_signin'
      : `/${locale}/signin/password_signin`);
  const localeSignUpHref =
    signUpHref ?? localizedScholarshipOnboardingSignupEntryHref(locale);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    setIsSubmitting(true);
    await handleRequest(e, signInWithEmailClient, router);
    setIsSubmitting(false);
  };

  return (
    <div className="my-8">
      <form
        noValidate={true}
        className="mb-4"
        onSubmit={(e) => handleSubmit(e)}
      >
        <div className="grid gap-2">
          <div className="grid gap-1">
            <label htmlFor="email">{ui.emailLabel}</label>
            <input
              id="email"
              placeholder={ui.emailPlaceholder}
              type="email"
              name="email"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect="off"
              className={`w-full rounded-md border border-zinc-200 bg-white px-3 py-3 text-zinc-900 placeholder:text-zinc-400 outline-none ${SITE_INPUT_FOCUS_CLASS}`}
            />
          </div>
          <Button
            variant="slim"
            type="submit"
            className="mt-1"
            loading={isSubmitting}
            disabled={disableButton}
          >
            {ui.signInButton}
          </Button>
        </div>
      </form>
      {allowPassword && (
        <>
          <p>
            <Link href={localePasswordHref} className="font-light text-sm">
              {ui.signInWithEmailPassword}
            </Link>
          </p>
          <p>
            <Link href={localeSignUpHref} className="font-light text-sm">
              {ui.noAccountQuestion} {ui.signUpAction}
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
