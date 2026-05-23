import 'server-only';

import type { ContentTranslationLocale } from '@/lib/i18n/contentTranslationsTypes';
import { createServiceRoleSupabaseClient } from '@/lib/supabase/serviceRoleClient';

const PUBLISHED_SELECT =
  'source_id, locale, status, quality_score, translated_title, translated_slug, translated_body, translated_summary, updated_at, published_at';

const MIN_QUALITY_SCORE = 85;
/** Supabase/PostgREST default row cap per request. */
const TRANSLATIONS_PAGE_SIZE = 1000;

export type PublishedScholarshipDetailTranslationSummary = {
  sourceId: string;
  scholarshipSlug: string;
  locale: ContentTranslationLocale;
  qualityScore: number | null;
  translatedTitle: string | null;
  translatedBody: string | null;
  translatedSummary: string | null;
  lastModified: string | null;
};

export async function listPublishedScholarshipDetailTranslations(): Promise<
  PublishedScholarshipDetailTranslationSummary[]
> {
  const admin = createServiceRoleSupabaseClient();
  if (!admin) return [];

  type Row = {
    source_id: string;
    locale: string;
    status: string;
    quality_score: number | null;
    translated_title: string | null;
    translated_slug: string | null;
    translated_body: string | null;
    translated_summary: string | null;
    updated_at: string | null;
    published_at: string | null;
  };

  const data: Row[] = [];

  for (let offset = 0; ; offset += TRANSLATIONS_PAGE_SIZE) {
    const { data: page, error } = await admin
      .from('content_translations')
      .select(PUBLISHED_SELECT)
      .eq('source_type', 'scholarship_detail')
      .eq('status', 'published')
      .in('locale', ['es', 'fr'])
      .order('source_id', { ascending: true })
      .order('locale', { ascending: true })
      .range(offset, offset + TRANSLATIONS_PAGE_SIZE - 1);

    if (error) return [];
    if (!page?.length) break;
    data.push(...page);
    if (page.length < TRANSLATIONS_PAGE_SIZE) break;
  }

  if (!data.length) return [];

  const ids = [...new Set(data.map((r) => String(r.source_id ?? '').trim()).filter(Boolean))];
  if (ids.length === 0) return [];

  const slugById = new Map<string, string>();
  const indexableById = new Map<string, boolean>();
  const chunkSize = 80;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const slice = ids.slice(i, i + chunkSize);
    const { data: scholarships, error: schErr } = await admin
      .from('scholarships')
      .select('id, slug, is_indexable')
      .in('id', slice);

    if (schErr) return [];
    for (const s of scholarships ?? []) {
      const id = String(s.id);
      slugById.set(id, String(s.slug ?? '').trim().toLowerCase());
      indexableById.set(id, s.is_indexable !== false);
    }
  }

  if (slugById.size === 0) return [];

  const out: PublishedScholarshipDetailTranslationSummary[] = [];
  for (const row of data) {
    const sourceId = String(row.source_id ?? '').trim();
    const locale = row.locale;
    if (locale !== 'es' && locale !== 'fr') continue;
    const score =
      typeof row.quality_score === 'number' ? row.quality_score : null;
    if (score != null && score < MIN_QUALITY_SCORE) continue;

    const body =
      typeof row.translated_body === 'string' ? row.translated_body.trim() : '';
    const summary =
      typeof row.translated_summary === 'string'
        ? row.translated_summary.trim()
        : '';
    if (!body && !summary) continue;

    const title =
      typeof row.translated_title === 'string' ? row.translated_title.trim() : '';
    if (!title) continue;

    const scholarshipSlug = slugById.get(sourceId);
    if (!scholarshipSlug) continue;
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
      translatedBody: body || null,
      translatedSummary: summary || null,
      lastModified:
        (typeof row.published_at === 'string' ? row.published_at : null) ??
        (typeof row.updated_at === 'string' ? row.updated_at : null)
    });
  }
  return out;
}
