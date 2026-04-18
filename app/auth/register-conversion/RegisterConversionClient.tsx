'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { SiteBrandLoading } from '@/components/ui/SiteBrandLoading';
import { GOOGLE_ADS_SIGNUP_CONVERSION_SEND_TO } from '@/lib/analytics/googleAdsSignupConversion';
import { createClient } from '@/utils/supabase/client';

function safeInternalPath(next: string | null): string {
  if (!next) return '/';
  if (!next.startsWith('/') || next.startsWith('//')) return '/';
  if (next.includes('://')) return '/';
  return next;
}


const STORAGE_KEY_PREFIX = 'google_ads_signup_conversion_sent:';

export default function RegisterConversionClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showFallback, setShowFallback] = useState(true);

  const eligible = searchParams.get('eligible') === '1';
  const nextRaw = searchParams.get('next');
  const nextPath = useMemo(() => safeInternalPath(nextRaw), [nextRaw]);

  useEffect(() => {
    const go = (path: string) => {
      setShowFallback(false);
      router.replace(path);
    };

    if (!eligible) {
      go(nextPath);
      return;
    }

    void (async () => {
      const supabase = createClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user?.id) {
        go(nextPath);
        return;
      }

      const storageKey = `${STORAGE_KEY_PREFIX}${user.id}`;

      if (typeof window !== 'undefined' && localStorage.getItem(storageKey)) {
        go(nextPath);
        return;
      }

      try {
        if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
          window.gtag('event', 'conversion', {
            send_to: GOOGLE_ADS_SIGNUP_CONVERSION_SEND_TO
          });
        }

        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ event: 'signup_success' });

        try {
          localStorage.setItem(storageKey, '1');
        } catch {
          /* quota / private mode */
        }
      } catch {
        /* gtag / dataLayer errors should not block redirect */
      }

      go(nextPath);
    })();
  }, [eligible, nextPath, router]);

  if (!showFallback) return null;

  return <SiteBrandLoading className="min-h-[40vh]" />;
}
