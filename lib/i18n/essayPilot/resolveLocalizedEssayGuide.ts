import 'server-only';

import { fetchPublishedEssayBySlug, type EssayDetailRow } from '@/lib/essays/essaysServer';
import { getPublishedContentTranslation } from '@/lib/i18n/contentTranslationsServer';
import type { ContentTranslationRow } from '@/lib/i18n/contentTranslationsTypes';
import type { ContentTranslationLocale } from '@/lib/i18n/contentTranslationsTypes';
import {
  buildEnglishFallbackEssayPageCopy,
  buildLocalizedEssayPageCopy,
  isPublishedEssayTranslation,
  type LocalizedEssayPageCopy
} from '@/lib/i18n/essayPilot/essayDetailTranslationGate';

export type PublishedEssayGuideContext = {
  essay: EssayDetailRow;
  translation: ContentTranslationRow;
  copy: LocalizedEssayPageCopy;
  slug: string;
};

export type LocalizedEssayResolveMode = 'translated' | 'englishFallback';

export type LocalizedEssayResolveResult =
  | {
      mode: 'translated';
      slug: string;
      essay: EssayDetailRow;
      translation: ContentTranslationRow;
      copy: LocalizedEssayPageCopy;
    }
  | {
      mode: 'englishFallback';
      slug: string;
      essay: EssayDetailRow;
      copy: LocalizedEssayPageCopy;
    };

export async function fetchPublishedEssayGuide(
  slug: string,
  locale: ContentTranslationLocale
): Promise<PublishedEssayGuideContext | null> {
  const resolved = await resolveLocalizedEssayGuidePage(slug, locale);
  if (!resolved || resolved.mode !== 'translated') return null;
  return {
    slug: resolved.slug,
    essay: resolved.essay,
    translation: resolved.translation,
    copy: resolved.copy
  };
}

export async function resolveLocalizedEssayGuidePage(
  slug: string,
  locale: ContentTranslationLocale
): Promise<LocalizedEssayResolveResult | null> {
  const normalized = decodeURIComponent(slug ?? '').trim().toLowerCase();
  if (!normalized) return null;

  const essay = await fetchPublishedEssayBySlug(normalized);
  if (!essay?.id) return null;
  if (essay.slug?.trim().toLowerCase() !== normalized) return null;

  const translation = await getPublishedContentTranslation({
    sourceType: 'essay_guide',
    sourceId: essay.id,
    locale
  });

  if (isPublishedEssayTranslation(translation, normalized)) {
    return {
      mode: 'translated',
      slug: normalized,
      essay,
      translation,
      copy: buildLocalizedEssayPageCopy(translation, locale)
    };
  }

  return {
    mode: 'englishFallback',
    slug: normalized,
    essay,
    copy: buildEnglishFallbackEssayPageCopy(essay, locale)
  };
}
