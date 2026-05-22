import 'server-only';

import type { ContentTranslationLocale } from '@/lib/i18n/contentTranslationsTypes';
import { isScholarshipDetailPilotSlug } from '@/lib/i18n/scholarshipPilot/scholarshipPilotSlugs';
import { createServiceRoleSupabaseClient } from '@/lib/supabase/serviceRoleClient';
import { createPublicClient } from '@/utils/supabase/public';

const PUBLISHED_SELECT =
  'source_id, locale, status, quality_score, translated_title, translated_slug, updated_at, published_at';

const MIN_QUALITY_SCORE = 85;

export type PublishedScholarshipDetailTranslationSummary = {
  sourceId: string;
  scholarshipSlug: string;
  locale: ContentTranslationLocale;
  qualityScore: number | null;
  translatedTitle: string | null;
  lastModified: string | null;
};

export async function listPublishedScholarshipDetailTranslations(): Promise<
  PublishedScholarshipDetailTranslationSummary[]
> {
  const supabase = createPublicClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('content_translations')
    .select(PUBLISHED_SELECT)
    .eq('source_type', 'scholarship_detail')
    .eq('status', 'published')
    .in('locale', ['es', 'fr']);

  if (error || !data?.length) return [];

  const ids = [...new Set(data.map((r) => String(r.source_id ?? '').trim()).filter(Boolean))];
  if (ids.length === 0) return [];

  // Scholarships table is not readable by anon; service role is required for slug/indexable join.
  const admin = createServiceRoleSupabaseClient();
  if (!admin) return [];

  const { data: scholarships, error: schErr } = await admin
    .from('scholarships')
    .select('id, slug, is_indexable')
    .in('id', ids);

  if (schErr || !scholarships?.length) return [];

  const slugById = new Map(
    scholarships.map((s) => [String(s.id), String(s.slug ?? '').trim().toLowerCase()])
  );
  const indexableById = new Map(
    scholarships.map((s) => [String(s.id), s.is_indexable !== false])
  );

  const out: PublishedScholarshipDetailTranslationSummary[] = [];
  for (const row of data) {
    const sourceId = String(row.source_id ?? '').trim();
    const locale = row.locale;
    if (locale !== 'es' && locale !== 'fr') continue;
    const score =
      typeof row.quality_score === 'number' ? row.quality_score : null;
    if (score != null && score < MIN_QUALITY_SCORE) continue;
    const scholarshipSlug = slugById.get(sourceId);
    if (!scholarshipSlug || !isScholarshipDetailPilotSlug(scholarshipSlug)) {
      continue;
    }
    if (indexableById.get(sourceId) === false) continue;
    const translatedSlug = row.translated_slug?.trim().toLowerCase();
    if (translatedSlug && translatedSlug !== scholarshipSlug) continue;

    out.push({
      sourceId,
      scholarshipSlug,
      locale,
      qualityScore: score,
      translatedTitle:
        typeof row.translated_title === 'string' ? row.translated_title : null,
      lastModified:
        (typeof row.published_at === 'string' ? row.published_at : null) ??
        (typeof row.updated_at === 'string' ? row.updated_at : null)
    });
  }
  return out;
}
