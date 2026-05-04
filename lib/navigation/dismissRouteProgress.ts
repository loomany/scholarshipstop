import NProgress from 'nprogress';

/**
 * Finishes the global top bar (`nextjs-toploader` / nprogress) when a client `<Link>`
 * click was cancelled (e.g. modal blocks navigation) — the loader listens on `document`
 * and may still call `start()` after React `preventDefault`.
 */
export function dismissRouteProgress(): void {
  if (typeof window === 'undefined') return;
  try {
    NProgress.done(true);
  } catch {
    /* ignore — e.g. tests without nprogress */
  }
}
