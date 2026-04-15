'use client';

import NextTopLoader from 'nextjs-toploader';

/** Brand orange — matches focus rings / CTAs (`ring-orange-500`). */
const ACCENT = '#f97316';

/**
 * Thin top progress bar on client navigations (App Router).
 * Mount once in root layout; listens to `usePathname` / `useSearchParams` internally.
 */
export function NavigationProgress() {
  return (
    <NextTopLoader
      color={ACCENT}
      height={3}
      showSpinner={false}
      crawl
      crawlSpeed={220}
      initialPosition={0.08}
      easing="ease"
      speed={280}
      shadow="0 0 12px rgba(249, 115, 22, 0.4)"
      zIndex={99999}
    />
  );
}
