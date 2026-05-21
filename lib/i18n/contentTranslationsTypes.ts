import type { TranslationStatus } from '@/lib/i18n/types';

export const CONTENT_TRANSLATION_LOCALES = ['es', 'fr'] as const;
export type ContentTranslationLocale = (typeof CONTENT_TRANSLATION_LOCALES)[number];

export const CONTENT_TRANSLATION_STATUSES = [
  'missing',
  'queued',
  'draft_machine',
  'draft_agent',
  'review_required',
  'reviewed',
  'published',
  'stale',
  'blocked'
] as const satisfies readonly TranslationStatus[];

export type ContentTranslationStatus = (typeof CONTENT_TRANSLATION_STATUSES)[number];

export const CONTENT_TRANSLATION_SOURCE_TYPES = [
  'scholarship_detail',
  'provider_profile',
  'resource_article',
  'essay_guide',
  'compare_state',
  'compare_university',
  'scholarship_category',
  'seo_hub',
  'seo_manifest',
  'seo_country',
  'university_hub'
] as const;

export type ContentTranslationSourceType =
  (typeof CONTENT_TRANSLATION_SOURCE_TYPES)[number];

export type ContentTranslationRow = {
  id: string;
  source_type: ContentTranslationSourceType;
  source_id: string;
  locale: ContentTranslationLocale;
  source_hash: string | null;
  source_updated_at: string | null;
  status: ContentTranslationStatus;
  translated_slug: string | null;
  translated_title: string | null;
  translated_meta_title: string | null;
  translated_meta_description: string | null;
  translated_summary: string | null;
  translated_body: string | null;
  translated_faq_json: unknown | null;
  translated_schema_json: unknown | null;
  translated_extra_json: unknown | null;
  quality_score: number | null;
  machine_model: string | null;
  translated_by: string | null;
  reviewed_by: string | null;
  reviewer_notes: string | null;
  published_at: string | null;
  stale_at: string | null;
  blocked_reason: string | null;
  created_at: string;
  updated_at: string;
};

const LOCALE_SET = new Set<string>(CONTENT_TRANSLATION_LOCALES);
const STATUS_SET = new Set<string>(CONTENT_TRANSLATION_STATUSES);
const SOURCE_TYPE_SET = new Set<string>(CONTENT_TRANSLATION_SOURCE_TYPES);

export function isSupportedTranslationLocale(
  value: unknown
): value is ContentTranslationLocale {
  return typeof value === 'string' && LOCALE_SET.has(value);
}

export function isContentTranslationStatus(
  value: unknown
): value is ContentTranslationStatus {
  return typeof value === 'string' && STATUS_SET.has(value);
}

export function isContentTranslationSourceType(
  value: unknown
): value is ContentTranslationSourceType {
  return typeof value === 'string' && SOURCE_TYPE_SET.has(value);
}

export function isPublishedTranslation(
  status: ContentTranslationStatus | TranslationStatus | null | undefined
): boolean {
  return status === 'published';
}

/** Public pages may only use rows with status=published (RLS also enforces). */
export function shouldExposeTranslatedRoute(
  translation: Pick<ContentTranslationRow, 'status'> | null | undefined
): boolean {
  return isPublishedTranslation(translation?.status);
}

export function shouldIndexTranslatedContent(input: {
  translation: Pick<ContentTranslationRow, 'status' | 'quality_score'> | null;
  englishIndexable: boolean;
  hasLocalizedTitle?: boolean;
  hasLocalizedH1?: boolean;
  hasLocalizedBody?: boolean;
  hasMixedLanguageRisk?: boolean;
}): boolean {
  if (!shouldExposeTranslatedRoute(input.translation)) return false;
  if (!input.englishIndexable) return false;
  const score = input.translation?.quality_score;
  if (typeof score === 'number' && (score < 0 || score > 100)) return false;
  if (typeof score === 'number' && score < 85) return false;
  if (input.hasLocalizedTitle === false) return false;
  if (input.hasLocalizedH1 === false) return false;
  if (input.hasLocalizedBody === false) return false;
  if (input.hasMixedLanguageRisk === true) return false;
  return true;
}
