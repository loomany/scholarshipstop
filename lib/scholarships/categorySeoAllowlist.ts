import { normalizeCategoryId, type ScholarshipCategoryId } from '@/app/scholarships/scholarshipCategories';

const CATEGORY_SEO_ALLOWLIST = new Set<ScholarshipCategoryId>([
  'arts',
  'education',
  'humanities',
  'stem',
  'medical',
  'law',
  'community',
  'biology',
  'safety',
  'music',
  'disability'
]);

export function categoryIsPromotedSeo(slug: string | null | undefined): boolean {
  const normalized = normalizeCategoryId((slug ?? '').trim().toLowerCase());
  if (!normalized) return false;
  return CATEGORY_SEO_ALLOWLIST.has(normalized);
}

export function getPromotedSeoCategorySlugs(): ScholarshipCategoryId[] {
  return Array.from(CATEGORY_SEO_ALLOWLIST);
}
