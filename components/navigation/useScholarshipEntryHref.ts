'use client';

import { useSyncExternalStore } from 'react';

import { createClient } from '@/utils/supabase/client';
import { HOME_PRIMARY_CTA_GUEST_HREF } from '@/lib/nav/homePrimaryCta';
import { resolveScholarshipEntryDecisionClient } from '@/lib/nav/scholarshipEntryHrefClient';
import { localizedPilotHref, type LocalizedUiLocale } from '@/lib/i18n/localizedHref';

type ScholarshipEntryHrefState = {
  href: string;
  resolved: boolean;
};

type SharedAuthSnapshot = {
  isAuthenticated: boolean;
  resolved: boolean;
};

const SERVER_AUTH_SNAPSHOT: SharedAuthSnapshot = {
  isAuthenticated: false,
  resolved: false
};

let sharedAuthSnapshot = SERVER_AUTH_SNAPSHOT;
let sharedAuthStarted = false;
const sharedAuthListeners = new Set<() => void>();

function publishSharedAuthSnapshot(next: SharedAuthSnapshot): void {
  if (
    sharedAuthSnapshot.isAuthenticated === next.isAuthenticated &&
    sharedAuthSnapshot.resolved === next.resolved
  ) {
    return;
  }
  sharedAuthSnapshot = next;
  sharedAuthListeners.forEach((listener) => listener());
}

function startSharedAuthSession(): void {
  if (sharedAuthStarted) return;
  sharedAuthStarted = true;

  const supabase = createClient();
  supabase.auth.onAuthStateChange((_event, session) => {
    publishSharedAuthSnapshot({
      isAuthenticated: Boolean(session?.user),
      resolved: true
    });
  });

  void supabase.auth
    .getSession()
    .then(({ data: { session } }) => {
      publishSharedAuthSnapshot({
        isAuthenticated: Boolean(session?.user),
        resolved: true
      });
    })
    .catch(() => {
      publishSharedAuthSnapshot({
        isAuthenticated: false,
        resolved: true
      });
    });
}

function subscribeSharedAuth(listener: () => void): () => void {
  sharedAuthListeners.add(listener);
  startSharedAuthSession();
  return () => sharedAuthListeners.delete(listener);
}

function getSharedAuthSnapshot(): SharedAuthSnapshot {
  return sharedAuthSnapshot;
}

function getServerAuthSnapshot(): SharedAuthSnapshot {
  return SERVER_AUTH_SNAPSHOT;
}

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
  const auth = useSyncExternalStore(
    subscribeSharedAuth,
    getSharedAuthSnapshot,
    getServerAuthSnapshot
  );
  const decision = resolveScholarshipEntryDecisionClient(
    auth.isAuthenticated
  );

  return {
    href: auth.resolved
      ? scholarshipEntryHrefForLocale(locale, decision.href)
      : locale === 'en'
        ? HOME_PRIMARY_CTA_GUEST_HREF
        : `/${locale}/get-scholarships`,
    resolved: auth.resolved
  };
}
