'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { getErrorRedirect, getStatusRedirect } from '@/utils/helpers';

function ResetPasswordExchange() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [label, setLabel] = useState('Signing you in…');

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const supabase = createClient();

      const qpError = searchParams.get('error');
      if (qpError) {
        if (!cancelled) {
          router.replace(
            getErrorRedirect(
              '/signin/forgot_password',
              qpError,
              searchParams.get('error_description') ??
                'Link may be expired. Request a new reset email.'
            )
          );
        }
        return;
      }

      const code = searchParams.get('code');
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          if (!cancelled) {
            router.replace(
              getErrorRedirect(
                '/signin/forgot_password',
                error.name,
                "Sorry, we weren't able to log you in. Please try again."
              )
            );
          }
          return;
        }
      } else {
        setLabel('Completing sign-in…');
        let session = (await supabase.auth.getSession()).data.session;
        if (!session) {
          session = await new Promise((resolve) => {
            let settled = false;
            let fallbackTimer: ReturnType<typeof setTimeout>;
            const { data: authListener } = supabase.auth.onAuthStateChange(
              (event, sess) => {
                if (
                  sess &&
                  (event === 'INITIAL_SESSION' || event === 'SIGNED_IN')
                ) {
                  if (!settled) {
                    settled = true;
                    authListener.subscription.unsubscribe();
                    clearTimeout(fallbackTimer);
                    resolve(sess);
                  }
                }
              }
            );
            fallbackTimer = setTimeout(async () => {
              if (!settled) {
                settled = true;
                authListener.subscription.unsubscribe();
                resolve((await supabase.auth.getSession()).data.session);
              }
            }, 4000);
          });
        }
        if (!session) {
          if (!cancelled) {
            router.replace('/signin');
          }
          return;
        }
      }

      if (!cancelled) {
        router.replace(
          getStatusRedirect(
            '/signin/update_password',
            'You are now signed in.',
            'Please enter a new password for your account.'
          )
        );
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return (
    <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center bg-zinc-50 px-4">
      <p className="text-sm text-zinc-600">{label}</p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center bg-zinc-50 px-4">
          <p className="text-sm text-zinc-600">Loading…</p>
        </div>
      }
    >
      <ResetPasswordExchange />
    </Suspense>
  );
}
