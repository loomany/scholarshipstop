'use client';

import { useEffect, useState } from 'react';

import { createClient } from '@/utils/supabase/client';
import { HOME_PRIMARY_CTA_GUEST_HREF } from '@/lib/nav/homePrimaryCta';
import { resolveScholarshipEntryDecisionClient } from '@/lib/nav/scholarshipEntryHrefClient';
import { localizedPilotHref, type LocalizedUiLocale } from '@/lib/i18n/localizedHref';

type ScholarshipEntryHrefState = {
  href: string;
  resolved: boolean;
};

function scholarshipEntryHrefForLocale(
  locale: LocalizedUiLocale,
  decisionHref: string
): string {
  if (locale === 'en') return decisionHref;
  // Guests on ES/FR start with the localized quiz; authenticated users have already
  // resolved to a hub href via `resolveScholarshipEntryDecisionClient` (we then
  // localize the hub root).
  if (decisionHref === '/get-scholarships') {
    return `/${locale}/get-scholarships`;
  }
  return localizedPilotHref(locale, '/scholarships') ?? decisionHref;
}

export function useScholarshipEntryHref(
  locale: LocalizedUiLocale = 'en'
): ScholarshipEntryHrefState {
  const [state, setState] = useState<ScholarshipEntryHrefState>({
    href:
      locale === 'en'
        ? HOME_PRIMARY_CTA_GUEST_HREF
        : `/${locale}/get-scholarships`,
    resolved: false
  });

  useEffect(() => {
    const supabase = createClient();

    const resolveForSession = (isAuthenticated: boolean) => {
      const decision = resolveScholarshipEntryDecisionClient(isAuthenticated);
      setState({
        href: scholarshipEntryHrefForLocale(locale, decision.href),
        resolved: true
      });
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      resolveForSession(Boolean(session?.user));
    });

    void supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        resolveForSession(Boolean(session?.user));
      })
      .catch(() => {
        setState((prev) => ({ ...prev, resolved: true }));
      });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, [locale]);

  return state;
}
