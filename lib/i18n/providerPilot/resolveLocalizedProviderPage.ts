import 'server-only';

import { getCachedProviderProfilePage } from '@/lib/providers/providerProfileServer';
import { getPublishedContentTranslation } from '@/lib/i18n/contentTranslationsServer';
import type {
  ContentTranslationLocale,
  ContentTranslationRow
} from '@/lib/i18n/contentTranslationsTypes';
import {
  buildLocalizedProviderPageCopy,
  isPublishedProviderTranslation,
  type LocalizedProviderPageCopy
} from '@/lib/i18n/providerPilot/providerProfileTranslationGate';

export type { LocalizedProviderPageCopy };
export { buildLocalizedProviderPageCopy, isPublishedProviderTranslation };

export type PublishedProviderProfileContext = {
  profile: NonNullable<Awaited<ReturnType<typeof getCachedProviderProfilePage>>>;
  translation: ContentTranslationRow;
  copy: LocalizedProviderPageCopy;
};

/**
 * Gate: provider must exist in catalog and have a stable providers.id for source_id.
 * Translation must be published with quality_score >= 85 and localized body+title.
 * Optional translated_slug must match URL slug when set.
 */
export async function fetchPublishedProviderProfile(
  slug: string,
  locale: ContentTranslationLocale
): Promise<PublishedProviderProfileContext | null> {
  const normalizedSlug = decodeURIComponent(slug ?? '').trim().toLowerCase();
  if (!normalizedSlug) return null;

  const profile = await getCachedProviderProfilePage(normalizedSlug, 1);
  if (!profile?.providerId) return null;
  if (profile.slug.trim().toLowerCase() !== normalizedSlug) return null;

  const translation = await getPublishedContentTranslation({
    sourceType: 'provider_profile',
    sourceId: profile.providerId,
    locale
  });
  if (!isPublishedProviderTranslation(translation)) return null;

  const translatedSlug = translation.translated_slug?.trim().toLowerCase();
  if (translatedSlug && translatedSlug !== normalizedSlug) return null;

  return {
    profile,
    translation,
    copy: buildLocalizedProviderPageCopy(translation, profile.displayName)
  };
}
