import type { Metadata } from 'next';

import {
  isStage2PilotLocale,
  type Stage2PilotLocale
} from '@/lib/i18n/pilotRoutes';

/** Safe fallback when Next invokes `generateMetadata` without route params during prerender. */
export const METADATA_NOT_FOUND: Metadata = {
  title: 'Page not found',
  robots: { index: false, follow: false }
};

export function resolveStage2PilotLocaleFromParams(
  params: { locale?: string } | undefined
): Stage2PilotLocale | null {
  const locale = params?.locale;
  return isStage2PilotLocale(locale) ? locale : null;
}
