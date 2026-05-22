import 'server-only';

import { getPublishedContentTranslation } from '@/lib/i18n/contentTranslationsServer';
import type { ContentTranslationLocale } from '@/lib/i18n/contentTranslationsTypes';
import type { ContentTranslationRow } from '@/lib/i18n/contentTranslationsTypes';
import {
  buildLocalizedComparePageCopy,
  isPublishedCompareTranslation,
  type LocalizedComparePageCopy
} from '@/lib/i18n/comparePilot/compareDetailTranslationGate';
import {
  isCompareStatePilotSlug,
  isCompareUniversityPilotSlug
} from '@/lib/i18n/comparePilot/comparePilotSlugs';
import { fetchPublishedComparePageBySlug } from '@/lib/seo/universityCompareServer';
import { fetchPublishedStateComparePageBySlug } from '@/lib/seo/stateCompareServer';

export type PublishedCompareUniversityContext = {
  slug: string;
  englishHeadline: string;
  translation: ContentTranslationRow;
  copy: LocalizedComparePageCopy;
};

export type PublishedCompareStateContext = {
  slug: string;
  englishHeadline: string;
  translation: ContentTranslationRow;
  copy: LocalizedComparePageCopy;
};

export async function fetchPublishedCompareUniversity(
  slug: string,
  locale: ContentTranslationLocale
): Promise<PublishedCompareUniversityContext | null> {
  const normalized = decodeURIComponent(slug ?? '').trim().toLowerCase();
  if (!normalized || !isCompareUniversityPilotSlug(normalized)) return null;

  const row = await fetchPublishedComparePageBySlug(normalized);
  if (!row?.page?.id) return null;
  if (row.page.slug?.trim().toLowerCase() !== normalized) return null;

  const translation = await getPublishedContentTranslation({
    sourceType: 'compare_university',
    sourceId: row.page.id,
    locale
  });
  if (!isPublishedCompareTranslation(translation, normalized)) return null;

  const englishHeadline =
    row.page.meta_title?.trim() ||
    `${row.instA.name} vs ${row.instB.name}`;

  return {
    slug: normalized,
    englishHeadline,
    translation,
    copy: buildLocalizedComparePageCopy(translation, locale, englishHeadline)
  };
}

export async function fetchPublishedCompareState(
  slug: string,
  locale: ContentTranslationLocale
): Promise<PublishedCompareStateContext | null> {
  const normalized = decodeURIComponent(slug ?? '').trim().toLowerCase();
  if (!normalized || !isCompareStatePilotSlug(normalized)) return null;

  const row = await fetchPublishedStateComparePageBySlug(normalized);
  if (!row?.page?.id) return null;
  if (row.page.slug?.trim().toLowerCase() !== normalized) return null;

  const translation = await getPublishedContentTranslation({
    sourceType: 'compare_state',
    sourceId: row.page.id,
    locale
  });
  if (!isPublishedCompareTranslation(translation, normalized)) return null;

  const englishHeadline = row.page.meta_title?.trim() || normalized.replace(/-/g, ' ');

  return {
    slug: normalized,
    englishHeadline,
    translation,
    copy: buildLocalizedComparePageCopy(translation, locale, englishHeadline)
  };
}
