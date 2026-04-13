'use client';

import { useEffect } from 'react';

const VISITOR_COOKIE = 'st_visitor_id';
const SESSION_KEY = 'st_first_touch_session';
const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 365; // 1 year

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

function scheduleIdle(cb: () => void) {
  if (typeof window === 'undefined') return;
  const ric = (
    window as unknown as {
      requestIdleCallback?: (fn: () => void, opts?: { timeout: number }) => number;
    }
  ).requestIdleCallback;
  if (typeof ric === 'function') {
    ric(cb, { timeout: 2500 });
    return;
  }
  window.setTimeout(cb, 1);
}

export default function AnalyticsTracker() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (sessionStorage.getItem(SESSION_KEY) === '1') return;
    } catch {
      // sessionStorage may be blocked
    }

    let visitorId = readCookie(VISITOR_COOKIE);
    if (!visitorId) {
      visitorId = randomUuidV4();
      writeVisitorCookie(visitorId);
    }

    scheduleIdle(() => {
      try {
        if (sessionStorage.getItem(SESSION_KEY) === '1') return;
      } catch {
        /* ignore */
      }

      const href = window.location.href || '';
      const referrer = document.referrer || '';
      const params = new URLSearchParams(window.location.search);
      const utm_source = params.get('utm_source') || '';
      const utm_medium = params.get('utm_medium') || '';
      const utm_campaign = params.get('utm_campaign') || '';

      const payload = {
        visitor_id: visitorId,
        landing_url: href.slice(0, 4000),
        referrer: referrer.slice(0, 4000),
        utm_source: utm_source.slice(0, 500),
        utm_medium: utm_medium.slice(0, 500),
        utm_campaign: utm_campaign.slice(0, 500)
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
    });
  }, []);

  return null;
}
