'use client';

import { useRouter } from 'next/navigation';
import React, { useState } from 'react';

import { SITE_INPUT_FOCUS_CLASS } from '@/lib/constants/siteInputFocus';
import { PASSWORD_POLICY_HINT } from '@/lib/validation/passwordPolicy';
import { ONBOARDING_PRIMARY_BUTTON_CLASS } from '@/lib/onboarding/onboardingPrimaryCta';
import { handleRequest } from '@/utils/auth-helpers/client';
import { updatePassword } from '@/utils/auth-helpers/server';

interface UpdatePasswordProps {
  redirectMethod: string;
}

export default function UpdatePassword({
  redirectMethod
}: UpdatePasswordProps) {
  const clientRouter = useRouter();
  const router = redirectMethod === 'client' ? clientRouter : null;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fieldClass = `w-full rounded-xl border border-zinc-200/90 bg-white px-4 py-3.5 text-[15px] text-zinc-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition-[border-color,box-shadow] placeholder:text-zinc-400/80 ${SITE_INPUT_FOCUS_CLASS}`;
  const labelClass = 'mb-1.5 block text-sm font-medium text-zinc-700';

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    setIsSubmitting(true);
    await handleRequest(e, updatePassword, router);
    setIsSubmitting(false);
  };

  return (
    <div>
      <form noValidate className="space-y-5" onSubmit={(e) => handleSubmit(e)}>
        <div className="space-y-4">
          <div>
            <label htmlFor="password" className={labelClass}>
              New password
            </label>
            <input
              id="password"
              placeholder="Enter your new password"
              type="password"
              name="password"
              autoComplete="new-password"
              className={fieldClass}
            />
            <p className="text-xs text-zinc-500">{PASSWORD_POLICY_HINT}</p>
          </div>
          <div>
            <label htmlFor="passwordConfirm" className={labelClass}>
              Confirm password
            </label>
            <input
              id="passwordConfirm"
              placeholder="Confirm your new password"
              type="password"
              name="passwordConfirm"
              autoComplete="new-password"
              className={fieldClass}
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className={ONBOARDING_PRIMARY_BUTTON_CLASS}
        >
          {isSubmitting ? 'Saving…' : 'Save new password'}
        </button>
      </form>
    </div>
  );
}
