import 'server-only';

import type { Scholarship } from '@/app/scholarships/scholarshipsData';
import { getPublishedContentTranslation } from '@/lib/i18n/contentTranslationsServer';
import type { ContentTranslationRow } from '@/lib/i18n/contentTranslationsTypes';
import type { ContentTranslationLocale } from '@/lib/i18n/contentTranslationsTypes';
import {
  applyScholarshipDetailTranslation,
  buildLocalizedScholarshipDetailSeoCopy,
  isPublishedScholarshipDetailTranslation,
  type LocalizedScholarshipDetailSeoCopy
} from '@/lib/i18n/scholarshipPilot/scholarshipDetailTranslationGate';
import { getScholarshipDetailServer } from '@/lib/scholarships/scholarshipDetailServer';

export type PublishedScholarshipDetailContext = {
  scholarship: Scholarship;
  translation: ContentTranslationRow;
  seoCopy: LocalizedScholarshipDetailSeoCopy;
  slug: string;
};

export async function fetchPublishedScholarshipDetail(
  slug: string,
  locale: ContentTranslationLocale
): Promise<PublishedScholarshipDetailContext | null> {
  const normalizedSlug = decodeURIComponent(slug ?? '').trim().toLowerCase();
  if (!normalizedSlug) {
    return null;
  }

  const scholarship = await getScholarshipDetailServer(normalizedSlug);
  if (!scholarship?.id) return null;
  const recordSlug = scholarship.slug?.trim().toLowerCase();
  if (recordSlug && recordSlug !== normalizedSlug) return null;

  const translation = await getPublishedContentTranslation({
    sourceType: 'scholarship_detail',
    sourceId: scholarship.id,
    locale
  });
  if (!isPublishedScholarshipDetailTranslation(translation, normalizedSlug)) {
    return null;
  }

  return {
    slug: normalizedSlug,
    scholarship: applyScholarshipDetailTranslation(scholarship, translation),
    translation,
    seoCopy: buildLocalizedScholarshipDetailSeoCopy(
      translation,
      scholarship.title
    )
  };
}
