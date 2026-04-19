'use client';

import { SCHOLARSHIPS_HUB_BEST_RECOMMENDATION_HREF } from '@/app/scholarships/scholarshipListUrl';
import {
  getImplicitGrantTokensFromHash,
  hasOAuthStyleHashError,
  parseOAuthStyleHash
} from '@/lib/auth/recoveryUrlErrors';
import { createClient } from '@/utils/supabase/client';
import { getErrorRedirect, getStatusRedirect } from '@/utils/helpers';
import { useRouter } from 'next/navigation';
import { useLayoutEffect, useState } from 'react';

function safeDecodeParam(s: string | undefined): string {
  if (!s) return '';
  try {
    return decodeURIComponent(s.replace(/\+/g, ' '));
  } catch {
    return s;
  }
}

/**
 * Supabase sometimes completes magic links with an implicit fragment (`#access_token=…`)
 * instead of PKCE `?code=` or `token_hash`. The server never sees the hash, so `/auth/callback`
 * cannot run — users land on sign-in with tokens in the URL. This client bridge calls
 * `setSession` and sends them to the grants hub.
 */
export function MagicLinkImplicitSession() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;

    const hashParams = parseOAuthStyleHash(window.location.hash);
    if (hasOAuthStyleHashError(hashParams)) {
      const rawDesc =
        safeDecodeParam(hashParams.error_description) ||
        'This link may have expired. Request a new confirmation email.';
      /** Supabase → Google token exchange failed (wrong Client Secret or redirect URI in Google Cloud). */
      const isGoogleOAuthExchangeFailure =
        /unable to exchange external code/i.test(rawDesc);
      const title = isGoogleOAuthExchangeFailure
        ? 'Google sign-in could not finish'
        : 'Link could not be used';
      const desc = isGoogleOAuthExchangeFailure
        ? 'Check Google Cloud: Authorized redirect URIs must include the exact Supabase callback URL from Dashboard → Authentication → Providers → Google. The Client ID and Client Secret in Supabase must be from that same Web OAuth client.'
        : rawDesc;
      router.replace(getErrorRedirect('/signin/password_signin', title, desc));
      return;
    }

    const implicit = getImplicitGrantTokensFromHash(window.location.hash);
    if (!implicit.access_token) {
      return;
    }

    if (!implicit.refresh_token) {
      router.replace(
        getErrorRedirect(
          '/signin/password_signin',
          'Sign-in link issue',
          'This confirmation link is incomplete. Request a new email from your account settings.'
        )
      );
      return;
    }

    setBusy(true);

    let cancelled = false;

    async function run() {
      const supabase = createClient();
      const { error } = await supabase.auth.setSession({
        access_token: implicit.access_token!,
        refresh_token: implicit.refresh_token!
      });
      if (cancelled) return;
      if (error) {
        router.replace(
          getErrorRedirect(
            '/signin/password_signin',
            'Could not sign you in',
            error.message || 'Try opening the link from your email again.'
          )
        );
        setBusy(false);
        return;
      }

      const pathOnly = window.location.pathname + (window.location.search || '');
      window.history.replaceState(null, '', pathOnly);

      const sp = new URLSearchParams(window.location.search);
      const nextRaw = sp.get('next');
      let dest = SCHOLARSHIPS_HUB_BEST_RECOMMENDATION_HREF;
      if (nextRaw) {
        try {
          const decoded = decodeURIComponent(nextRaw);
          if (decoded.startsWith('/') && !decoded.startsWith('//') && !decoded.includes('://')) {
            dest = decoded;
          }
        } catch {
          /* keep default */
        }
      }

      router.replace(
        getStatusRedirect(dest, 'Signed in', 'Welcome to ScholarshipTop.')
      );
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!busy) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/85 text-sm text-zinc-600 backdrop-blur-[1px]">
      Signing you in…
    </div>
  );
}
