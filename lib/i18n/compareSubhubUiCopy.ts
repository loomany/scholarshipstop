import type { LocalizedUiLocale } from '@/lib/i18n/localizedHref';

export type CompareSubhubKind = 'universities' | 'states';

export type CompareSubhubUiCopy = {
  home: string;
  compareBreadcrumb: string;
  h1: string;
  intro: string;
  searchPlaceholder: string;
  resultLabel: string;
  emptyPublished: string;
  emptyFilters: string;
  categories: string;
};

const UNIVERSITIES_EN: CompareSubhubUiCopy = {
  home: 'Home',
  compareBreadcrumb: 'Compare',
  h1: 'University vs University',
  intro:
    'Explore published university-vs-university scholarship comparisons and scan matchup cards faster with search and sorting.',
  searchPlaceholder: 'Search University vs University',
  resultLabel: 'University vs University',
  emptyPublished: 'No published University vs University pages yet. Check back soon.',
  emptyFilters:
    'No University vs University matchups match your filters. Try clearing search.',
  categories: 'Categories'
};

const UNIVERSITIES_ES: CompareSubhubUiCopy = {
  home: 'Inicio',
  compareBreadcrumb: 'Comparar',
  h1: 'Universidad vs universidad',
  intro:
    'Explora comparaciones publicadas entre universidades y encuentra tarjetas más rápido con búsqueda y orden.',
  searchPlaceholder: 'Buscar universidad vs universidad',
  resultLabel: 'Universidad vs universidad',
  emptyPublished:
    'Aún no hay páginas Universidad vs universidad publicadas. Vuelve pronto.',
  emptyFilters:
    'Ningún enfrentamiento coincide con tus filtros. Prueba limpiar la búsqueda.',
  categories: 'Categorías'
};

const UNIVERSITIES_FR: CompareSubhubUiCopy = {
  home: 'Accueil',
  compareBreadcrumb: 'Comparer',
  h1: 'Université vs université',
  intro:
    'Explorez les comparaisons publiées entre universités et parcourez les cartes plus vite grâce à la recherche et au tri.',
  searchPlaceholder: 'Rechercher université vs université',
  resultLabel: 'Université vs université',
  emptyPublished:
    'Aucune page Université vs université publiée pour le moment. Revenez bientôt.',
  emptyFilters:
    'Aucun match ne correspond à vos filtres. Essayez d’effacer la recherche.',
  categories: 'Catégories'
};

const STATES_EN: CompareSubhubUiCopy = {
  home: 'Home',
  compareBreadcrumb: 'Compare',
  h1: 'State vs State',
  intro:
    'Browse published state-vs-state scholarship comparisons with searchable cards and quick sorting.',
  searchPlaceholder: 'Search State vs State',
  resultLabel: 'State vs State',
  emptyPublished: 'No published State vs State pages yet. Check back soon.',
  emptyFilters: 'No State vs State matchups match your filters. Try clearing search.',
  categories: 'Categories'
};

const STATES_ES: CompareSubhubUiCopy = {
  home: 'Inicio',
  compareBreadcrumb: 'Comparar',
  h1: 'Estado vs estado',
  intro:
    'Explora comparaciones publicadas entre estados y encuentra tarjetas más rápido con búsqueda y orden.',
  searchPlaceholder: 'Buscar estado vs estado',
  resultLabel: 'Estado vs estado',
  emptyPublished: 'Aún no hay páginas Estado vs estado publicadas. Vuelve pronto.',
  emptyFilters:
    'Ningún enfrentamiento coincide con tus filtros. Prueba limpiar la búsqueda.',
  categories: 'Categorías'
};

const STATES_FR: CompareSubhubUiCopy = {
  home: 'Accueil',
  compareBreadcrumb: 'Comparer',
  h1: 'État vs État',
  intro:
    'Parcourez les comparaisons publiées entre États avec recherche et tri rapides.',
  searchPlaceholder: 'Rechercher État vs État',
  resultLabel: 'État vs État',
  emptyPublished: 'Aucune page État vs État publiée pour le moment. Revenez bientôt.',
  emptyFilters:
    'Aucun match ne correspond à vos filtres. Essayez d’effacer la recherche.',
  categories: 'Catégories'
};

export function getCompareSubhubUiCopy(
  kind: CompareSubhubKind,
  locale: LocalizedUiLocale
): CompareSubhubUiCopy {
  if (kind === 'universities') {
    if (locale === 'es') return UNIVERSITIES_ES;
    if (locale === 'fr') return UNIVERSITIES_FR;
    return UNIVERSITIES_EN;
  }
  if (locale === 'es') return STATES_ES;
  if (locale === 'fr') return STATES_FR;
  return STATES_EN;
}
