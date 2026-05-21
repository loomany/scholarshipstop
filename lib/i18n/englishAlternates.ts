import type { Metadata } from 'next';

import { buildLocalizedAlternates } from '@/lib/i18n/alternates';
import {
  STAGE2_PILOT_LOCALES,
  isStage2PilotCanonicalPath
} from '@/lib/i18n/pilotRoutes';
import type { SupportedLocale } from '@/lib/i18n/types';
import { getCanonical, getLocalizedCanonical } from '@/lib/seo/canonical';

const STAGE2_ENGLISH_ALTERNATE_LOCALES = [
  'en',
  ...STAGE2_PILOT_LOCALES
] as const satisfies readonly SupportedLocale[];

export function buildStage2EnglishPilotAlternates(
  canonicalPath: string
): NonNullable<Metadata['alternates']> {
  if (!isStage2PilotCanonicalPath(canonicalPath)) {
    return { canonical: getCanonical(canonicalPath) };
  }

  return buildLocalizedAlternates({
    canonicalPath,
    currentLocale: 'en',
    availableLocales: STAGE2_ENGLISH_ALTERNATE_LOCALES,
    defaultUrl: getLocalizedCanonical(canonicalPath, 'en')
  });
}

export function withStage2EnglishPilotAlternates<T extends Metadata>(
  metadata: T,
  canonicalPath: string
): T {
  return {
    ...metadata,
    alternates: buildStage2EnglishPilotAlternates(canonicalPath)
  };
}
