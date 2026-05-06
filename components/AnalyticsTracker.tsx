'use client';

import { useSearchParams, usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef } from 'react';

const VISITOR_COOKIE = 'st_visitor_id';
const SESSION_KEY = 'st_first_touch_session';
const ATTRIBUTION_UTM_SOURCE_KEY = 'st_attribution_utm_source';
const ATTRIBUTION_UTM_MEDIUM_KEY = 'st_attribution_utm_medium';
const ATTRIBUTION_UTM_CAMPAIGN_KEY = 'st_attribution_utm_campaign';
const ATTRIBUTION_UTM_CONTENT_KEY = 'st_attribution_utm_content';
const ATTRIBUTION_UTM_TERM_KEY = 'st_attribution_utm_term';
const ATTRIBUTION_COUNTRY_TARGET_KEY = 'st_attribution_country_target';
const FIRST_LANDING_HREF_KEY = 'st_attribution_first_landing_href';
const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 365; // 1 year
/** Wait for SPA navigations to settle so Landing + persisted UTM match the final page. */
const FIRST_TOUCH_DEBOUNCE_MS = 320;
const VISITOR_PING_INTERVAL_MS = 50_000;
const ATTR_MAX_LEN = 500;
const HREF_MAX_LEN = 4000;
type VisitorPingSource = 'navigation' | 'heartbeat' | 'visibility' | 'leave';

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

function readPersistedAttribution(key: string): string {
  try {
    return (sessionStorage.getItem(key) || '').trim();
  } catch {
    return '';
  }
}

/** Persist only non-empty URL params — never clear stored values with empties. */
function persistAttributionParamFromUrl(storageKey: string, urlValue: string | null) {
  const v = (urlValue || '').trim().slice(0, ATTR_MAX_LEN);
  if (!v) return;
  try {
    sessionStorage.setItem(storageKey, v);
  } catch {
    /* sessionStorage may be blocked */
  }
}

/** First full href for this tab — set once (first page load in session). */
function ensureFirstLandingHrefRecorded() {
  try {
    if (sessionStorage.getItem(FIRST_LANDING_HREF_KEY)) return;
    const href = (typeof window !== 'undefined' ? window.location.href : '').slice(0, HREF_MAX_LEN);
    if (href) sessionStorage.setItem(FIRST_LANDING_HREF_KEY, href);
  } catch {
    /* ignore */
  }
}

function readFirstLandingHref(): string {
  return readPersistedAttribution(FIRST_LANDING_HREF_KEY).slice(0, HREF_MAX_LEN);
}

/**
 * Prefer current URL param; otherwise last non-empty value from sessionStorage.
 */
function mergeAttributionParam(params: URLSearchParams, queryKey: string, storageKey: string): string {
  const fromUrl = (params.get(queryKey) || '').trim().slice(0, ATTR_MAX_LEN);
  if (fromUrl) return fromUrl;
  return readPersistedAttribution(storageKey).slice(0, ATTR_MAX_LEN);
}

function persistAllAttributionParamsFromSearchParams(searchParams: {
  get: (key: string) => string | null;
}) {
  persistAttributionParamFromUrl(ATTRIBUTION_UTM_SOURCE_KEY, searchParams.get('utm_source'));
  persistAttributionParamFromUrl(ATTRIBUTION_UTM_MEDIUM_KEY, searchParams.get('utm_medium'));
  persistAttributionParamFromUrl(ATTRIBUTION_UTM_CAMPAIGN_KEY, searchParams.get('utm_campaign'));
  persistAttributionParamFromUrl(ATTRIBUTION_UTM_CONTENT_KEY, searchParams.get('utm_content'));
  persistAttributionParamFromUrl(ATTRIBUTION_UTM_TERM_KEY, searchParams.get('utm_term'));
  persistAttributionParamFromUrl(
    ATTRIBUTION_COUNTRY_TARGET_KEY,
    searchParams.get('country_target')
  );
}

function buildAttributionFieldsFromWindow(): {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
  utm_term: string;
  country_target: string;
} {
  const params = new URLSearchParams(
    typeof window !== 'undefined' ? window.location.search : ''
  );
  return {
    utm_source: mergeAttributionParam(params, 'utm_source', ATTRIBUTION_UTM_SOURCE_KEY),
    utm_medium: mergeAttributionParam(params, 'utm_medium', ATTRIBUTION_UTM_MEDIUM_KEY),
    utm_campaign: mergeAttributionParam(params, 'utm_campaign', ATTRIBUTION_UTM_CAMPAIGN_KEY),
    utm_content: mergeAttributionParam(params, 'utm_content', ATTRIBUTION_UTM_CONTENT_KEY),
    utm_term: mergeAttributionParam(params, 'utm_term', ATTRIBUTION_UTM_TERM_KEY),
    country_target: mergeAttributionParam(params, 'country_target', ATTRIBUTION_COUNTRY_TARGET_KEY)
  };
}

