import type { IqLocale } from '@/lib/iq/i18n/iqLocales';

/** Bump when draft shape changes. */
export const IQ_ASSESSMENT_DRAFT_VERSION = 'v2';

export function iqAssessmentStorageKey(baseKey: string, locale: IqLocale): string {
  return `${baseKey}:${IQ_ASSESSMENT_DRAFT_VERSION}:${locale}`;
}
