'use client';

import { useEffect, useState } from 'react';

import { createClient } from '@/utils/supabase/client';
import { HOME_PRIMARY_CTA_GUEST_HREF } from '@/lib/nav/homePrimaryCta';
import { resolveScholarshipEntryDecisionClient } from '@/lib/nav/scholarshipEntryHrefClient';

type ScholarshipEntryHrefState = {
  href: string;
  resolved: boolean;
};

export function useScholarshipEntryHref(): ScholarshipEntryHrefState {
  const [state, setState] = useState<ScholarshipEntryHrefState>({
    href: HOME_PRIMARY_CTA_GUEST_HREF,
    resolved: false
  });

  useEffect(() => {
    const supabase = createClient();

    const resolveForSession = (isAuthenticated: boolean) => {
      const decision = resolveScholarshipEntryDecisionClient(isAuthenticated);
      setState({ href: decision.href, resolved: true });
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
  }, []);

  return state;
}
