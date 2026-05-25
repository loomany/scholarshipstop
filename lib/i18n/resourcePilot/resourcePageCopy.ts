import type { ContentPostRow } from '@/lib/content-hub/contentPostListTypes';
import { contentPostFaqFromJson } from '@/lib/content-hub/contentPostFaq';
import type {
  ContentTranslationLocale,
  ContentTranslationRow
} from '@/lib/i18n/contentTranslationsTypes';
import { getResourceDetailUiCopy } from '@/lib/i18n/resourceDetailUiCopy';

export type ResourcePilotFaqItem = { question: string; answer: string };

export type LocalizedResourcePageCopy = {
  title: string;
  metaTitle: string;
  metaDescription: string;
  summary: string;
  bodyHtml: string;
  faq: ResourcePilotFaqItem[];
  faqSectionTitle: string;
  backLabel: string;
  resourcesHubLabel: string;
  homeLabel: string;
  disclaimer: string;
  exploreScholarshipsCta: {
    title: string;
    description: string;
    buttonText: string;
  };
};

function faqFromRow(row: ContentTranslationRow): ResourcePilotFaqItem[] {
  const raw = row.translated_faq_json;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const q = (item as Record<string, unknown>).question;
      const a = (item as Record<string, unknown>).answer;
      if (typeof q !== 'string' || typeof a !== 'string') return null;
      return { question: q, answer: a };
    })
    .filter((x): x is ResourcePilotFaqItem => x != null);
}

function extraUi(
  row: ContentTranslationRow
): Partial<LocalizedResourcePageCopy> {
  const raw = row.translated_extra_json;
  if (!raw || typeof raw !== 'object') return {};
  const o = raw as Record<string, unknown>;
  return {
    faqSectionTitle:
      typeof o.faqSectionTitle === 'string' ? o.faqSectionTitle : undefined,
    backLabel: typeof o.backLabel === 'string' ? o.backLabel : undefined,
    resourcesHubLabel:
      typeof o.resourcesHubLabel === 'string' ? o.resourcesHubLabel : undefined,
    homeLabel: typeof o.homeLabel === 'string' ? o.homeLabel : undefined,
    disclaimer: typeof o.disclaimer === 'string' ? o.disclaimer : undefined,
    exploreScholarshipsCta:
      o.exploreScholarshipsCta &&
      typeof o.exploreScholarshipsCta === 'object' &&
      !Array.isArray(o.exploreScholarshipsCta)
        ? (o.exploreScholarshipsCta as LocalizedResourcePageCopy['exploreScholarshipsCta'])
        : undefined
  };
}

function defaultUiForLocale(locale: ContentTranslationLocale) {
  const ui = getResourceDetailUiCopy(locale);
  return {
    faqSectionTitle: ui.faqSectionTitle,
    backLabel: ui.backLabel,
    resourcesHubLabel: ui.resourcesHubLabel,
    homeLabel: ui.homeLabel,
    disclaimer: ui.disclaimer,
    exploreScholarshipsCta: ui.exploreScholarshipsCta
  };
}

export function buildLocalizedResourcePageCopy(
  row: ContentTranslationRow,
  locale: ContentTranslationLocale
): LocalizedResourcePageCopy {
  const defaults = defaultUiForLocale(locale);
  const extra = extraUi(row);
  const title = row.translated_title?.trim() || '';
  return {
    title,
    metaTitle: row.translated_meta_title?.trim() || title,
    metaDescription: row.translated_meta_description?.trim() || '',
    summary: row.translated_summary?.trim() || '',
    bodyHtml: row.translated_body?.trim() || '',
    faq: faqFromRow(row),
    faqSectionTitle: extra.faqSectionTitle ?? defaults.faqSectionTitle,
    backLabel: extra.backLabel ?? defaults.backLabel,
    resourcesHubLabel: extra.resourcesHubLabel ?? defaults.resourcesHubLabel,
    homeLabel: extra.homeLabel ?? defaults.homeLabel,
    disclaimer: extra.disclaimer ?? defaults.disclaimer,
    exploreScholarshipsCta:
      extra.exploreScholarshipsCta ?? defaults.exploreScholarshipsCta
  };
}

export function englishFaqFromPost(post: ContentPostRow) {
  return contentPostFaqFromJson(post.faq);
}

export function buildEnglishFallbackResourcePageCopy(
  post: ContentPostRow,
  locale: ContentTranslationLocale
): LocalizedResourcePageCopy {
  const defaults = defaultUiForLocale(locale);
  const title = post.title?.trim() || post.meta_title?.trim() || '';
  return {
    title,
    metaTitle: post.meta_title?.trim() || title,
    metaDescription: post.meta_description?.trim() || '',
    summary: '',
    bodyHtml: post.body_html?.trim() || '',
    faq: englishFaqFromPost(post),
    faqSectionTitle: defaults.faqSectionTitle,
    backLabel: defaults.backLabel,
    resourcesHubLabel: defaults.resourcesHubLabel,
    homeLabel: defaults.homeLabel,
    disclaimer: defaults.disclaimer,
    exploreScholarshipsCta: defaults.exploreScholarshipsCta
  };
}
