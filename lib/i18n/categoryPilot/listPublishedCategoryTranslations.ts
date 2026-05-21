import 'server-only';

import type { ScholarshipCategoryId } from '@/app/scholarships/scholarshipCategories';
import type { ContentTranslationLocale } from '@/lib/i18n/contentTranslationsTypes';
import {
  categoryIsPromotedSeo,
  getPromotedSeoCategorySlugs
} from '@/lib/scholarships/categorySeoAllowlist';
import { createPublicClient } from '@/utils/supabase/public';

const PUBLISHED_CATEGORY_SELECT =
  'source_id, locale, status, quality_score, translated_title, updated_at, published_at';

export type PublishedCategoryTranslationSummary = {
  sourceId: string;
  locale: ContentTranslationLocale;
  qualityScore: number | null;
  translatedTitle: string | null;
  lastModified: string | null;
};

export async function listPublishedCategoryTranslations(): Promise<
  PublishedCategoryTranslationSummary[]
> {
  const supabase = createPublicClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('content_translations')
    .select(PUBLISHED_CATEGORY_SELECT)
    .eq('source_type', 'scholarship_category')
    .eq('status', 'published')
    .in('locale', ['es', 'fr']);

  if (error || !data?.length) return [];

  const promoted = new Set<ScholarshipCategoryId>(getPromotedSeoCategorySlugs());
  return data
    .map((row) => {
      const sourceId = String(row.source_id ?? '').trim();
      const locale = row.locale;
      if (
        !categoryIsPromotedSeo(sourceId) ||
        !promoted.has(sourceId as ScholarshipCategoryId)
      ) {
        return null;
      }
      if (locale !== 'es' && locale !== 'fr') return null;
      return {
        sourceId,
        locale,
        qualityScore:
          typeof row.quality_score === 'number' ? row.quality_score : null,
        translatedTitle:
          typeof row.translated_title === 'string' ? row.translated_title : null,
        lastModified:
          (typeof row.published_at === 'string' ? row.published_at : null) ??
          (typeof row.updated_at === 'string' ? row.updated_at : null)
      } satisfies PublishedCategoryTranslationSummary;
    })
    .filter((r): r is PublishedCategoryTranslationSummary => r != null);
}
