/** Canonical category ids stored on `Scholarship.categories` and used in filters. */
export const SCHOLARSHIP_CATEGORY_ORDER = [
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
  'disability',
  'hobbies',
  'miscellaneous'
] as const;

export type ScholarshipCategoryId =
  (typeof SCHOLARSHIP_CATEGORY_ORDER)[number];

/** Заголовок H1 на странице категории (например «STEM Scholarships»). */
export const SCHOLARSHIP_CATEGORY_PAGE_HEADING: Record<
  ScholarshipCategoryId,
  string
> = {
  arts: 'Arts',
  education: 'Education',
  humanities: 'Humanities',
  stem: 'STEM',
  medical: 'Medicine',
  law: 'Law',
  community: 'Community',
  biology: 'Biology',
  safety: 'Safety',
  music: 'Music',
  disability: 'Disability',
  hobbies: 'Hobbies',
  miscellaneous: 'Miscellaneous'
};

export const SCHOLARSHIP_CATEGORY_LABELS: Record<
  ScholarshipCategoryId,
  string
> = {
  arts: 'Arts',
  education: 'Education',
  humanities: 'Humanities',
  stem: 'STEM',
  medical: 'Medicine',
  law: 'Law',
  community: 'Community',
  biology: 'Biology',
  safety: 'Safety',
  music: 'Music',
  disability: 'Disability',
  hobbies: 'Hobbies',
  miscellaneous: 'Miscellaneous'
};

/** Короткое имя категории для breadcrumbs (без «Scholarships»). */
export function breadcrumbCategoryLabel(slug: string): string {
  const id = normalizeCategoryId(slug.trim().toLowerCase());
  if (id) return SCHOLARSHIP_CATEGORY_PAGE_HEADING[id];
  const words = slug
    .trim()
    .split(/[-_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  return words.length > 0 ? words.join(' ') : 'Category';
}

export function formatCategoryPageH1(
  categoryId: ScholarshipCategoryId | null,
  slugFallback: string
): string {
  if (categoryId) {
    return `${SCHOLARSHIP_CATEGORY_PAGE_HEADING[categoryId]} Scholarships`;
  }
  const words = slugFallback
    .split(/[-_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  const label =
    words.length > 0
      ? words.join(' ')
      : slugFallback.length > 0
        ? slugFallback.charAt(0).toUpperCase() + slugFallback.slice(1).toLowerCase()
        : 'Scholarship';
  return `${label} Scholarships`;
}

export function normalizeScholarshipCountry(country: string): string {
  const c = country.trim().toLowerCase();
  if (c === 'usa' || c === 'united states' || c === 'us') return 'USA';
  return country.trim();
}

export function isScholarshipUSA(country: string): boolean {
  return normalizeScholarshipCountry(country) === 'USA';
}

/** Normalize ids from JSON (case-insensitive). */
export function normalizeCategoryId(
  raw: string
): ScholarshipCategoryId | null {
  const k = raw.trim().toLowerCase();
  for (const id of SCHOLARSHIP_CATEGORY_ORDER) {
    if (id === k) return id;
  }
  if (k === 'misc' || k === 'other') return 'miscellaneous';
  return null;
}

export function scholarshipCategoryIds(
  categories: string[] | undefined
): ScholarshipCategoryId[] {
  if (!categories?.length) return ['miscellaneous'];
  const out: ScholarshipCategoryId[] = [];
  for (const c of categories) {
    const id = normalizeCategoryId(c);
    if (id && !out.includes(id)) out.push(id);
  }
  return out.length ? out : ['miscellaneous'];
}

export function countScholarshipsByCategory(
  usaScholarships: { categories?: string[] }[]
): Record<ScholarshipCategoryId, number> {
  const counts = {} as Record<ScholarshipCategoryId, number>;
  for (const id of SCHOLARSHIP_CATEGORY_ORDER) counts[id] = 0;
  for (const s of usaScholarships) {
    for (const id of scholarshipCategoryIds(s.categories)) {
      counts[id] += 1;
    }
  }
  return counts;
}

export function scholarshipMatchesCategoryFilter(
  categories: string[] | undefined,
  selected: Set<ScholarshipCategoryId>
): boolean {
  if (selected.size === 0) return true;
  const ids = scholarshipCategoryIds(categories);
  return ids.some((id) => selected.has(id));
}

/**
 * Same category_slug filter as `fetchScholarshipsByCategorySlug` (Supabase `.in('category_slug', …)`).
 * Use after a single full-catalog fetch to avoid a second API/DB round-trip on category pages.
 */
export function filterScholarshipsByCatalogCategorySlug<
  T extends { categorySlug?: string | null }
>(list: T[], categorySlugParam: string): T[] {
  const raw = categorySlugParam.trim().toLowerCase();
  if (!raw) return [];
  const canonical = normalizeCategoryId(raw);
  const slugKeys = new Set([raw, ...(canonical ? [canonical] : [])]);
  return list.filter(
    (s) => s.categorySlug != null && slugKeys.has(s.categorySlug)
  );
}
