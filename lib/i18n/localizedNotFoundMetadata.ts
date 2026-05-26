import type { Metadata } from 'next';

import { getNotFoundUiCopy } from '@/lib/i18n/notFoundUiCopy';
import type { Stage2PilotLocale } from '@/lib/i18n/pilotRoutes';

/** Document title + robots for localized route 404 (generateMetadata paths). */
export function localizedNotFoundMetadata(
  locale: Stage2PilotLocale
): Metadata {
  const copy = getNotFoundUiCopy(locale);
  return {
    title: { absolute: copy.title },
    robots: { index: false, follow: false }
  };
}
