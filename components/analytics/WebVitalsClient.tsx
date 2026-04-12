'use client';

import { useReportWebVitals } from 'next/web-vitals';

/**
 * Sends Core Web Vitals to `dataLayer` when GTM is present (optional),
 * and logs in development for local checks (hub / category / detail).
 */
export default function WebVitalsClient() {
  useReportWebVitals((metric) => {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console -- intentional dev field metrics
      console.debug('[web-vitals]', metric.name, metric.value, metric.rating);
    }
    if (process.env.NEXT_PUBLIC_WEB_VITALS_GTM !== '1') return;
    if (typeof window === 'undefined') return;
    const dl = (
      window as unknown as { dataLayer?: Record<string, unknown>[] }
    ).dataLayer;
    if (!dl) return;
    dl.push({
      event: 'web_vitals',
      web_vitals_metric: metric.name,
      web_vitals_value:
        metric.name === 'CLS' ? metric.value : Math.round(metric.value),
      web_vitals_rating: metric.rating,
      web_vitals_id: metric.id,
      web_vitals_navigation_type: metric.navigationType
    });
  });

  return null;
}
