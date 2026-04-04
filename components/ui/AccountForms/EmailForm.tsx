'use client';

import Button from '@/components/ui/Button';
import { accountPagePrimaryButtonClass } from '@/lib/constants/scholarshipActionUi';
import Card from '@/components/ui/Card';
import { updateEmail } from '@/utils/auth-helpers/server';
import { handleRequest } from '@/utils/auth-helpers/client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function EmailForm({
  userEmail,
  variant = 'default'
}: {
  userEmail: string | undefined;
  variant?: 'default' | 'saas' | 'embedded';
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    setIsSubmitting(true);
    // Check if the new email is the same as the old email
    if (e.currentTarget.newEmail.value === userEmail) {
      e.preventDefault();
      setIsSubmitting(false);
      return;
    }
    handleRequest(e, updateEmail, router);
    setIsSubmitting(false);
  };

  if (variant === 'saas' || variant === 'embedded') {
    const isEmbedded = variant === 'embedded';

    return (
      <div
        className={
          isEmbedded
            ? 'border-t border-zinc-100 pt-5'
            : 'rounded-2xl border border-zinc-100 bg-white p-6 shadow-[0_2px_24px_-8px_rgba(15,23,42,0.08)]'
        }
      >
        <h3 className="text-base font-semibold text-zinc-900">Email</h3>
        <p className="mt-1 text-sm text-zinc-500">
          We will send a verification email when you change this address.
        </p>
        <form
          id="emailForm"
          className={isEmbedded ? 'mt-4' : 'mt-5'}
          onSubmit={(e) => handleSubmit(e)}
        >
          <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Email address
          </label>
          <input
            type="text"
            name="newEmail"
            className="mt-2 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-500/20"
            defaultValue={userEmail ?? ''}
            placeholder="you@example.com"
            maxLength={64}
            autoComplete="email"
          />
          <div className="mt-6 flex flex-col gap-3">
            <p className="text-sm text-zinc-500">
              Check your inbox after updating — confirmation is required.
            </p>
            <div className="flex justify-start">
              <button
                type="submit"
                disabled={isSubmitting}
                className={accountPagePrimaryButtonClass}
              >
                {isSubmitting ? 'Sending…' : 'Update email'}
              </button>
            </div>
          </div>
        </form>
      </div>
    );
  }

  return (
    <Card
      title="Your Email"
      description="Please enter the email address you want to use to login."
      footer={
        <div className="flex flex-col items-start justify-between sm:flex-row sm:items-center">
          <p className="pb-4 text-zinc-600 sm:pb-0">
            We will email you to verify the change.
          </p>
          <Button
            variant="slim"
            type="submit"
            form="emailForm"
            loading={isSubmitting}
          >
            Update Email
          </Button>
        </div>
      }
    >
      <div className="mt-8 mb-4 text-xl font-semibold text-zinc-900">
        <form id="emailForm" onSubmit={(e) => handleSubmit(e)}>
          <input
            type="text"
            name="newEmail"
            className="w-1/2 rounded-md border border-zinc-200 bg-white px-3 py-3 text-zinc-900 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20"
            defaultValue={userEmail ?? ''}
            placeholder="Your email"
            maxLength={64}
          />
        </form>
      </div>
    </Card>
  );
}
