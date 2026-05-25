import 'server-only';

import type { ContentTranslationLocale } from '@/lib/i18n/contentTranslationsTypes';
import {
  isResourcePilotSlug,
  RESOURCE_PILOT_SLUGS
} from '@/lib/i18n/resourcePilot/resourcePilotSlugs';
import { createPublicClient } from '@/utils/supabase/public';

const SELECT =
  'source_id, locale, status, quality_score, translated_title, translated_body, translated_summary, updated_at, published_at';

export type PublishedResourceArticleTranslationSummary = {
  sourceId: string;
  locale: ContentTranslationLocale;
  qualityScore: number | null;
  translatedTitle: string | null;
  translatedBody: string | null;
  translatedSummary: string | null;
  lastModified: string | null;
};

export type PublishedResourceArticleTranslationFilters = {
  locale?: ContentTranslationLocale;
};

export async function listPublishedResourceArticleTranslations(
  filters: PublishedResourceArticleTranslationFilters = {}
): Promise<
  PublishedResourceArticleTranslationSummary[]
> {
  const supabase = createPublicClient();
  if (!supabase) return [];

  let query = supabase
    .from('content_translations')
    .select(SELECT)
    .eq('source_type', 'resource_article')
    .eq('status', 'published');

  query = filters.locale
    ? query.eq('locale', filters.locale)
    : query.in('locale', ['es', 'fr']);

  const { data, error } = await query;

  if (error || !data?.length) return [];

  return data
    .map((row) => {
      const sourceId = String(row.source_id ?? '').trim();
      const locale = row.locale;
      if (locale !== 'es' && locale !== 'fr') return null;
      const score =
        typeof row.quality_score === 'number' ? row.quality_score : null;
      if (score != null && score < 85) return null;
      return {
        sourceId,
        locale,
        qualityScore: score,
        translatedTitle:
          typeof row.translated_title === 'string' ? row.translated_title : null,
        translatedBody:
          typeof row.translated_body === 'string' ? row.translated_body : null,
        translatedSummary:
          typeof row.translated_summary === 'string'
            ? row.translated_summary
            : null,
        lastModified:
          (typeof row.published_at === 'string' ? row.published_at : null) ??
          (typeof row.updated_at === 'string' ? row.updated_at : null)
      } satisfies PublishedResourceArticleTranslationSummary;
    })
    .filter((r): r is PublishedResourceArticleTranslationSummary => r != null);
}

export async function listPublishedResourceArticleSourceIds(): Promise<
  Set<string>
> {
  const rows = await listPublishedResourceArticleTranslations();
  return new Set(rows.map((r) => r.sourceId));
}

/** Slugs with at least one published ES/FR translation (pilot allowlist only). */
export async function listPublishedResourcePilotSlugs(): Promise<string[]> {
  const supabase = createPublicClient();
  if (!supabase) return [];

  const translations = await listPublishedResourceArticleTranslations();
  if (translations.length === 0) return [];

  const ids = [...new Set(translations.map((t) => t.sourceId))];
  const { data, error } = await supabase
    .from('content_posts')
    .select('id, slug')
    .in('id', ids)
    .eq('status', 'published');

  if (error || !data) return [];

  return data
    .map((row) => String(row.slug ?? '').trim().toLowerCase())
    .filter((slug) => isResourcePilotSlug(slug));
}

export function resourcePilotSlugAllowlist(): readonly string[] {
  return RESOURCE_PILOT_SLUGS;
}
