'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

const STORAGE_KEY = 'gpt_tracked';

function isUtmGpt(utmSource: string | null): boolean {
  return utmSource?.trim().toLowerCase() === 'gpt';
}

function isChatGptReferrer(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    return document.referrer.toLowerCase().includes('chatgpt.com');
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
  const searchParams = useSearchParams();
  const utmSource = searchParams.get('utm_source');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let already: string | null = null;
    try {
      already = sessionStorage.getItem(STORAGE_KEY);
    } catch {
      return;
    }
    if (already) return;

    const fromUtm = isUtmGpt(utmSource);
    const fromReferrer = isChatGptReferrer();
    if (!fromUtm && !fromReferrer) return;

    try {
      sessionStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      /* private / blocked storage — still try one ping */
    }

    const path = pathname && pathname.length > 0 ? pathname : '/';

    void fetch('/api/track-gpt-visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pathname: path }),
      keepalive: true
    }).catch(() => {});
  }, [pathname, utmSource]);

  return null;
}
