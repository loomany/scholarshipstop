import type { LocalizedUiLocale } from '@/lib/i18n/localizedHref';

export type CompareDetailUiCopy = {
  topProviders: {
    title: (stateName: string) => string;
    rankedSubtitle: string;
    viewAllScholarships: string;
    grantBadge: (count: number) => string;
    noData: string;
    sectionAriaLabel: string;
  };
  universityGrants: {
    heading: string;
    intro: string;
    viewAllFromUniversity: string;
    seeAllUniversityScholarships: string;
    topCountLabel: (count: number) => string;
  };
  scholarshipMatchCta: {
    sectionAriaLabel: string;
    heading: string;
    button: string;
  };
};

const EN: CompareDetailUiCopy = {
  topProviders: {
    title: (stateName) => `Top Scholarship Providers in ${stateName}`,
    rankedSubtitle: 'Ranked by number of active scholarships',
    viewAllScholarships: 'View all scholarships',
    grantBadge: (n) => `${n} grant${n === 1 ? '' : 's'}`,
    noData: 'No data available.',
    sectionAriaLabel: 'Top scholarship providers in each state'
  },
  universityGrants: {
    heading: 'Top grants by university',
    intro:
      'Largest active university-linked grants first. Each side shows the top three opportunities currently indexed for that school.',
    viewAllFromUniversity: 'View all scholarships from this university →',
    seeAllUniversityScholarships: 'See all university scholarships',
    topCountLabel: (count) => `Top ${count}`
  },
  scholarshipMatchCta: {
    sectionAriaLabel: 'Scholarship matches call to action',
    heading: 'Find scholarships that fit your profile',
    button: 'Find My Scholarships'
  }
};

const ES: CompareDetailUiCopy = {
  topProviders: {
    title: (stateName) => `Principales proveedores de becas en ${stateName}`,
    rankedSubtitle: 'Clasificados por número de becas activas',
    viewAllScholarships: 'Ver todas las becas',
    grantBadge: (n) => `${n} ${n === 1 ? 'beca' : 'becas'}`,
    noData: 'No hay datos disponibles.',
    sectionAriaLabel: 'Principales proveedores de becas en cada estado'
  },
  universityGrants: {
    heading: 'Principales becas por universidad',
    intro:
      'Primero las becas activas vinculadas a universidades con mayor importe. Cada lado muestra las tres mejores oportunidades indexadas para esa institución.',
    viewAllFromUniversity: 'Ver todas las becas de esta universidad →',
    seeAllUniversityScholarships: 'Ver todas las becas de la universidad',
    topCountLabel: (count) => `Top ${count}`
  },
  scholarshipMatchCta: {
    sectionAriaLabel: 'Llamada a la acción para encontrar becas',
    heading: 'Encuentra becas en 2 minutos',
    button: 'Encontrar mis becas'
  }
};

const FR: CompareDetailUiCopy = {
  topProviders: {
    title: (stateName) => `Principaux fournisseurs de bourses en ${stateName}`,
    rankedSubtitle: 'Classés par nombre de bourses actives',
    viewAllScholarships: 'Voir toutes les bourses',
    grantBadge: (n) => `${n} ${n === 1 ? 'bourse' : 'bourses'}`,
    noData: 'Aucune donnée disponible.',
    sectionAriaLabel: 'Principaux fournisseurs de bourses dans chaque État'
  },
  universityGrants: {
    heading: 'Principales bourses par université',
    intro:
      'Les plus grandes bourses actives liées à une université en premier. Chaque côté affiche les trois meilleures opportunités indexées pour cet établissement.',
    viewAllFromUniversity: 'Voir toutes les bourses de cette université →',
    seeAllUniversityScholarships: 'Voir toutes les bourses de l’université',
    topCountLabel: (count) => `Top ${count}`
  },
  scholarshipMatchCta: {
    sectionAriaLabel: 'Appel à l’action pour trouver des bourses',
    heading: 'Trouvez des bourses en 2 minutes',
    button: 'Trouver mes bourses'
  }
};

export function getCompareDetailUiCopy(
  locale: LocalizedUiLocale
): CompareDetailUiCopy {
  if (locale === 'es') return ES;
  if (locale === 'fr') return FR;
  return EN;
}

export function formatCompareGrantBadge(
  raw: unknown,
  locale: LocalizedUiLocale
): string {
  if (typeof raw !== 'number' || Number.isNaN(raw)) return '—';
  return getCompareDetailUiCopy(locale).topProviders.grantBadge(
    Math.round(raw)
  );
}
