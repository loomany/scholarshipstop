'use client';

import { Suspense, useCallback, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { SiteBrandLoading } from '@/components/ui/SiteBrandLoading';

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email')?.trim() ?? '';
  const [phase, setPhase] = useState<'confirm' | 'loading' | 'done' | 'error'>(
    'confirm'
  );
  const [message, setMessage] = useState<string | null>(null);

  const onConfirm = useCallback(async () => {
    if (!email) return;
    setPhase('loading');
    setMessage(null);
    try {
      const res = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (!res.ok) {
        setPhase('error');
        setMessage('Something went wrong. You can manage email preferences in your account.');
        return;
      }
      setPhase('done');
    } catch {
      setPhase('error');
      setMessage('Network error. Please try again.');
    }
  }, [email]);

  if (!email) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          Unsubscribe
        </h1>
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          This link is missing a valid email. Open the unsubscribe link from your
          email, or visit your account to manage preferences.
        </p>
      </div>
    );
  }

  if (phase === 'done') {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          You&apos;re unsubscribed
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          You have been successfully unsubscribed from our mailing list. You can
          close this page.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        Unsubscribe
      </h1>
      <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
        Confirm that you no longer want marketing emails from ScholarshipTop for
        this address.
      </p>
      {message ? (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">{message}</p>
      ) : null}
      <button
        type="button"
        onClick={onConfirm}
        disabled={phase === 'loading'}
        className="mt-8 inline-flex items-center justify-center rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {phase === 'loading' ? 'Working…' : 'Confirm unsubscribe'}
      </button>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <div className="min-h-[70vh] bg-zinc-50 dark:bg-zinc-950">
      <Suspense
        fallback={
          <div className="flex min-h-[50vh] items-center justify-center">
            <SiteBrandLoading label="Loading…" />
          </div>
        }
      >
        <UnsubscribeContent />
      </Suspense>
    </div>
  );
}
