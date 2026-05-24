import 'server-only';

import type { ContentTranslationLocale } from '@/lib/i18n/contentTranslationsTypes';
import { createPublicClient } from '@/utils/supabase/public';

const PUBLISHED_PROVIDER_SELECT =
  'source_id, locale, status, quality_score, translated_title, translated_slug, translated_body, translated_summary, updated_at, published_at';

const MIN_QUALITY_SCORE = 85;

export type PublishedProviderProfileTranslationSummary = {
  sourceId: string;
  providerSlug: string;
  locale: ContentTranslationLocale;
  qualityScore: number | null;
  translatedTitle: string | null;
  translatedBody: string | null;
  translatedSummary: string | null;
  lastModified: string | null;
};

export async function listPublishedProviderProfileTranslations(): Promise<
  PublishedProviderProfileTranslationSummary[]
> {
  const supabase = createPublicClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('content_translations')
    .select(PUBLISHED_PROVIDER_SELECT)
    .eq('source_type', 'provider_profile')
    .eq('status', 'published')
    .in('locale', ['es', 'fr']);

  if (error || !data?.length) return [];

  const ids = [...new Set(data.map((r) => String(r.source_id ?? '').trim()).filter(Boolean))];
  if (ids.length === 0) return [];

  const { data: providers, error: provErr } = await supabase
    .from('providers')
    .select('id, slug')
    .in('id', ids);

  if (provErr || !providers?.length) return [];

  const slugById = new Map(
    providers.map((p) => [String(p.id), String(p.slug ?? '').trim().toLowerCase()])
  );

  const out: PublishedProviderProfileTranslationSummary[] = [];
  for (const row of data) {
    const sourceId = String(row.source_id ?? '').trim();
    const locale = row.locale;
    if (locale !== 'es' && locale !== 'fr') continue;
    const score =
      typeof row.quality_score === 'number' ? row.quality_score : null;
    if (score != null && score < MIN_QUALITY_SCORE) continue;
    const providerSlug = slugById.get(sourceId);
    if (!providerSlug) continue;
    const translatedSlug = row.translated_slug?.trim().toLowerCase();
    if (translatedSlug && translatedSlug !== providerSlug) continue;

    out.push({
      sourceId,
      providerSlug,
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
