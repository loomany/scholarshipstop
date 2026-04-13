'use client';

import { useSearchParams, usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

const VISITOR_COOKIE = 'st_visitor_id';
const SESSION_KEY = 'st_first_touch_session';
const ATTRIBUTION_UTM_KEY = 'st_attribution_utm_source';
const ATTRIBUTION_UTM_CONTENT_KEY = 'st_attribution_utm_content';
const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 365; // 1 year
/** Wait for SPA navigations to settle so Landing + persisted UTM match the final page. */
const FIRST_TOUCH_DEBOUNCE_MS = 320;

function readCookie(name: string): string {
  if (typeof document === 'undefined') return '';
  const escaped = name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1');
  const m = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : '';
}

function writeVisitorCookie(value: string) {
  const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? ';Secure' : '';
  document.cookie = `${VISITOR_COOKIE}=${encodeURIComponent(value)};path=/;max-age=${COOKIE_MAX_AGE_SEC};SameSite=Lax${secure}`;
}

function randomUuidV4(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function readPersistedUtm(): string {
  try {
    return (sessionStorage.getItem(ATTRIBUTION_UTM_KEY) || '').trim();
  } catch {
    return '';
  }
}

function readPersistedUtmContent(): string {
  try {
    return (sessionStorage.getItem(ATTRIBUTION_UTM_CONTENT_KEY) || '').trim();
  } catch {
    return '';
  }
}

/**
 * First-touch + UTM attribution (sessionStorage «первое касание»):
 * - On each navigation, if `utm_source` is in the URL → save under `st_attribution_utm_source` for this tab.
 * - If the URL has no `utm_source` → use the value from sessionStorage (survives client-side route changes).
 * - `utm_content` is stored the same way under `st_attribution_utm_content` for Meta creatives.
 * - First-touch POST uses priority: current URL → sessionStorage → empty (server shows Organic/Direct).
 * - Debounce ~320ms so Landing URL reflects the page after SPA navigation stabilizes.
 */
export default function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const utmFromUrl = (searchParams.get('utm_source') || '').trim().slice(0, 500);
    const utmContentFromUrl = (searchParams.get('utm_content') || '').trim().slice(0, 500);
    try {
      if (utmFromUrl) {
        sessionStorage.setItem(ATTRIBUTION_UTM_KEY, utmFromUrl);
      }
      if (utmContentFromUrl) {
        sessionStorage.setItem(ATTRIBUTION_UTM_CONTENT_KEY, utmContentFromUrl);
      }
    } catch {
      /* sessionStorage may be blocked */
    }

    try {
      if (sessionStorage.getItem(SESSION_KEY) === '1') return;
    } catch {
      /* ignore */
    }

    let visitorId = readCookie(VISITOR_COOKIE);
    if (!visitorId) {
      visitorId = randomUuidV4();
      writeVisitorCookie(visitorId);
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      try {
        if (sessionStorage.getItem(SESSION_KEY) === '1') return;
      } catch {
        /* ignore */
      }

      const href = (window.location.href || '').slice(0, 4000);
      const params = new URLSearchParams(window.location.search);
      const utmFromCurrent = (params.get('utm_source') || '').trim().slice(0, 500);
      const utm_source = utmFromCurrent || readPersistedUtm();
      const utmFromCurrentContent = (params.get('utm_content') || '').trim().slice(0, 500);
      const utm_content = utmFromCurrentContent || readPersistedUtmContent();
      const utm_medium = (params.get('utm_medium') || '').trim().slice(0, 500);
      const utm_campaign = (params.get('utm_campaign') || '').trim().slice(0, 500);
      const referrer = (document.referrer || '').slice(0, 4000);

      const payload = {
        visitor_id: visitorId,
        landing_url: href,
        referrer,
        utm_source,
        utm_medium,
        utm_campaign,
        utm_content
      };

      void fetch('/api/analytics/first-touch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true
      })
        .then((res) => {
          if (res.ok) {
            try {
              sessionStorage.setItem(SESSION_KEY, '1');
            } catch {
              /* ignore */
            }
          }
        })
        .catch(() => {
          /* non-fatal */
        });
    }, FIRST_TOUCH_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [pathname, searchParams.toString()]);

  return null;
}