function isFirstTouchDone(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * First-touch + UTM attribution (sessionStorage «первое касание»):
 * - Non-empty URL params are saved per tab; empty params do not overwrite stored values.
 * - Reads merge: current URL → sessionStorage → empty.
 * - `st_attribution_first_landing_href` is set once (first URL in this tab).
 * - First-touch POST uses first landing href when present so UTMs on the initial URL stay tied to the visit.
 * - After first-touch succeeds, `visitor-ping` keeps `last_seen_at` + page trail for admin card.
 */
export default function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingRef = useRef<(kind: 'view' | 'leave', source?: VisitorPingSource) => void>(() => {});

  const sendVisitorPing = useCallback(
    async (kind: 'view' | 'leave', source: VisitorPingSource = 'navigation') => {
      if (typeof window === 'undefined') return;
      if (!isFirstTouchDone() && kind === 'view') return;

      const visitorId = readCookie(VISITOR_COOKIE);
      if (!visitorId) return;

      const href = (window.location.href || '').slice(0, HREF_MAX_LEN);
      const attr = buildAttributionFieldsFromWindow();
      const referrer = (document.referrer || '').slice(0, 4000);
      const user_agent =
        typeof navigator !== 'undefined' && navigator.userAgent
          ? navigator.userAgent.slice(0, 800)
          : '';

      const event_source: VisitorPingSource = kind === 'leave' ? 'leave' : source;
      const payload = {
        visitor_id: visitorId,
        landing_url: href,
        full_url: href,
        referrer,
        utm_source: attr.utm_source,
        utm_medium: attr.utm_medium,
        utm_campaign: attr.utm_campaign,
        utm_content: attr.utm_content,
        user_agent,
        event_source,
        ...(kind === 'leave' ? { kind: 'leave' as const } : {})
      };

      try {
        if (kind === 'leave' && typeof navigator.sendBeacon === 'function') {
          const ok = navigator.sendBeacon(
            '/api/analytics/visitor-ping',
            new Blob([JSON.stringify(payload)], { type: 'application/json' })
          );
          if (ok) return;
        }
      } catch {
        /* ignore */
      }

      void fetch('/api/analytics/visitor-ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: kind === 'leave'
      }).catch(() => {
        /* non-fatal */
      });
    },
    []
  );

  pingRef.current = sendVisitorPing;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    ensureFirstLandingHrefRecorded();
    persistAllAttributionParamsFromSearchParams(searchParams);

    if (!isFirstTouchDone()) {
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

        const href = (window.location.href || '').slice(0, HREF_MAX_LEN);
        const attr = buildAttributionFieldsFromWindow();
        const firstLanding = readFirstLandingHref();
        const referrer = (document.referrer || '').slice(0, 4000);
        const user_agent =
          typeof navigator !== 'undefined' && navigator.userAgent
            ? navigator.userAgent.slice(0, 800)
            : '';

        const payload = {
          visitor_id: visitorId,
          landing_url: href,
          ...(firstLanding ? { first_landing_url: firstLanding } : {}),
          referrer,
          utm_source: attr.utm_source,
          utm_medium: attr.utm_medium,
          utm_campaign: attr.utm_campaign,
          utm_content: attr.utm_content,
          utm_term: attr.utm_term,
          country_target: attr.country_target,
          user_agent
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
              void pingRef.current('view', 'navigation');
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
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      void sendVisitorPing('view', 'navigation');
    }, FIRST_TOUCH_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [pathname, searchParams.toString(), sendVisitorPing]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const id = window.setInterval(() => {
      void sendVisitorPing('view', 'heartbeat');
    }, VISITOR_PING_INTERVAL_MS);
    return () => clearInterval(id);
  }, [sendVisitorPing]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        void sendVisitorPing('view', 'visibility');
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [sendVisitorPing]);

  useEffect(() => {
    const onLeave = () => {
      void sendVisitorPing('leave', 'leave');
    };
    window.addEventListener('pagehide', onLeave);
    return () => window.removeEventListener('pagehide', onLeave);
  }, [sendVisitorPing]);

  return null;
}
