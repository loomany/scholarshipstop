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

/** Display-only chip labels on scholarship cards (keys from scholarshipCardChips). */
const CATALOG_CHIP_EN_TO_ES: Record<string, string> = {
  'No Essay': 'Sin ensayo',
  'Easy Apply': 'Solicitud fácil',
  'Quick Apply': 'Solicitud rápida',
  'Few Requirements': 'Pocos requisitos',
  Education: 'Educación',
  Graduate: 'Posgrado',
  Undergraduate: 'Pregrado',
  'High School': 'Secundaria',
  'High School Senior': 'Último año de secundaria',
  PhD: 'Doctorado',
  'Community College': 'Universidad comunitaria',
  'Trade School': 'Escuela técnica',
  Verified: 'Verificada',
  'Paid to school': 'Pago a la escuela',
  'Direct to student': 'Directo al estudiante',
  'Non-monetary': 'No monetario',
  'International Students': 'Estudiantes internacionales',
  Women: 'Mujeres',
  Minority: 'Minoría',
  Hispanic: 'Hispanos',
  'African American': 'Afroamericanos',
  'First-Generation': 'Primera generación',
  Disability: 'Discapacidad',
  Veterans: 'Veteranos',
  'LGBTQ+': 'LGBTQ+',
  'Single Parent': 'Madre/padre soltero/a',
  'Foster Youth': 'Jóvenes en acogida',
  'Native American': 'Nativos americanos',
  'Low Income': 'Bajos ingresos',
  'Financial Need': 'Necesidad económica'
};

const CATALOG_CHIP_EN_TO_FR: Record<string, string> = {
  'No Essay': 'Sans essai',
  'Easy Apply': 'Candidature facile',
  'Quick Apply': 'Candidature rapide',
  'Few Requirements': 'Peu d’exigences',
  Education: 'Éducation',
  Graduate: 'Études supérieures',
  Undergraduate: 'Premier cycle',
  'High School': 'Lycée',
  'High School Senior': 'Terminale',
  PhD: 'Doctorat',
  'Community College': 'Collège communautaire',
  'Trade School': 'École professionnelle',
  Verified: 'Vérifiée',
  'Paid to school': 'Versé à l’établissement',
  'Direct to student': 'Versé à l’étudiant',
  'Non-monetary': 'Non monétaire',
  'International Students': 'Étudiants internationaux',
  Women: 'Femmes',
  Minority: 'Minorités',
  Hispanic: 'Hispaniques',
  'African American': 'Afro-Américains',
  'First-Generation': 'Première génération',
  Disability: 'Handicap',
  Veterans: 'Vétérans',
  'LGBTQ+': 'LGBTQ+',
  'Single Parent': 'Parent seul',
  'Foster Youth': 'Jeunes placés',
  'Native American': 'Amérindiens',
  'Low Income': 'Faibles revenus',
  'Financial Need': 'Besoin financier'
};

export function getLocalizedCatalogChipLabel(
  chipKey: string,
  englishLabel: string,
  locale: LocalizedUiLocale
): string {
  if (locale === 'en') return englishLabel;
  if (chipKey.startsWith('cat:')) {
    const slug = chipKey.slice(4);
    return getLocalizedCategoryLabel(slug, locale, englishLabel);
  }
  const map = locale === 'es' ? CATALOG_CHIP_EN_TO_ES : CATALOG_CHIP_EN_TO_FR;
  return map[englishLabel] ?? englishLabel;
}

export type ResourceCategoryId =
  | 'finding-scholarships'
  | 'applications'
  | 'eligibility'
  | 'international-students'
  | 'deadlines-planning'
  | 'essays-writing'
  | 'financial-aid-funding'
  | 'student-types'
  | 'strategy-tips'
  | 'scams-safety'
  | 'success-stories';

const RESOURCE_CATEGORY_ES: Record<ResourceCategoryId, string> = {
  'finding-scholarships': 'Encontrar becas',
  applications: 'Solicitudes',
  eligibility: 'Elegibilidad',
  'international-students': 'Estudiantes internacionales',
  'deadlines-planning': 'Fechas límite y planificación',
  'essays-writing': 'Ensayos y redacción',
  'financial-aid-funding': 'Ayuda financiera',
  'student-types': 'Tipos de estudiante',
  'strategy-tips': 'Estrategia y consejos',
  'scams-safety': 'Estafas y seguridad',
  'success-stories': 'Historias de éxito'
};

const RESOURCE_CATEGORY_FR: Record<ResourceCategoryId, string> = {
  'finding-scholarships': 'Trouver des bourses',
  applications: 'Candidatures',
  eligibility: 'Éligibilité',
  'international-students': 'Étudiants internationaux',
  'deadlines-planning': 'Dates limites et planification',
  'essays-writing': 'Essais et rédaction',
  'financial-aid-funding': 'Aide financière',
  'student-types': 'Types d’étudiants',
  'strategy-tips': 'Stratégie et conseils',
  'scams-safety': 'Arnaques et sécurité',
  'success-stories': 'Réussites'
};

export function getLocalizedResourceCategoryLabel(
  categoryId: string,
  locale: LocalizedUiLocale,
  fallback: string
): string {
  if (locale === 'en') return fallback;
  const id = categoryId as ResourceCategoryId;
  if (locale === 'es' && RESOURCE_CATEGORY_ES[id]) return RESOURCE_CATEGORY_ES[id];
  if (locale === 'fr' && RESOURCE_CATEGORY_FR[id]) return RESOURCE_CATEGORY_FR[id];
  return fallback;
}

export type ResourcesToolbarUiCopy = {
  allTopics: string;
  clear: string;
  apply: string;
};

const RESOURCES_TOOLBAR: Record<LocalizedUiLocale, ResourcesToolbarUiCopy> = {
  en: { allTopics: 'All topics', clear: 'Clear', apply: 'Apply' },
  es: { allTopics: 'Todos los temas', clear: 'Limpiar', apply: 'Aplicar' },
  fr: { allTopics: 'Tous les sujets', clear: 'Effacer', apply: 'Appliquer' }
};

export function getResourcesToolbarUiCopy(
  locale: LocalizedUiLocale
): ResourcesToolbarUiCopy {
  return RESOURCES_TOOLBAR[locale];
}
