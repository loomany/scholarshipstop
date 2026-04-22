'use client';

import { useEffect, useRef } from 'react';

type Props = { page: number };

/**
 * After pagination navigation, scroll the scholarships block into view.
 * On first paint: only auto-scroll when landing on page &gt; 1 (deep link).
 */
export function ProviderProfileScholarshipsScroll({ page }: Props) {
  const isFirstMount = useRef(true);

  useEffect(() => {
    const el = document.getElementById('provider-scholarships');
    if (!el) return;

    if (isFirstMount.current) {
      isFirstMount.current = false;
      if (page <= 1) {
        // Force top on initial provider page open; prevents restored mid-page offsets.
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        return;
      }
      el.scrollIntoView({ behavior: 'auto', block: 'start' });
      return;
    }

    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [page]);

  return null;
}
