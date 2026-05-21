import { categoryListingIntroParagraph } from '@/app/scholarships/category/categoryListingSeoCopy';
import { resolveCategoryExpertContent } from '@/app/scholarships/category/categoryExpertContent';
import {
  categoryListingMetaDescription,
  categoryListingMetaTitle
} from '@/app/scholarships/category/categoryListingSeoCopy';
import type { ScholarshipCategoryId } from '@/app/scholarships/scholarshipCategories';
import { getTranslationSourceHash } from '@/lib/i18n/contentTranslationsServer';

export function buildCategorySourceHash(
  categoryId: ScholarshipCategoryId
): string {
  const expert = resolveCategoryExpertContent(categoryId);
  return getTranslationSourceHash({
    metaTitle: categoryListingMetaTitle(categoryId, categoryId),
    metaDescription: categoryListingMetaDescription(categoryId, categoryId),
    intro:
      expert?.intro ?? categoryListingIntroParagraph(categoryId, categoryId),
    howThisPageWorks: expert?.howThisPageWorks ?? null,
    howToIncreaseChances: expert?.howToIncreaseChances ?? null,
    faqItems: expert?.faqItems ?? null
  });
}
