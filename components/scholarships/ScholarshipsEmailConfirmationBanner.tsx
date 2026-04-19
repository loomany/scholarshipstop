'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { resendRegistrationVerificationEmail } from '@/app/actions/registrationVerification';
import type { Database } from '@/types_db';
import {
  SCHOLARSHIP_ACTION_FILL,
  SCHOLARSHIP_ACTION_FOCUS_VISIBLE
} from '@/lib/constants/scholarshipActionUi';
import { ToastAction } from '@/components/ui/Toasts/toast';
import { toast } from '@/components/ui/Toasts/use-toast';
import { createClient } from '@/utils/supabase/client';
import { cn } from '@/utils/cn';
import { getURL } from '@/utils/helpers';
import { SCHOLARSHIPS_HUB_BEST_RECOMMENDATION_HREF } from '@/app/scholarships/scholarshipListUrl';

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

/**
 * No inline banner — reminds unverified users via the global bottom toast (same UX as other app toasts).
 */
export function ScholarshipsEmailConfirmationBanner() {
  const [email, setEmail] = useState<string | null>(null);
  const [resendMode, setResendMode] = useState<ResendMode | null>(null);
  const [needsReminder, setNeedsReminder] = useState(false);
  const reminderToastScheduledRef = useRef(false);
  const resendInFlightRef = useRef(false);

  const resend = useCallback(async () => {
    if (!email || resendInFlightRef.current) return;
    resendInFlightRef.current = true;
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
            title: 'Check your inbox for the link.',
            description: 'We sent a confirmation message to your email.',
            duration: 6000
          });
        }
      } else if (resendMode === 'supabase') {
        const supabase = createClient();
        const emailRedirectTo = getURL(
          `auth/callback?next=${encodeURIComponent(SCHOLARSHIPS_HUB_BEST_RECOMMENDATION_HREF)}`
        );
        const { error } = await supabase.auth.resend({
          type: 'signup',
          email,
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
            title: 'Check your inbox for the link.',
            description: 'We sent a confirmation message to your email.',
            duration: 6000
          });
        }
      }
    } finally {
      resendInFlightRef.current = false;
    }
  }, [email, resendMode]);

  useEffect(() => {
    const supabase = createClient();

    const apply = async (user: User | null) => {
      if (!user?.email) {
        setNeedsReminder(false);
        setEmail(null);
        setResendMode(null);
        reminderToastScheduledRef.current = false;
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
      setNeedsReminder(show);
      setResendMode(mode);
      if (!show) {
        reminderToastScheduledRef.current = false;
      }
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

  useEffect(() => {
    if (!needsReminder || !resendMode || !email || reminderToastScheduledRef.current) {
      return;
    }
    reminderToastScheduledRef.current = true;

    toast({
      title: 'Confirm your email to unlock full access.',
      description:
        "You can keep browsing; we'll finish verifying your account in the background.",
      variant: 'warning',
      duration: 12_000,
      action: (
        <ToastAction
          altText="Resend confirmation"
          className={cn(
            'border-0 font-semibold text-white',
            SCHOLARSHIP_ACTION_FILL,
            SCHOLARSHIP_ACTION_FOCUS_VISIBLE
          )}
          onClick={(e) => {
            e.preventDefault();
            void resend();
          }}
        >
          Resend confirmation
        </ToastAction>
      )
    });
  }, [needsReminder, resendMode, email, resend]);

  return null;
}
