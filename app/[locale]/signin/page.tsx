'use client';

import { useParams, useRouter } from 'next/navigation';
import { useLayoutEffect } from 'react';

import { SiteBrandLoading } from '@/components/ui/SiteBrandLoading';
import { getDefaultSignInView } from '@/utils/auth-helpers/settings';

function readPreferredSignInViewCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(/(?:^|;\s*)preferredSignInView=([^;]*)/);
  if (!m?.[1]) return null;
  try {
    return decodeURIComponent(m[1].trim());
  } catch {
    return m[1].trim();
  }
}

/** Localized `/[locale]/signin` mirror of `/signin` — preserves `#access_token=…` hash. */
export default function LocalizedSignInIndex() {
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? 'en';

  useLayoutEffect(() => {
    const preferred = readPreferredSignInViewCookie();
    const defaultView = getDefaultSignInView(preferred);
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    router.replace(`/${locale}/signin/${defaultView}${hash}`);
  }, [router, locale]);

  return (
    <SiteBrandLoading className="min-h-[calc(100vh-5rem)] px-4 py-10" />
  );
}
