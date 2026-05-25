import 'server-only';

import type { ContentPostRow } from '@/lib/content-hub/contentPostListTypes';
import { fetchPublishedContentPostBySlug } from '@/lib/content-hub/contentPostsServer';
import { getPublishedContentTranslation } from '@/lib/i18n/contentTranslationsServer';
import type {
  ContentTranslationLocale,
  ContentTranslationRow
} from '@/lib/i18n/contentTranslationsTypes';
import { shouldExposeTranslatedRoute } from '@/lib/i18n/contentTranslationsTypes';
import {
  buildEnglishFallbackResourcePageCopy,
  buildLocalizedResourcePageCopy,
  type LocalizedResourcePageCopy
} from '@/lib/i18n/resourcePilot/resourcePageCopy';
import { getLocalizedPilotPageBySegments } from '@/lib/i18n/staticTranslations';
import { isStage2PilotLocale } from '@/lib/i18n/pilotRoutes';

export type {
  LocalizedResourcePageCopy,
  ResourcePilotFaqItem
} from '@/lib/i18n/resourcePilot/resourcePageCopy';
export {
  buildEnglishFallbackResourcePageCopy,
  buildLocalizedResourcePageCopy,
  englishFaqFromPost
} from '@/lib/i18n/resourcePilot/resourcePageCopy';

export function isPublishedResourceTranslation(
  row: ContentTranslationRow | null
): row is ContentTranslationRow {
  if (!row) return false;
  if (!shouldExposeTranslatedRoute(row)) return false;
  const score = row.quality_score;
  if (typeof score === 'number' && score < 85) return false;
  const body = row.translated_body?.trim();
  const title = row.translated_title?.trim();
  return Boolean(title && body);
}

export async function fetchPublishedResourceTranslation(
  slug: string,
  locale: ContentTranslationLocale
): Promise<{ post: ContentPostRow; translation: ContentTranslationRow } | null> {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return null;

  const post = await fetchPublishedContentPostBySlug(normalized);
  if (!post?.id) return null;

  const translation = await getPublishedContentTranslation({
    sourceType: 'resource_article',
    sourceId: post.id,
    locale
  });
  if (!isPublishedResourceTranslation(translation)) return null;

  return { post, translation };
}

/** Stage 2 static ES/FR resource pages — delegate before CMS gate. */
export function getStaticLocalizedResourcePilotPage(
  locale: string,
  slug: string
) {
  if (!isStage2PilotLocale(locale)) return null;
  return getLocalizedPilotPageBySegments(locale, ['resources', slug]);
}

export type LocalizedResourceResolveMode = 'translated' | 'englishFallback';

export type LocalizedResourceResolveResult =
  | {
      mode: 'translated';
      post: ContentPostRow;
      translation: ContentTranslationRow;
      copy: LocalizedResourcePageCopy;
    }
  | {
      mode: 'englishFallback';
      post: ContentPostRow;
      copy: LocalizedResourcePageCopy;
    };

export async function resolveLocalizedResourceArticlePage(
  slug: string,
  locale: ContentTranslationLocale
): Promise<LocalizedResourceResolveResult | null> {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return null;

  const post = await fetchPublishedContentPostBySlug(normalized);
  if (!post?.id) return null;

  const translation = await getPublishedContentTranslation({
    sourceType: 'resource_article',
    sourceId: post.id,
    locale
  });

  if (isPublishedResourceTranslation(translation)) {
    return {
      mode: 'translated',
      post,
      translation,
      copy: buildLocalizedResourcePageCopy(translation, locale)
    };
  }

  return {
    mode: 'englishFallback',
    post,
    copy: buildEnglishFallbackResourcePageCopy(post, locale)
  };
}
