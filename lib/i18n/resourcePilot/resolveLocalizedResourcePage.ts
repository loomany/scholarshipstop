import 'server-only';

import type { ContentPostRow } from '@/lib/content-hub/contentPostListTypes';
import { fetchPublishedContentPostBySlug } from '@/lib/content-hub/contentPostsServer';
import { contentPostFaqFromJson } from '@/lib/content-hub/contentPostFaq';
import { getPublishedContentTranslation } from '@/lib/i18n/contentTranslationsServer';
import type {
  ContentTranslationLocale,
  ContentTranslationRow
} from '@/lib/i18n/contentTranslationsTypes';
import { shouldExposeTranslatedRoute } from '@/lib/i18n/contentTranslationsTypes';
import { getResourceDetailUiCopy } from '@/lib/i18n/resourceDetailUiCopy';
import { getLocalizedPilotPageBySegments } from '@/lib/i18n/staticTranslations';
import { isStage2PilotLocale } from '@/lib/i18n/pilotRoutes';

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
  row: ContentTranslationRow,
  locale: ContentTranslationLocale
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
  const extra = extraUi(row, locale);
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

export function isPublishedResourceTranslation(
  row: ContentTranslationRow | null
): row is ContentTranslationRow {
  if (!row) return false;
  if (!shouldExposeTranslatedRoute(row)) return false;
  const score = row.quality_score;
  if (typeof score === 'number' && score < 85) return false;
  const body = row.translated_body?.trim();
  const title = row.translated_title?.trim();
  return Boolean(title && body);
}

export async function fetchPublishedResourceTranslation(
  slug: string,
  locale: ContentTranslationLocale
): Promise<{ post: ContentPostRow; translation: ContentTranslationRow } | null> {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return null;

  const post = await fetchPublishedContentPostBySlug(normalized);
  if (!post?.id) return null;

  const translation = await getPublishedContentTranslation({
    sourceType: 'resource_article',
    sourceId: post.id,
    locale
  });
  if (!isPublishedResourceTranslation(translation)) return null;

  return { post, translation };
}

/** Stage 2 static ES/FR resource pages — delegate before CMS gate. */
export function getStaticLocalizedResourcePilotPage(
  locale: string,
  slug: string
) {
  if (!isStage2PilotLocale(locale)) return null;
  return getLocalizedPilotPageBySegments(locale, ['resources', slug]);
}

export function englishFaqFromPost(post: ContentPostRow) {
  return contentPostFaqFromJson(post.faq);
}
