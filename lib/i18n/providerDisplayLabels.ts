import type { LocalizedUiLocale } from '@/lib/i18n/localizedHref';
import type {
  ProviderDataCompleteness,
  ProviderSourceStatus
} from '@/lib/seo/providerSeoQualityPolicy';

export type ProviderCardUiCopy = {
  viewProfile: string;
  activeScholarship: string;
  activeScholarships: string;
  profileEnriched: string;
  notManuallyReviewed: string;
  profilePending: string;
  countriesDropdown: string;
};

const CARD_EN: ProviderCardUiCopy = {
  viewProfile: 'View Profile',
  activeScholarship: 'Active Scholarship',
  activeScholarships: 'Active Scholarships',
  profileEnriched: 'Profile enriched',
  notManuallyReviewed: 'Not manually reviewed',
  profilePending: 'Profile details will appear after enrichment.',
  countriesDropdown: 'Countries'
};

const CARD_ES: ProviderCardUiCopy = {
  viewProfile: 'Ver perfil',
  activeScholarship: 'Beca activa',
  activeScholarships: 'Becas activas',
  profileEnriched: 'Perfil enriquecido',
  notManuallyReviewed: 'Sin revisión manual',
  profilePending: 'Los detalles del perfil aparecerán tras el enriquecimiento.',
  countriesDropdown: 'Países'
};

const CARD_FR: ProviderCardUiCopy = {
  viewProfile: 'Voir le profil',
  activeScholarship: 'Bourse active',
  activeScholarships: 'Bourses actives',
  profileEnriched: 'Profil enrichi',
  notManuallyReviewed: 'Non revu manuellement',
  profilePending: 'Les détails du profil apparaîtront après enrichissement.',
  countriesDropdown: 'Pays'
};

export function getProviderCardUiCopy(locale: LocalizedUiLocale): ProviderCardUiCopy {
  if (locale === 'es') return CARD_ES;
  if (locale === 'fr') return CARD_FR;
  return CARD_EN;
}

const SOURCE_SHORT: Record<
  ProviderSourceStatus,
  Record<LocalizedUiLocale, string>
> = {
  official_source_available: {
    en: 'Official source available',
    es: 'Fuente oficial disponible',
    fr: 'Source officielle disponible'
  },
  source_needs_confirmation: {
    en: 'Source needs confirmation',
    es: 'Fuente por confirmar',
    fr: 'Source à confirmer'
  },
  missing_official_url: {
    en: 'Missing official URL',
    es: 'URL oficial ausente',
    fr: 'URL officielle manquante'
  }
};

const DATA_COMPLETENESS: Record<
  ProviderDataCompleteness,
  Record<LocalizedUiLocale, string>
> = {
  strong: {
    en: 'Data: strong',
    es: 'Datos: sólidos',
    fr: 'Données solides'
  },
  partial: {
    en: 'Data: partial',
    es: 'Datos: parciales',
    fr: 'Données partielles'
  },
  weak: {
    en: 'Data: weak',
    es: 'Datos: débiles',
    fr: 'Données faibles'
  }
};

/** Display-only; maps policy enum — not EN label passthrough. */
export function getLocalizedProviderSourceStatusLabel(
  status: ProviderSourceStatus,
  locale: LocalizedUiLocale
): string {
  return SOURCE_SHORT[status][locale];
}

export function getLocalizedProviderDataCompletenessLabel(
  value: ProviderDataCompleteness,
  locale: LocalizedUiLocale
): string {
  return DATA_COMPLETENESS[value][locale];
}

/** Scholarship card source short labels (from getScholarshipSourceStatus.shortLabel). */
const SCHOLARSHIP_SOURCE_SHORT: Record<string, Record<LocalizedUiLocale, string>> = {
  Verified: { en: 'Verified', es: 'Verificada', fr: 'Vérifiée' },
  'Source available': {
    en: 'Source available',
    es: 'Fuente disponible',
    fr: 'Source disponible'
  },
  'Needs check': {
    en: 'Needs check',
    es: 'Por verificar',
    fr: 'À vérifier'
  },
  'Source unclear': {
    en: 'Source unclear',
    es: 'Fuente poco clara',
    fr: 'Source peu claire'
  }
};

export function getLocalizedScholarshipSourceShortLabel(
  shortLabel: string,
  locale: LocalizedUiLocale
): string {
  if (locale === 'en') return shortLabel;
  return SCHOLARSHIP_SOURCE_SHORT[shortLabel]?.[locale] ?? shortLabel;
}

const DIFFICULTY_LEVEL: Record<string, Record<LocalizedUiLocale, string>> = {
  Easy: { en: 'Easy', es: 'Fácil', fr: 'Facile' },
  Medium: { en: 'Medium', es: 'Media', fr: 'Moyenne' },
  Hard: { en: 'Hard', es: 'Alta', fr: 'Élevée' },
  Unknown: { en: 'Unknown', es: 'Desconocido', fr: 'Inconnu' }
};

export function getLocalizedScholarshipDifficultyLevel(
  level: string,
  locale: LocalizedUiLocale
): string {
  if (locale === 'en') return level;
  return DIFFICULTY_LEVEL[level]?.[locale] ?? level;
};

const BEST_FOR_PHRASES: Record<string, Record<LocalizedUiLocale, string>> = {
  'International students': {
    en: 'International students',
    es: 'Estudiantes internacionales',
    fr: 'Étudiants internationaux'
  },
  'Students matching country rules': {
    en: 'Students matching country rules',
    es: 'Estudiantes que cumplen reglas de país',
    fr: 'Étudiants correspondant aux règles pays'
  },
  'Students who match the official eligibility rules': {
    en: 'Students who match the official eligibility rules',
    es: 'Estudiantes que cumplen las reglas de elegibilidad oficiales',
    fr: 'Étudiants correspondant aux règles d’éligibilité officielles'
  },
  'Graduate students': {
    en: 'Graduate students',
    es: 'Estudiantes de posgrado',
    fr: 'Étudiants diplômés'
  },
  'Undergraduate students': {
    en: 'Undergraduate students',
    es: 'Estudiantes de pregrado',
    fr: 'Étudiants de premier cycle'
  }
};

export function getLocalizedBestForPhrase(
  phrase: string,
  locale: LocalizedUiLocale
): string {
  if (locale === 'en') return phrase;
  const exact = BEST_FOR_PHRASES[phrase]?.[locale];
  if (exact) return exact;
  if (/\bstudents$/i.test(phrase)) {
    const head = phrase.replace(/\s+students\s*$/i, '').trim();
    const headEsFr =
      locale === 'es'
        ? head
        : head;
    void headEsFr;
  }
  return phrase;
}
