'use client';

import { useEffect } from 'react';
import type { Stage2PilotLocale } from '@/lib/i18n/pilotRoutes';

const STORAGE_KEY = 'scholarshiptop_ui_locale';

/** Persists pilot UI locale for auth deep-links (reset password) without changing auth logic. */
export function LocaleUiPreference({ locale }: { locale: Stage2PilotLocale }) {
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, locale);
    } catch {
      /* ignore */
    }
  }, [locale]);
  return null;
}

export function readStoredUiLocale(): 'en' | Stage2PilotLocale {
  if (typeof window === 'undefined') return 'en';
  try {
    const v = sessionStorage.getItem(STORAGE_KEY);
    if (v === 'es' || v === 'fr') return v;
  } catch {
    /* ignore */
  }
  return 'en';
}

export function localizedSigninPath(
  locale: 'en' | Stage2PilotLocale,
  signinSubpath: string
): string {
  const path = signinSubpath.startsWith('/signin')
    ? signinSubpath
    : `/signin${signinSubpath.startsWith('/') ? signinSubpath : `/${signinSubpath}`}`;
  if (locale === 'en') return path;
  return `/${locale}${path}`;
}
