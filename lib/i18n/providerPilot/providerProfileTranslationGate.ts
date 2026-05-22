import type { ProviderFaqItem } from '@/lib/providers/providerProfileTypes';
import type { ContentTranslationRow } from '@/lib/i18n/contentTranslationsTypes';
import { shouldExposeTranslatedRoute } from '@/lib/i18n/contentTranslationsTypes';

export type LocalizedProviderPageCopy = {
  metaTitle: string;
  metaDescription: string;
  pageTitle: string;
  aboutParagraphs: string[];
  faqItems: ProviderFaqItem[];
};

const MIN_QUALITY_SCORE = 85;

function paragraphsFromBody(text: string | null | undefined): string[] {
  const t = text?.trim();
  if (!t) return [];
  return t
    .split(/\n\n+/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .slice(0, 2);
}

function faqFromRow(row: ContentTranslationRow): ProviderFaqItem[] {
  const raw = row.translated_faq_json;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const q = (item as Record<string, unknown>).question;
      const a = (item as Record<string, unknown>).answer;
      if (typeof q !== 'string' || typeof a !== 'string') return null;
      const question = q.trim();
      const answer = a.trim();
      if (!question || !answer) return null;
      return { question, answer };
    })
    .filter((x): x is ProviderFaqItem => x != null);
}

export function isPublishedProviderTranslation(
  row: ContentTranslationRow | null
): row is ContentTranslationRow {
  if (!row || !shouldExposeTranslatedRoute(row)) return false;
  const score = row.quality_score;
  if (typeof score === 'number' && score < MIN_QUALITY_SCORE) return false;
  const body = row.translated_body?.trim();
  const title = row.translated_title?.trim();
  return Boolean(title && body);
}

export function buildLocalizedProviderPageCopy(
  row: ContentTranslationRow,
  displayName: string
): LocalizedProviderPageCopy {
  const pageTitle = row.translated_title?.trim() || displayName;
  return {
    metaTitle: row.translated_meta_title?.trim() || pageTitle,
    metaDescription:
      row.translated_meta_description?.trim() ||
      row.translated_summary?.trim() ||
      '',
    pageTitle,
    aboutParagraphs: paragraphsFromBody(row.translated_body),
    faqItems: faqFromRow(row)
  };
}
