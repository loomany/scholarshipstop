'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const AnalyticsTracker = dynamic(
  () => import('@/components/AnalyticsTracker'),
  { ssr: false }
);
const GptTrafficTracker = dynamic(
  () => import('@/components/analytics/GptTrafficTracker'),
  { ssr: false }
);
const HomeAiNavigatorWidget = dynamic(
  () => import('@/components/home/HomeAiNavigatorWidget'),
  { ssr: false }
);

/** Mount non-critical global clients after the first page load has settled. */
export default function DeferredGlobalRuntime({
  showAiNavigator
}: {
  showAiNavigator: boolean;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let idleId: number | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const reveal = () => setReady(true);
    const schedule = () => {
      if ('requestIdleCallback' in window) {
        idleId = window.requestIdleCallback(reveal, { timeout: 2_000 });
      } else {
        timeoutId = globalThis.setTimeout(reveal, 800);
      }
    };

    if (document.readyState === 'complete') {
      schedule();
    } else {
      window.addEventListener('load', schedule, { once: true });
    }

    return () => {
      window.removeEventListener('load', schedule);
      if (idleId !== undefined && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId !== undefined) globalThis.clearTimeout(timeoutId);
    };
  }, []);

  if (!ready) return null;

  return (
    <>
      {showAiNavigator ? <HomeAiNavigatorWidget /> : null}
      <GptTrafficTracker />
      <AnalyticsTracker />
    </>
  );
}
