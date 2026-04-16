'use client';

import NextTopLoader from 'nextjs-toploader';

import {
  NAVIGATION_PROGRESS_COLOR,
  NAVIGATION_PROGRESS_SHADOW
} from '@/lib/constants/navigationProgress';

/**
 * Thin top progress bar on client navigations (App Router).
 * Mount once in root layout; listens to `usePathname` / `useSearchParams` internally.
 * Global `#nprogress` rules in `styles/main.css` enforce the same orange if the
 * library falls back to its default cyan (`#29d`) on some navigations.
 */
export function NavigationProgress() {
  return (
    <NextTopLoader
      color={NAVIGATION_PROGRESS_COLOR}
      height={3}
      showSpinner={false}
      crawl
      crawlSpeed={220}
      initialPosition={0.08}
      easing="ease"
      speed={280}
      shadow={NAVIGATION_PROGRESS_SHADOW}
      zIndex={99999}
    />
  );
}
