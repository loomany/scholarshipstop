'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import {
  getImplicitGrantTokensFromHash,
  hasOAuthStyleHashError,
  parseOAuthStyleHash,
  userFacingRecoveryHashError
} from '@/lib/auth/recoveryUrlErrors';
import { SiteBrandLoading } from '@/components/ui/SiteBrandLoading';
import {
  localizedSigninPath,
  readStoredUiLocale
} from '@/components/i18n/LocaleUiPreference';
import { getAuthUiCopy } from '@/lib/i18n/authUiCopy';
import {
  getErrorRedirect,
  getStatusRedirect,
  TOAST_VARIANT_WARNING_PARAM
} from '@/utils/helpers';

function ResetPasswordExchange() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const storedLocale = useMemo(() => readStoredUiLocale(), []);
  const authUi = useMemo(() => getAuthUiCopy(storedLocale), [storedLocale]);
  const [label, setLabel] = useState(authUi.resetPasswordSigningIn);

  useEffect(() => {
    setLabel(authUi.resetPasswordSigningIn);
  }, [authUi.resetPasswordSigningIn]);

  useEffect(() => {
    let cancelled = false;
    const locale = readStoredUiLocale();
    const ui = getAuthUiCopy(locale);
    const forgotPath = localizedSigninPath(locale, '/signin/forgot_password');
    const updatePasswordPath = localizedSigninPath(locale, '/signin/update_password');

    async function run() {
      const supabase = createClient();

      /** Hash (#error=…) is client-only; searchParams never includes it. */
      const hashParams =
        typeof window !== 'undefined'
          ? parseOAuthStyleHash(window.location.hash)
          : {};
      if (hasOAuthStyleHashError(hashParams)) {
        const u = userFacingRecoveryHashError(hashParams);
        if (!cancelled) {
          router.replace(
            getErrorRedirect(
              forgotPath,
              u.title,
              u.description,
              false,
              TOAST_VARIANT_WARNING_PARAM
            )
          );
        }
        return;
      }

      const qpError = searchParams.get('error');
      if (qpError) {
        if (!cancelled) {
          router.replace(
            getErrorRedirect(
              forgotPath,
              qpError,
              searchParams.get('error_description') ?? ui.resetLinkExpiredDescription
            )
          );
        }
        return;
      }

      const code = searchParams.get('code');
      const hashStr =
        typeof window !== 'undefined' ? window.location.hash : '';
      const implicit = getImplicitGrantTokensFromHash(hashStr);

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          if (!cancelled) {
            router.replace(
              getErrorRedirect(
                forgotPath,
                error.name,
                ui.resetLoginFailedDescription
              )
            );
          }
          return;
        }
      } else if (implicit.access_token && implicit.refresh_token) {
        /** PKCE client does not auto-apply implicit `#access_token` fragments — set explicitly. */
        setLabel(ui.resetPasswordCompleting);
        const { error } = await supabase.auth.setSession({
          access_token: implicit.access_token,
          refresh_token: implicit.refresh_token
        });
        if (error) {
          if (!cancelled) {
            router.replace(
              getErrorRedirect(
                forgotPath,
                ui.resetCouldNotUseLink,
                error.message || ui.resetRequestNewEmail
              )
            );
          }
          return;
        }
        try {
          window.history.replaceState(
            null,
            '',
            `${window.location.pathname}${window.location.search}`
          );
        } catch {
          /* ignore */
        }
      } else {
        setLabel(ui.resetPasswordCompleting);
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
            router.replace(
              getErrorRedirect(
                forgotPath,
                ui.resetLinkIncomplete,
                ui.resetOpenLatestEmail,
                false,
                TOAST_VARIANT_WARNING_PARAM
              )
            );
          }
          return;
        }
      }

      if (!cancelled) {
        const nextPath = getStatusRedirect(
          updatePasswordPath,
          ui.resetNowSignedIn,
          ui.resetEnterNewPassword
        );
        /** Full navigation so SSR receives session cookies (soft `router` nav can skip them). */
        window.location.assign(new URL(nextPath, window.location.origin).href);
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
        <SiteBrandLoading className="min-h-[calc(100vh-5rem)] px-4" />
      }
    >
      <ResetPasswordExchange />
    </Suspense>
  );
}
