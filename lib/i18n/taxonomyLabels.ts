import {
  SCHOLARSHIP_CATEGORY_LABELS,
  SCHOLARSHIP_CATEGORY_PAGE_HEADING,
  type ScholarshipCategoryId,
  normalizeCategoryId
} from '@/app/scholarships/scholarshipCategories';
import type { LocalizedUiLocale } from '@/lib/i18n/localizedHref';

/** Display-only labels — IDs, slugs, and query params stay English. */
const CATEGORY_LABEL_ES: Record<ScholarshipCategoryId, string> = {
  arts: 'Artes',
  education: 'Educación',
  humanities: 'Humanidades',
  stem: 'STEM',
  medical: 'Medicina',
  law: 'Derecho',
  community: 'Comunidad',
  biology: 'Biología',
  safety: 'Seguridad',
  music: 'Música',
  disability: 'Discapacidad',
  hobbies: 'Pasatiempos',
  miscellaneous: 'Varios'
};

const CATEGORY_LABEL_FR: Record<ScholarshipCategoryId, string> = {
  arts: 'Arts',
  education: 'Éducation',
  humanities: 'Humanités',
  stem: 'STIM',
  medical: 'Médecine',
  law: 'Droit',
  community: 'Communauté',
  biology: 'Biologie',
  safety: 'Sécurité',
  music: 'Musique',
  disability: 'Handicap',
  hobbies: 'Loisirs',
  miscellaneous: 'Divers'
};

const CATEGORY_HEADING_ES: Record<ScholarshipCategoryId, string> = {
  arts: 'Artes',
  education: 'Educación',
  humanities: 'Humanidades',
  stem: 'STEM',
  medical: 'Medicina',
  law: 'Derecho',
  community: 'Comunidad',
  biology: 'Biología',
  safety: 'Seguridad',
  music: 'Música',
  disability: 'Discapacidad',
  hobbies: 'Pasatiempos',
  miscellaneous: 'Varios'
};

const CATEGORY_HEADING_FR: Record<ScholarshipCategoryId, string> = {
  arts: 'Arts',
  education: 'Éducation',
  humanities: 'Humanités',
  stem: 'STIM',
  medical: 'Médecine',
  law: 'Droit',
  community: 'Communauté',
  biology: 'Biologie',
  safety: 'Sécurité',
  music: 'Musique',
  disability: 'Handicap',
  hobbies: 'Loisirs',
  miscellaneous: 'Divers'
};

const SCHOLARSHIPS_SUFFIX: Record<LocalizedUiLocale, string> = {
  en: 'Scholarships',
  es: 'Becas',
  fr: 'Bourses'
};

let regionDisplayNamesCache: Partial<
  Record<LocalizedUiLocale, Intl.DisplayNames | null>
> = {};

function regionDisplayNames(locale: LocalizedUiLocale): Intl.DisplayNames | null {
  if (regionDisplayNamesCache[locale] !== undefined) {
    return regionDisplayNamesCache[locale] ?? null;
  }
  const intlLocale = locale === 'en' ? 'en' : locale === 'es' ? 'es' : 'fr';
  regionDisplayNamesCache[locale] =
    typeof Intl.DisplayNames === 'function'
      ? new Intl.DisplayNames([intlLocale], { type: 'region' })
      : null;
  return regionDisplayNamesCache[locale] ?? null;
}

/**
 * Visible category label for filters, chips, and cards.
 * `value` is the canonical category id (e.g. `safety`, `music`).
 */
export function getLocalizedCategoryLabel(
  value: string,
  locale: LocalizedUiLocale,
  fallback?: string
): string {
  const id = normalizeCategoryId(value);
  if (!id) return fallback?.trim() || value;
  if (locale === 'es') return CATEGORY_LABEL_ES[id];
  if (locale === 'fr') return CATEGORY_LABEL_FR[id];
  return SCHOLARSHIP_CATEGORY_LABELS[id];
}

/** Short category name for breadcrumbs (without “Scholarships”). */
export function getLocalizedCategoryBreadcrumbLabel(
  slugOrId: string,
  locale: LocalizedUiLocale
): string {
  const id = normalizeCategoryId(slugOrId.trim().toLowerCase());
  if (id) {
    if (locale === 'es') return CATEGORY_HEADING_ES[id];
    if (locale === 'fr') return CATEGORY_HEADING_FR[id];
    return SCHOLARSHIP_CATEGORY_PAGE_HEADING[id];
  }
  const words = slugOrId
    .trim()
    .split(/[-_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  return words.length > 0 ? words.join(' ') : 'Category';
}

/** H1 fragment for category listing pages, e.g. “STEM Scholarships” → “Becas STEM”. */
export function getLocalizedCategoryPageH1(
  categoryId: ScholarshipCategoryId | null,
  slugFallback: string,
  locale: LocalizedUiLocale
): string {
  const suffix = SCHOLARSHIPS_SUFFIX[locale];
  if (categoryId) {
    const heading =
      locale === 'es'
        ? CATEGORY_HEADING_ES[categoryId]
        : locale === 'fr'
          ? CATEGORY_HEADING_FR[categoryId]
          : SCHOLARSHIP_CATEGORY_PAGE_HEADING[categoryId];
    return locale === 'en'
      ? `${heading} ${suffix}`
      : `${suffix} ${heading}`;
  }
  const crumb = getLocalizedCategoryBreadcrumbLabel(slugFallback, locale);
  return locale === 'en' ? `${crumb} ${suffix}` : `${suffix} ${crumb}`;
}

/**
 * ISO 3166-1 alpha-2 country code → localized display name.
 * Internal codes and filter params are unchanged.
 */
export function getLocalizedCountryLabel(
  isoCode: string,
  locale: LocalizedUiLocale,
  fallback?: string
): string {
  const normalized = isoCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) {
    return fallback?.trim() || isoCode;
  }
  const label = regionDisplayNames(locale)?.of(normalized)?.trim();
  if (!label || label === normalized || label === 'Unknown Region') {
    return fallback?.trim() || normalized;
  }
  return label;
}

export type FilterLabelType =
  | 'category'
  | 'country'
  | 'education'
  | 'eligibility'
  | 'requirement'
  | 'easy_apply';

/**
 * Generic display helper for filter chips and summaries.
 * For `category` / `country`, uses taxonomy helpers; otherwise returns fallback (EN).
 */
export function getLocalizedFilterLabel(
  type: FilterLabelType,
  value: string,
  locale: LocalizedUiLocale,
  fallback: string
): string {
  if (locale === 'en') return fallback;
  if (type === 'category') return getLocalizedCategoryLabel(value, locale, fallback);
  if (type === 'country') return getLocalizedCountryLabel(value, locale, fallback);
  return fallback;
}
