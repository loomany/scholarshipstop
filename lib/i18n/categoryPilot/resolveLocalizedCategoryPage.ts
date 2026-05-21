import 'server-only';

import {
  categoryListingBrowseWord,
  categoryListingFaqItems,
  categoryListingFaqSectionTitle
} from '@/app/scholarships/category/categoryListingSeoCopy';
import {
  formatCategoryPageH1,
  normalizeCategoryId,
  type ScholarshipCategoryId
} from '@/app/scholarships/scholarshipCategories';
import type { CategoryPilotLocaleContent } from '@/lib/i18n/categoryPilot/categoryPilotTranslationsData';
import { getPublishedContentTranslation } from '@/lib/i18n/contentTranslationsServer';
import type { ContentTranslationLocale } from '@/lib/i18n/contentTranslationsTypes';
import type { ContentTranslationRow } from '@/lib/i18n/contentTranslationsTypes';
import { categoryIsPromotedSeo } from '@/lib/scholarships/categorySeoAllowlist';

export type LocalizedCategoryPageCopy = {
  pageTitle: string;
  introParagraph: string;
  listingExploreHeading: string;
  listingExploreIntro: string;
  postListing: CategoryPilotLocaleContent['translated_extra_json'] & {
    faqItems: { question: string; answer: string }[];
    faqSectionTitle: string;
  };
};

function extraFromRow(
  row: ContentTranslationRow
): CategoryPilotLocaleContent['translated_extra_json'] | null {
  const raw = row.translated_extra_json;
  if (!raw || typeof raw !== 'object') return null;
  return raw as CategoryPilotLocaleContent['translated_extra_json'];
}

function faqFromRow(row: ContentTranslationRow): { question: string; answer: string }[] {
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
    .filter((x): x is { question: string; answer: string } => x != null);
}

export function buildLocalizedCategoryPageCopy(
  row: ContentTranslationRow,
  categoryId: ScholarshipCategoryId | null,
  canonicalSlug: string,
  locale: ContentTranslationLocale
): LocalizedCategoryPageCopy {
  const extra = extraFromRow(row);
  const faqItems = faqFromRow(row);
  const categoryWord = categoryListingBrowseWord(categoryId, canonicalSlug);

  return {
    pageTitle: row.translated_title?.trim() || formatCategoryPageH1(categoryId, canonicalSlug),
    introParagraph:
      row.translated_summary?.trim() ||
      row.translated_body?.trim() ||
      '',
    listingExploreHeading:
      extra?.listingExploreHeading ?? `Available ${canonicalSlug} scholarships`,
    listingExploreIntro:
      extra?.listingExploreIntro ??
      `Browse ${canonicalSlug} scholarships below.`,
    postListing: {
      ...(extra ?? {
        listingExploreHeading: '',
        listingExploreIntro: '',
        howThisPageWorks: row.translated_body?.trim() ?? '',
        howToIncreaseChances: [],
        faqSectionTitle: categoryListingFaqSectionTitle(categoryId, canonicalSlug),
        sectionHowPageWorksLabel: 'How this page works',
        sectionHowPageWorksHeading: 'Compare scholarships with the listing tools above',
        sectionIncreaseChancesLabel: 'How to increase your chances',
        sectionIncreaseChancesHeading: 'Choose applications with a stronger fit',
        trustResourcesAria: 'ScholarshipTop trust resources',
        trustCards: []
      }),
      faqItems:
        faqItems.length > 0 ? faqItems : categoryListingFaqItems(categoryWord),
      faqSectionTitle:
        extra?.faqSectionTitle ??
        categoryListingFaqSectionTitle(categoryId, canonicalSlug)
    }
  };
}

export async function fetchPublishedCategoryTranslation(
  categorySlug: string,
  locale: ContentTranslationLocale
): Promise<ContentTranslationRow | null> {
  return getPublishedContentTranslation({
    sourceType: 'scholarship_category',
    sourceId: categorySlug,
    locale
  });
}

export function resolveCategorySlugParam(slug: string): {
  canonicalSlug: string;
  categoryId: ScholarshipCategoryId | null;
  promoted: boolean;
} {
  const raw = decodeURIComponent(slug ?? '').trim();
  const lower = raw.toLowerCase();
  const categoryId = normalizeCategoryId(lower);
  const canonicalSlug = categoryId ?? lower;
  return {
    canonicalSlug,
    categoryId,
    promoted: categoryIsPromotedSeo(canonicalSlug)
  };
}
