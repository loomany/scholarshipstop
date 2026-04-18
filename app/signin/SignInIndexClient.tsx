'use client';

import { SiteBrandLoading } from '@/components/ui/SiteBrandLoading';
import { getDefaultSignInView } from '@/utils/auth-helpers/settings';
import { useRouter } from 'next/navigation';
import { useLayoutEffect } from 'react';

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

/**
 * Preserves `#access_token=…` when forwarding `/signin` → `/signin/{view}` (server redirect drops the hash).
 */
export default function SignInIndexClient() {
  const router = useRouter();

  useLayoutEffect(() => {
    const preferred = readPreferredSignInViewCookie();
    const defaultView = getDefaultSignInView(preferred);
    const hash = window.location.hash;
    router.replace(`/signin/${defaultView}${hash}`);
  }, [router]);

  return (
    <SiteBrandLoading className="min-h-[calc(100vh-5rem)] px-4 py-10" />
  );
}
