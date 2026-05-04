'use client';

import { useCallback, useEffect, useState } from 'react';
import { Mail, X } from 'lucide-react';

import { resendRegistrationVerificationEmail } from '@/app/actions/registrationVerification';
import { SCHOLARSHIPS_HUB_ALL_MATCHES_HREF } from '@/app/scholarships/scholarshipListUrl';
import {
  SCHOLARSHIP_ACTION_FILL,
  SCHOLARSHIP_ACTION_FOCUS_VISIBLE
} from '@/lib/constants/scholarshipActionUi';
import { dismissRouteProgress } from '@/lib/navigation/dismissRouteProgress';
import { scholarshipNeedsEmailConfirmation } from '@/lib/scholarships/scholarshipEmailConfirmationGate';
import { toast } from '@/components/ui/Toasts/use-toast';
import { createClient } from '@/utils/supabase/client';
import { getURL } from '@/utils/helpers';
import type { Database } from '@/types_db';

type ProfileEmailVerified = Pick<
  Database['public']['Tables']['profiles']['Row'],
  'email_verified'
>;

type ResendMode = 'app' | 'supabase';

function pickResendMode(
  emailConfirmedAt: string | null | undefined,
  profileEmailVerified: boolean | null | undefined
): ResendMode | null {
  if (profileEmailVerified === false) return 'app';
  if (emailConfirmedAt == null || emailConfirmedAt === '') return 'supabase';
  return null;
}

export type ScholarshipEmailConfirmRequiredModalProps = {
  open: boolean;
  onClose: () => void;
  /** Called after we detect email is confirmed (session refresh). */
  onEmailVerified?: () => void;
};

export default function ScholarshipEmailConfirmRequiredModal({
  open,
  onClose,
  onEmailVerified
}: ScholarshipEmailConfirmRequiredModalProps) {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [resendMode, setResendMode] = useState<ResendMode | null>(null);
  const [resendBusy, setResendBusy] = useState(false);
  const [recheckBusy, setRecheckBusy] = useState(false);

  const syncUser = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { session }
    } = await supabase.auth.getSession();
    const user = session?.user ?? null;
    if (!user?.email) {
      setUserEmail(null);
      setResendMode(null);
      return;
    }
    setUserEmail(user.email);
    const { data: prof } = await supabase
      .from('profiles')
      .select('email_verified')
      .eq('id', user.id)
      .maybeSingle();
    const row = prof as ProfileEmailVerified | null;
    setResendMode(pickResendMode(user.email_confirmed_at, row?.email_verified));
  }, []);

  useEffect(() => {
    if (!open) return;
    void syncUser();
  }, [open, syncUser]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dismissRouteProgress();
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const resend = useCallback(async () => {
    if (!userEmail || resendBusy || !resendMode) return;
    setResendBusy(true);
    try {
      if (resendMode === 'app') {
        const r = await resendRegistrationVerificationEmail();
        if (!r.ok) {
          toast({
            title: 'Could not send email',
            description: r.error ?? 'Try again in a moment.',
            variant: 'destructive'
          });
        } else {
          toast({
            title: 'Check your inbox',
            description: 'We sent a confirmation message to your email.',
            duration: 6000
          });
        }
      } else {
        const supabase = createClient();
        const emailRedirectTo = getURL(
          `auth/callback?next=${encodeURIComponent(SCHOLARSHIPS_HUB_ALL_MATCHES_HREF)}`
        );
        const { error } = await supabase.auth.resend({
          type: 'signup',
          email: userEmail,
          options: { emailRedirectTo }
        });
        if (error) {
          toast({
            title: 'Could not resend',
            description: error.message,
            variant: 'destructive'
          });
        } else {
          toast({
            title: 'Check your inbox',
            description: 'We sent a confirmation message to your email.',
            duration: 6000
          });
        }
      }
    } finally {
      setResendBusy(false);
    }
  }, [userEmail, resendMode, resendBusy]);

  const recheckSession = useCallback(async () => {
    setRecheckBusy(true);
    try {
      const supabase = createClient();
      await supabase.auth.refreshSession();
      const {
        data: { session }
      } = await supabase.auth.getSession();
      const user = session?.user ?? null;
      if (!user?.id) {
        toast({
          title: 'Still signed out',
          description: 'Sign in again, then try opening the grant.',
          variant: 'destructive'
        });
        return;
      }
      const { data: prof } = await supabase
        .from('profiles')
        .select('email_verified')
        .eq('id', user.id)
        .maybeSingle();
      const row = prof as ProfileEmailVerified | null;
      const stillNeeds = scholarshipNeedsEmailConfirmation(user, row?.email_verified);
      if (!stillNeeds) {
        onEmailVerified?.();
        onClose();
        toast({
          title: 'Email confirmed',
          description: 'You can open grant details — free previews apply as before.',
          duration: 5000
        });
      } else {
        toast({
          title: 'Not confirmed yet',
          description: 'Open the link in your email, then tap “I’ve confirmed” again.',
          duration: 6000
        });
      }
    } finally {
      setRecheckBusy(false);
    }
  }, [onClose, onEmailVerified]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[310] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-zinc-900/45 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="scholarship-email-confirm-title"
        className="relative z-10 w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl sm:p-6"
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/55 focus-visible:ring-offset-0"
        >
          <X className="h-5 w-5" strokeWidth={2} aria-hidden />
        </button>

        <div className="px-1 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-orange-50 ring-1 ring-orange-100">
            <Mail className="h-6 w-6 text-[#FF7A1A]" strokeWidth={2} aria-hidden />
          </div>
          <h2
            id="scholarship-email-confirm-title"
            className="text-xl font-bold tracking-tight text-zinc-900 sm:text-[1.35rem]"
          >
            Confirm your email
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-600 sm:text-[0.9375rem]">
            To open grant details and use your free previews, confirm the address on your
            account. After that, you can browse up to ten grants before choosing a plan.
          </p>
          {userEmail ? (
            <p className="mt-2 rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-700">
              {userEmail}
            </p>
          ) : null}

          <div className="mt-6 flex flex-col gap-2.5">
            <button
              type="button"
              disabled={!userEmail || !resendMode || resendBusy}
              onClick={() => void resend()}
              className={`inline-flex h-11 w-full items-center justify-center rounded-xl px-5 text-sm font-semibold text-white shadow-md shadow-orange-500/25 transition hover:bg-[#E6670C] focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/80 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${SCHOLARSHIP_ACTION_FILL} ${SCHOLARSHIP_ACTION_FOCUS_VISIBLE}`}
            >
              {resendBusy ? 'Sending…' : 'Resend confirmation email'}
            </button>
            <button
              type="button"
              disabled={recheckBusy}
              onClick={() => void recheckSession()}
              className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/70 focus-visible:ring-offset-2 disabled:opacity-50"
            >
              {recheckBusy ? 'Checking…' : "I've confirmed — continue"}
            </button>
          </div>

          <p className="mt-4 text-xs text-zinc-400 sm:text-sm">
            Wrong inbox? Update your email in account settings, then resend.
          </p>
        </div>
      </div>
    </div>
  );
}
