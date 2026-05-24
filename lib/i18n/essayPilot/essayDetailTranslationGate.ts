import type { ContentTranslationRow } from '@/lib/i18n/contentTranslationsTypes';
import { shouldExposeTranslatedRoute } from '@/lib/i18n/contentTranslationsTypes';

export type EssayFaqItem = { question: string; answer: string };

const MIN_QUALITY = 85;

export function faqFromEssayTranslation(row: ContentTranslationRow): EssayFaqItem[] {
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
    .filter((x): x is EssayFaqItem => x != null);
}

export function isPublishedEssayTranslation(
  row: ContentTranslationRow | null,
  urlSlug: string
): row is ContentTranslationRow {
  if (!row || !shouldExposeTranslatedRoute(row)) return false;
  const score = row.quality_score;
  if (typeof score === 'number' && score < MIN_QUALITY) return false;
  const body = row.translated_body?.trim();
  const summary = row.translated_summary?.trim();
  if (!body && !summary) return false;
  const translatedSlug = row.translated_slug?.trim().toLowerCase();
  const normalized = urlSlug.trim().toLowerCase();
  if (translatedSlug && translatedSlug !== normalized) return false;
  return true;
}

export type LocalizedEssayPageCopy = {
  metaTitle: string;
  metaDescription: string;
  headline: string;
  intro: string;
  bodyHtml: string;
  faq: EssayFaqItem[];
  disclaimer: string;
};

export function buildLocalizedEssayPageCopy(
  row: ContentTranslationRow,
  locale: 'es' | 'fr'
): LocalizedEssayPageCopy {
  const disclaimer =
    locale === 'es'
      ? 'Verifique siempre los detalles en las fuentes oficiales. ScholarshipTop no garantiza resultados.'
      : 'Vérifiez toujours les détails sur les sources officielles. ScholarshipTop ne garantit aucun résultat.';
  const extra = row.translated_extra_json;
  const extraDisclaimer =
    extra && typeof extra === 'object' && !Array.isArray(extra)
      ? (extra as Record<string, unknown>).disclaimer
      : null;

  const body = row.translated_body?.trim() || row.translated_summary?.trim() || '';
  const paragraphs = body
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const bodyHtml = paragraphs.map((p) => `<p>${p}</p>`).join('');

  return {
    metaTitle: row.translated_meta_title?.trim() || row.translated_title?.trim() || '',
    metaDescription: row.translated_meta_description?.trim() || row.translated_summary?.trim() || '',
    headline: row.translated_title?.trim() || '',
    intro: row.translated_summary?.trim() || paragraphs[0] || '',
    bodyHtml,
    faq: faqFromEssayTranslation(row),
    disclaimer:
      typeof extraDisclaimer === 'string' && extraDisclaimer.trim()
        ? extraDisclaimer.trim()
        : disclaimer
  };
}
