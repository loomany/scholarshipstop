import 'server-only';

import type { ContentTranslationLocale } from '@/lib/i18n/contentTranslationsTypes';
import {
  isCompareStatePilotSlug,
  isCompareUniversityPilotSlug
} from '@/lib/i18n/comparePilot/comparePilotSlugs';
import { createPublicClient } from '@/utils/supabase/public';

const PUBLISHED_SELECT =
  'source_id, source_type, locale, status, quality_score, translated_title, translated_slug, translated_body, translated_summary, updated_at, published_at';

const MIN_QUALITY_SCORE = 85;

export type PublishedCompareTranslationSummary = {
  sourceId: string;
  sourceType: 'compare_university' | 'compare_state';
  slug: string;
  locale: ContentTranslationLocale;
  qualityScore: number | null;
  translatedTitle: string | null;
  translatedBody: string | null;
  translatedSummary: string | null;
  lastModified: string | null;
};

export type PublishedCompareTranslationFilters = {
  locale?: ContentTranslationLocale;
};

export async function listPublishedCompareTranslations(
  filters: PublishedCompareTranslationFilters = {}
): Promise<
  PublishedCompareTranslationSummary[]
> {
  const supabase = createPublicClient();
  if (!supabase) return [];

  let query = supabase
    .from('content_translations')
    .select(PUBLISHED_SELECT)
    .in('source_type', ['compare_university', 'compare_state'])
    .eq('status', 'published');

  query = filters.locale
    ? query.eq('locale', filters.locale)
    : query.in('locale', ['es', 'fr']);

  const { data, error } = await query;

  if (error || !data?.length) return [];

  const uniIds: string[] = [];
  const stateIds: string[] = [];
  for (const row of data) {
    const id = String(row.source_id ?? '').trim();
    if (!id) continue;
    if (row.source_type === 'compare_university') uniIds.push(id);
    if (row.source_type === 'compare_state') stateIds.push(id);
  }

  const slugById = new Map<string, { slug: string; sourceType: 'compare_university' | 'compare_state' }>();

  if (uniIds.length) {
    const { data: pages } = await supabase
      .from('compare_pages')
      .select('id, slug')
      .in('id', uniIds);
    for (const p of pages ?? []) {
      slugById.set(String(p.id), {
        slug: String(p.slug ?? '').trim().toLowerCase(),
        sourceType: 'compare_university'
      });
    }
  }

  if (stateIds.length) {
    const { data: pages } = await supabase
      .from('state_compare_pages')
      .select('id, slug')
      .in('id', stateIds);
    for (const p of pages ?? []) {
      slugById.set(String(p.id), {
        slug: String(p.slug ?? '').trim().toLowerCase(),
        sourceType: 'compare_state'
      });
    }
  }

  const out: PublishedCompareTranslationSummary[] = [];
  for (const row of data) {
    const sourceId = String(row.source_id ?? '').trim();
    const locale = row.locale;
    if (locale !== 'es' && locale !== 'fr') continue;
    const score = typeof row.quality_score === 'number' ? row.quality_score : null;
    if (score != null && score < MIN_QUALITY_SCORE) continue;
    const meta = slugById.get(sourceId);
    if (!meta) continue;
    if (
      meta.sourceType === 'compare_university' &&
      !isCompareUniversityPilotSlug(meta.slug)
    ) {
      continue;
    }
    if (meta.sourceType === 'compare_state' && !isCompareStatePilotSlug(meta.slug)) {
      continue;
    }
    const translatedSlug = row.translated_slug?.trim().toLowerCase();
    if (translatedSlug && translatedSlug !== meta.slug) continue;

    out.push({
      sourceId,
      sourceType: meta.sourceType,
      slug: meta.slug,
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
