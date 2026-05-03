'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

const STORAGE_KEY = 'gpt_tracked';

/** Ground truth lives on `window`; `useSearchParams` can lag on first hydration / in-app browsers. */
function utmSourceGptFromLocation(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const v = new URLSearchParams(window.location.search).get('utm_source');
    return v?.trim().toLowerCase() === 'gpt';
  } catch {
    return false;
  }
}

function isGptLikeReferrer(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const r = document.referrer.toLowerCase();
    return (
      r.includes('chatgpt.com') ||
      r.includes('chat.openai.com') ||
      r.includes('openai.com')
    );
  } catch {
    return false;
  }
}

/**
 * One notification per browser tab session when traffic looks like ChatGPT / GPT agent.
 * Sets sessionStorage before fetch to avoid duplicate sends (e.g. React Strict Mode double mount).
 */
export default function GptTrafficTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let already: string | null = null;
    try {
      already = sessionStorage.getItem(STORAGE_KEY);
    } catch {
      already = null;
    }
    if (already) return;

    const fromUtm = utmSourceGptFromLocation();
    const fromReferrer = isGptLikeReferrer();
    if (!fromUtm && !fromReferrer) return;

    try {
      sessionStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      /* private / blocked storage — still try one ping */
    }

    const path = (() => {
      try {
        const fromBar = window.location.pathname;
        if (fromBar && fromBar.length > 0) return fromBar;
      } catch {
        /* ignore */
      }
      return pathname && pathname.length > 0 ? pathname : '/';
    })();

    void fetch('/api/track-gpt-visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pathname: path }),
      keepalive: true
    }).catch(() => {});
  }, [pathname]);

  return null;
}
