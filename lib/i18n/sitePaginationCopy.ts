import type { LocalizedUiLocale } from '@/lib/i18n/localizedHref';

export type SitePaginationCopy = {
  previous: string;
  next: string;
  pageOf: (currentPage: number, totalPages: number) => string;
  ariaLabel: string;
  ariaLabelScholarships: string;
  ariaLabelArticles: string;
};

const EN: SitePaginationCopy = {
  previous: 'Previous',
  next: 'Next',
  pageOf: (currentPage, totalPages) => `Page ${currentPage} of ${totalPages}`,
  ariaLabel: 'Pagination',
  ariaLabelScholarships: 'Scholarship list pagination',
  ariaLabelArticles: 'Articles pagination'
};

const ES: SitePaginationCopy = {
  previous: 'Anterior',
  next: 'Siguiente',
  pageOf: (currentPage, totalPages) => `Página ${currentPage} de ${totalPages}`,
  ariaLabel: 'Paginación',
  ariaLabelScholarships: 'Paginación del listado de becas',
  ariaLabelArticles: 'Paginación de artículos'
};

const FR: SitePaginationCopy = {
  previous: 'Précédent',
  next: 'Suivant',
  pageOf: (currentPage, totalPages) => `Page ${currentPage} sur ${totalPages}`,
  ariaLabel: 'Pagination',
  ariaLabelScholarships: 'Pagination de la liste de bourses',
  ariaLabelArticles: 'Pagination des articles'
};

export function getSitePaginationCopy(locale: LocalizedUiLocale): SitePaginationCopy {
  if (locale === 'es') return ES;
  if (locale === 'fr') return FR;
  return EN;
}
