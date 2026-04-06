'use client';

import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/client';
import { getURL } from '@/utils/helpers';

function shouldPromptEmailConfirmation(user: User | null): boolean {
  if (!user?.email) return false;
  return user.email_confirmed_at == null || user.email_confirmed_at === '';
}

export function ScholarshipsEmailConfirmationBanner() {
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    const apply = (user: User | null) => {
      const show = shouldPromptEmailConfirmation(user);
      setVisible(show);
      setEmail(user?.email ?? null);
      if (!show) setMsg(null);
    };

    void supabase.auth.getSession().then(({ data: { session } }) => {
      apply(session?.user ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      apply(session?.user ?? null);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  const resend = async () => {
    if (!email) return;
    setBusy(true);
    setMsg(null);
    const supabase = createClient();
    const redirect = getURL(
      `auth/callback?next=${encodeURIComponent('/scholarships')}`
    );
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: redirect }
    });
    setBusy(false);
    if (error) setMsg(error.message);
    else setMsg('Check your inbox for the link.');
  };

  if (!visible) return null;

  return (
    <div
      className="mb-6 rounded-xl border border-amber-200/90 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-4"
      role="status"
    >
      <p className="leading-snug">
        <span className="font-semibold">Confirm your email to unlock full access.</span>{' '}
        You can keep browsing; we&apos;ll finish verifying your account in the background.
      </p>
      <div className="mt-3 flex shrink-0 flex-col gap-2 sm:mt-0 sm:items-end">
        <button
          type="button"
          disabled={busy}
          onClick={resend}
          className="rounded-lg bg-amber-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-950 disabled:pointer-events-none disabled:opacity-50"
        >
          {busy ? 'Sending…' : 'Resend confirmation'}
        </button>
        {msg ? (
          <p className="max-w-xs text-right text-xs text-amber-900/85">{msg}</p>
        ) : null}
      </div>
    </div>
  );
}
