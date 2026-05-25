import 'server-only';

import type { ContentTranslationLocale } from '@/lib/i18n/contentTranslationsTypes';
import { isEssayPilotSlug } from '@/lib/i18n/essayPilot/essayPilotSlugs';
import { createPublicClient } from '@/utils/supabase/public';

const PUBLISHED_SELECT =
  'source_id, locale, status, quality_score, translated_title, translated_slug, translated_body, translated_summary, updated_at, published_at';

const MIN_QUALITY_SCORE = 85;

export type PublishedEssayGuideTranslationSummary = {
  sourceId: string;
  essaySlug: string;
  locale: ContentTranslationLocale;
  qualityScore: number | null;
  translatedTitle: string | null;
  translatedBody: string | null;
  translatedSummary: string | null;
  lastModified: string | null;
};

export type PublishedEssayGuideTranslationFilters = {
  locale?: ContentTranslationLocale;
};

export async function listPublishedEssayGuideTranslations(
  filters: PublishedEssayGuideTranslationFilters = {}
): Promise<
  PublishedEssayGuideTranslationSummary[]
> {
  const supabase = createPublicClient();
  if (!supabase) return [];

  let query = supabase
    .from('content_translations')
    .select(PUBLISHED_SELECT)
    .eq('source_type', 'essay_guide')
    .eq('status', 'published');

  query = filters.locale
    ? query.eq('locale', filters.locale)
    : query.in('locale', ['es', 'fr']);

  const { data, error } = await query;

  if (error || !data?.length) return [];

  const ids = [...new Set(data.map((r) => String(r.source_id ?? '').trim()).filter(Boolean))];
  if (ids.length === 0) return [];

  const { data: essays, error: essayErr } = await supabase
    .from('essays')
    .select('id, slug, is_published')
    .in('id', ids);

  if (essayErr || !essays?.length) return [];

  const slugById = new Map(
    essays.map((e) => [String(e.id), String(e.slug ?? '').trim().toLowerCase()])
  );

  const out: PublishedEssayGuideTranslationSummary[] = [];
  for (const row of data) {
    const sourceId = String(row.source_id ?? '').trim();
    const locale = row.locale;
    if (locale !== 'es' && locale !== 'fr') continue;
    const score = typeof row.quality_score === 'number' ? row.quality_score : null;
    if (score != null && score < MIN_QUALITY_SCORE) continue;
    const essaySlug = slugById.get(sourceId);
    if (!essaySlug || !isEssayPilotSlug(essaySlug)) continue;
    const translatedSlug = row.translated_slug?.trim().toLowerCase();
    if (translatedSlug && translatedSlug !== essaySlug) continue;

    out.push({
      sourceId,
      essaySlug,
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
    });
  }
  return out;
}
