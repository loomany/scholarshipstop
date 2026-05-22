import type { Scholarship, ScholarshipSeoFaqItem } from '@/app/scholarships/scholarshipsData';
import type { ContentTranslationRow } from '@/lib/i18n/contentTranslationsTypes';
import { shouldExposeTranslatedRoute } from '@/lib/i18n/contentTranslationsTypes';

export type ScholarshipDetailFaqItem = { question: string; answer: string };

const MIN_QUALITY_SCORE = 85;

export function faqFromScholarshipTranslationRow(
  row: ContentTranslationRow
): ScholarshipSeoFaqItem[] {
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
    .filter((x): x is ScholarshipSeoFaqItem => x != null);
}

export function isPublishedScholarshipDetailTranslation(
  row: ContentTranslationRow | null,
  urlSlug: string
): row is ContentTranslationRow {
  if (!row || !shouldExposeTranslatedRoute(row)) return false;
  const score = row.quality_score;
  if (typeof score === 'number' && score < MIN_QUALITY_SCORE) return false;
  const body = row.translated_body?.trim();
  const summary = row.translated_summary?.trim();
  if (!body && !summary) return false;
  const translatedSlug = row.translated_slug?.trim().toLowerCase();
  const normalizedSlug = urlSlug.trim().toLowerCase();
  if (translatedSlug && translatedSlug !== normalizedSlug) return false;
  return true;
}

/**
 * Overlay published translation onto EN scholarship record.
 * Official title, amounts, deadlines, provider, and URLs stay from the catalog row.
 */
export function applyScholarshipDetailTranslation(
  scholarship: Scholarship,
  row: ContentTranslationRow
): Scholarship {
  const overview = row.translated_body?.trim() || row.translated_summary?.trim() || '';
  const summary = row.translated_summary?.trim() || overview;
  const faq = faqFromScholarshipTranslationRow(row);

  return {
    ...scholarship,
    summaryShort: summary,
    summaryLong: overview || summary,
    seoOverview: overview,
    description: overview,
    seoExcerpt: row.translated_meta_description?.trim() || summary.slice(0, 320),
    seoFaq: faq.length >= 2 ? faq : faq.length > 0 ? faq : scholarship.seoFaq,
    descriptionHtml: null,
    eligibilityHtml: null,
    awardsHtml: null,
    notificationHtml: null,
    paymentHtml: null,
    requirementsHtml: null,
    selectionCriteriaHtml: null,
    fullContentHtml: null,
    aiStudentSummary: null,
    aiBestFor: [],
    aiKeyHighlights: [],
    aiEligibilitySummary: [],
    aiImportantChecks: [],
    aiApplicationTips: [],
    aiWhyApply: [],
    aiRedFlags: [],
    aiMissingInfo: [],
    aiScoreExplanation: null,
    seoEligibility: null,
    seoApplication: null
  };
}

export type LocalizedScholarshipDetailSeoCopy = {
  metaTitle: string;
  metaDescription: string;
};

export function buildLocalizedScholarshipDetailSeoCopy(
  row: ContentTranslationRow,
  officialTitle: string
): LocalizedScholarshipDetailSeoCopy {
  const metaTitle =
    row.translated_meta_title?.trim() ||
    row.translated_title?.trim() ||
    officialTitle;
  const metaDescription =
    row.translated_meta_description?.trim() ||
    row.translated_summary?.trim() ||
    '';
  return { metaTitle, metaDescription };
}
