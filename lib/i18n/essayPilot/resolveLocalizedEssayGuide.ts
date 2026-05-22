import 'server-only';

import { fetchPublishedEssayBySlug, type EssayDetailRow } from '@/lib/essays/essaysServer';
import { getPublishedContentTranslation } from '@/lib/i18n/contentTranslationsServer';
import type { ContentTranslationRow } from '@/lib/i18n/contentTranslationsTypes';
import type { ContentTranslationLocale } from '@/lib/i18n/contentTranslationsTypes';
import {
  buildLocalizedEssayPageCopy,
  isPublishedEssayTranslation,
  type LocalizedEssayPageCopy
} from '@/lib/i18n/essayPilot/essayDetailTranslationGate';
import { isEssayPilotSlug } from '@/lib/i18n/essayPilot/essayPilotSlugs';

export type PublishedEssayGuideContext = {
  essay: EssayDetailRow;
  translation: ContentTranslationRow;
  copy: LocalizedEssayPageCopy;
  slug: string;
};

export async function fetchPublishedEssayGuide(
  slug: string,
  locale: ContentTranslationLocale
): Promise<PublishedEssayGuideContext | null> {
  const normalized = decodeURIComponent(slug ?? '').trim().toLowerCase();
  if (!normalized || !isEssayPilotSlug(normalized)) return null;

  const essay = await fetchPublishedEssayBySlug(normalized);
  if (!essay?.id) return null;
  if (essay.slug?.trim().toLowerCase() !== normalized) return null;

  const translation = await getPublishedContentTranslation({
    sourceType: 'essay_guide',
    sourceId: essay.id,
    locale
  });
  if (!isPublishedEssayTranslation(translation, normalized)) return null;

  return {
    slug: normalized,
    essay,
    translation,
    copy: buildLocalizedEssayPageCopy(translation, locale)
  };
}
