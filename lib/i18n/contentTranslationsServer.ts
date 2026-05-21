import 'server-only';

import { createHash } from 'node:crypto';

import {
  canAddTranslatedDbHreflang,
  canIncludeTranslatedDbPageInSitemap,
  getTranslatedDbRobots,
  type TranslatedDbPagePolicyInput
} from '@/lib/i18n/contentTranslationsDbPolicy';
import type {
  ContentTranslationLocale,
  ContentTranslationRow,
  ContentTranslationSourceType,
  ContentTranslationStatus
} from '@/lib/i18n/contentTranslationsTypes';
import {
  isContentTranslationSourceType,
  isContentTranslationStatus,
  isSupportedTranslationLocale,
  shouldExposeTranslatedRoute,
  shouldIndexTranslatedContent
} from '@/lib/i18n/contentTranslationsTypes';
import type { TranslatedPageSeoDecision } from '@/lib/i18n/types';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types_db';
import { createPublicClient } from '@/utils/supabase/public';

const PUBLISHED_SELECT =
  'id, source_type, source_id, locale, source_hash, source_updated_at, status, translated_slug, translated_title, translated_meta_title, translated_meta_description, translated_summary, translated_body, translated_faq_json, translated_schema_json, translated_extra_json, quality_score, machine_model, translated_by, reviewed_by, reviewer_notes, published_at, stale_at, blocked_reason, created_at, updated_at';

export type GetPublishedContentTranslationInput = {
  sourceType: ContentTranslationSourceType;
  sourceId: string;
  locale: ContentTranslationLocale;
};

function rowFromDb(raw: Record<string, unknown>): ContentTranslationRow | null {
  const status = raw.status;
  const sourceType = raw.source_type;
  const locale = raw.locale;
  if (
    !isContentTranslationStatus(status) ||
    !isContentTranslationSourceType(sourceType) ||
    !isSupportedTranslationLocale(locale)
  ) {
    return null;
  }
  return raw as unknown as ContentTranslationRow;
}

function translationHasLocalizedBody(
  row: ContentTranslationRow
): boolean {
  const body = row.translated_body?.trim();
  const summary = row.translated_summary?.trim();
  return Boolean(body || summary);
}

function translationHasLocalizedTitle(row: ContentTranslationRow): boolean {
  return Boolean(
    row.translated_title?.trim() ||
      row.translated_meta_title?.trim() ||
      row.translated_meta_description?.trim()
  );
}

export function getTranslationSourceHash(
  input: Record<string, unknown>
): string {
  const stable = JSON.stringify(input, Object.keys(input).sort());
  return createHash('sha256').update(stable).digest('hex');
}

/**
 * Public routes: only `status = published` (RLS + explicit filter).
 * Returns null for missing, draft, review, stale, blocked, or DB errors (e.g. table not migrated yet).
 */
export async function getPublishedContentTranslation({
  sourceType,
  sourceId,
  locale
}: GetPublishedContentTranslationInput): Promise<ContentTranslationRow | null> {
  if (!sourceId.trim()) return null;
  const supabase = createPublicClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('content_translations')
    .select(PUBLISHED_SELECT)
    .eq('source_type', sourceType)
    .eq('source_id', sourceId)
    .eq('locale', locale)
    .eq('status', 'published')
    .maybeSingle();

  if (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[content_translations] read failed', {
        sourceType,
        sourceId,
        locale,
        code: error.code,
        message: error.message
      });
    }
    return null;
  }
  if (!data) return null;
  const row = rowFromDb(data as Record<string, unknown>);
  if (!row || !shouldExposeTranslatedRoute(row)) return null;
  return row;
}

export function getContentTranslationSeoDecision(
  input: TranslatedDbPagePolicyInput & {
    translation: ContentTranslationRow | null;
  }
): TranslatedPageSeoDecision {
  const row = input.translation;
  const indexable = shouldIndexTranslatedContent({
    translation: row,
    englishIndexable: input.englishIndexable,
    hasLocalizedTitle:
      input.hasLocalizedTitle ?? (row ? translationHasLocalizedTitle(row) : false),
    hasLocalizedH1:
      input.hasLocalizedH1 ??
      (row ? Boolean(row.translated_title?.trim()) : false),
    hasLocalizedBody:
      input.hasLocalizedBody ?? (row ? translationHasLocalizedBody(row) : false),
    hasMixedLanguageRisk: input.hasMixedLanguageRisk ?? false
  });

  const reasons: string[] = [];
  if (!row) reasons.push('No published translation row.');
  else if (!shouldExposeTranslatedRoute(row)) {
    reasons.push(`Translation status is ${row.status}, not published.`);
  } else if (!input.englishIndexable) {
    reasons.push('English source page is not indexable.');
  } else if (!indexable) {
    reasons.push('Translation does not meet indexable quality rules.');
  }

  return {
    indexable,
    robots: getTranslatedDbRobots(input),
    includeInSitemap: canIncludeTranslatedDbPageInSitemap(input),
    includeInHreflang: canAddTranslatedDbHreflang(input),
    reasons: indexable
      ? ['Translated DB page meets indexable rules.']
      : reasons
  };
}

/** Server/worker only — not for public pages. Requires service role client passed in. */
export async function getContentTranslationByStatus(
  supabase: SupabaseClient<Database>,
  input: GetPublishedContentTranslationInput & {
    status: ContentTranslationStatus;
  }
): Promise<ContentTranslationRow | null> {
  const { data, error } = await supabase
    .from('content_translations')
    .select(PUBLISHED_SELECT)
    .eq('source_type', input.sourceType)
    .eq('source_id', input.sourceId)
    .eq('locale', input.locale)
    .eq('status', input.status)
    .maybeSingle();

  if (error || !data) return null;
  return rowFromDb(data as Record<string, unknown>);
}
