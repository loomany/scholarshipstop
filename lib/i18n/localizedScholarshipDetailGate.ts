import 'server-only';

import { notFound } from 'next/navigation';

import type { ContentTranslationRow } from '@/lib/i18n/contentTranslationsTypes';
import type { ContentTranslationLocale } from '@/lib/i18n/contentTranslationsTypes';
import { isPublishedScholarshipDetailTranslation } from '@/lib/i18n/scholarshipPilot/scholarshipDetailTranslationGate';
import { fetchPublishedScholarshipDetail } from '@/lib/i18n/scholarshipPilot/resolveLocalizedScholarshipDetail';

/**
 * Localized `/es|fr/scholarships/{slug}` detail pages must not render English DB body
 * without a published `content_translations` row.
 */
export async function gateLocalizedScholarshipDetailOrNotFound(
  locale: ContentTranslationLocale,
  scholarshipId: string,
  urlSlug: string
): Promise<ContentTranslationRow> {
  const ctx = await fetchPublishedScholarshipDetail(urlSlug, locale);
  if (!ctx || ctx.scholarship.id !== scholarshipId) {
    notFound();
  }
  const { translation } = ctx;
  if (!isPublishedScholarshipDetailTranslation(translation, urlSlug)) {
    notFound();
  }
  return translation;
}
