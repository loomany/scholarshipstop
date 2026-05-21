import 'server-only';

import { notFound } from 'next/navigation';

import { getPublishedContentTranslation } from '@/lib/i18n/contentTranslationsServer';
import type { ContentTranslationLocale } from '@/lib/i18n/contentTranslationsTypes';
import { shouldExposeTranslatedRoute } from '@/lib/i18n/contentTranslationsTypes';

/**
 * Localized `/es|fr/scholarships/{slug}` detail pages must not render English DB body
 * without a published `content_translations` row.
 *
 * Stage 4B: no translations are seeded — this always ends in 404 for localized detail.
 * Stage 4C: replace the final `notFound()` with translated detail rendering when published.
 */
export async function gateLocalizedScholarshipDetailOrNotFound(
  locale: ContentTranslationLocale,
  scholarshipId: string
): Promise<void> {
  const translation = await getPublishedContentTranslation({
    sourceType: 'scholarship_detail',
    sourceId: scholarshipId,
    locale
  });

  if (!shouldExposeTranslatedRoute(translation)) {
    notFound();
  }

  // Stage 4C: render localized scholarship detail from `translation` (no English body).
  notFound();
}
