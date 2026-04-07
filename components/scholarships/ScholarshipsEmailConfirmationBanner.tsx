'use client';

import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { resendRegistrationVerificationEmail } from '@/app/actions/registrationVerification';
import type { Database } from '@/types_db';
import { createClient } from '@/utils/supabase/client';
import { getURL } from '@/utils/helpers';

type ProfileEmailVerified = Pick<
  Database['public']['Tables']['profiles']['Row'],
  'email_verified'
>;

type ResendMode = 'app' | 'supabase';

function pickResendMode(
  user: User,
  profileEmailVerified: boolean | null | undefined
): ResendMode | null {
  if (profileEmailVerified === false) return 'app';
  if (user.email_confirmed_at == null || user.email_confirmed_at === '') {
    return 'supabase';
  }
  return null;
}

export function ScholarshipsEmailConfirmationBanner() {
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [resendMode, setResendMode] = useState<ResendMode | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    const apply = async (user: User | null) => {
      if (!user?.email) {
        setVisible(false);
        setEmail(null);
        setResendMode(null);
        return;
      }
      setEmail(user.email);
      const { data: prof } = await supabase
        .from('profiles')
        .select('email_verified')
        .eq('id', user.id)
        .maybeSingle();
      const row = prof as ProfileEmailVerified | null;
      const mode = pickResendMode(user, row?.email_verified);
      const show = mode != null;
      setVisible(show);
      setResendMode(mode);
      if (!show) setMsg(null);
    };

    void supabase.auth.getSession().then(({ data: { session } }) => {
      void apply(session?.user ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      void apply(session?.user ?? null);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  const resend = async () => {
    if (!email) return;
    setBusy(true);
    setMsg(null);
    try {
      if (resendMode === 'app') {
        const r = await resendRegistrationVerificationEmail();
        if (!r.ok) setMsg(r.error ?? 'Could not send email.');
        else setMsg('Check your inbox for the link.');
      } else if (resendMode === 'supabase') {
        const supabase = createClient();
        const emailRedirectTo = getURL(
          `auth/callback?next=${encodeURIComponent('/scholarships')}`
        );
        const { error } = await supabase.auth.resend({
          type: 'signup',
          email,
          options: { emailRedirectTo }
        });
        if (error) setMsg(error.message);
        else setMsg('Check your inbox for the link.');
      }
    } finally {
      setBusy(false);
    }
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
