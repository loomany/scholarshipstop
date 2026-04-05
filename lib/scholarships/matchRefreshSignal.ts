export function triggerScholarshipMatchRefreshSignal(): void {
  if (typeof window === 'undefined') return;
  const run = () => {
    void fetch('/api/scholarships/match/invalidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      cache: 'no-store'
    }).catch(() => undefined);
  };

  if ('requestIdleCallback' in window) {
    (window as Window & { requestIdleCallback: (cb: () => void) => number }).requestIdleCallback(run);
    return;
  }
  setTimeout(run, 0);
}
