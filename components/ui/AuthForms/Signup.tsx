'use client';

import Button from '@/components/ui/Button';
import React from 'react';
import Link from 'next/link';
import { signUp } from '@/utils/auth-helpers/server';
import { handleRequest } from '@/utils/auth-helpers/client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { SITE_INPUT_FOCUS_CLASS } from '@/lib/constants/siteInputFocus';
import { PASSWORD_POLICY_HINT } from '@/lib/validation/passwordPolicy';
import { getAuthUiCopy } from '@/lib/i18n/authUiCopy';
import type { LocalizedUiLocale } from '@/lib/i18n/localizedHref';

interface SignUpProps {
  allowEmail: boolean;
  redirectMethod: string;
  locale?: LocalizedUiLocale;
  passwordSignInHref?: string;
  emailSignInHref?: string;
}

export default function SignUp({
  allowEmail,
  redirectMethod,
  locale = 'en',
  passwordSignInHref,
  emailSignInHref
}: SignUpProps) {
  const clientRouter = useRouter();
  const router = redirectMethod === 'client' ? clientRouter : null;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const ui = getAuthUiCopy(locale);
  const localePasswordSignInHref =
    passwordSignInHref ??
    (locale === 'en'
      ? '/signin/password_signin'
      : `/${locale}/signin/password_signin`);
  const localeEmailSignInHref =
    emailSignInHref ??
    (locale === 'en'
      ? '/signin/email_signin'
      : `/${locale}/signin/email_signin`);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    setIsSubmitting(true);
    await handleRequest(e, signUp, router);
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
            <label htmlFor="password">{ui.passwordLabel}</label>
            <input
              id="password"
              placeholder={ui.passwordPlaceholderSignUp}
              type="password"
              name="password"
              autoComplete="new-password"
              className={`w-full rounded-md border border-zinc-200 bg-white px-3 py-3 text-zinc-900 placeholder:text-zinc-400 outline-none ${SITE_INPUT_FOCUS_CLASS}`}
            />
            <p className="text-xs text-zinc-500">{PASSWORD_POLICY_HINT}</p>
          </div>
          <Button
            variant="slim"
            type="submit"
            className="mt-1"
            loading={isSubmitting}
          >
            {ui.signUpButton}
          </Button>
        </div>
      </form>
      <p>{ui.haveAccountQuestion}</p>
      <p>
        <Link href={localePasswordSignInHref} className="font-light text-sm">
          {ui.signInWithEmailPassword}
        </Link>
      </p>
      {allowEmail && (
        <p>
          <Link href={localeEmailSignInHref} className="font-light text-sm">
            {ui.signInWithEmailLink}
          </Link>
        </p>
      )}
    </div>
  );
}
