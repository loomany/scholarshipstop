import type { LocalizedUiLocale } from '@/lib/i18n/localizedHref';

export type CompareUniversityDetailUiCopy = {
  noData: string;
  backToHub: string;
  breadcrumbAria: string;
  home: string;
  compare: string;
  universityHub: string;
  whoIsItFor: string;
  badgeUniversityVsUniversity: string;
  institutionA: string;
  institutionB: string;
  quickComparison: string;
  tableMetric: string;
  tableScholarshipsInCatalog: string;
  tableAvgAward: string;
  tableMaxAward: string;
  tableOpenDeadlinesShare: string;
  tableMeritVsNeed: string;
  meritNeedCell: (merit: string, need: string) => string;
  writingEfforts: string;
  sourcesHeading: string;
  sourcesIntro: string;
  sourceOfficial: string;
  sourceGovernment: string;
  sourceAuthority: string;
  relatedHeading: string;
  relatedIntro: (instA: string, instB: string) => string;
  relatedResourcesSub: string;
  relatedEssaysSub: string;
  tocOnThisPage: string;
  tocWritingEfforts: string;
  tocStateBattle: string;
  tocFaq: string;
  faqHeading: string;
  thinVerdictHeading: string;
  stateBattleHeading: string;
  stateBattleBodyBefore: string;
  stateBattleLink: (stateA: string, stateB: string) => string;
  stateBattleBodyAfter: string;
  metaDescriptionFallback: (instA: string, instB: string) => string;
  iqCta: {
    featuredTool: string;
    badge: string;
    title: string;
    body: (instA: string, instB: string) => string;
    chips: [string, string, string, string];
    previewReport: string;
    iqLabel: string;
    typeLabel: string;
    profileLabel: string;
    startTest: string;
  };
};

const EN: CompareUniversityDetailUiCopy = {
  noData: 'No data available',
  backToHub: '← Back to University vs University',
  breadcrumbAria: 'Breadcrumb',
  home: 'Home',
  compare: 'Compare',
  universityHub: 'University vs University',
  whoIsItFor: 'Who is it for? ',
  badgeUniversityVsUniversity: 'University vs University',
  institutionA: 'Institution A',
  institutionB: 'Institution B',
  quickComparison: 'Quick comparison',
  tableMetric: 'Metric',
  tableScholarshipsInCatalog: 'Scholarships in catalog',
  tableAvgAward: 'Avg. award (where known)',
  tableMaxAward: 'Max award (index signal)',
  tableOpenDeadlinesShare: 'Open deadlines share',
  tableMeritVsNeed: 'Merit vs need (approx.)',
  meritNeedCell: (merit, need) => `Merit ${merit} / Need ${need}`,
  writingEfforts: 'Writing efforts',
  sourcesHeading: 'Sources and official pages',
  sourcesIntro:
    'Official university and high-authority pages used to support this comparison.',
  sourceOfficial: 'official university source',
  sourceGovernment: 'government reference',
  sourceAuthority: 'high-authority reference',
  relatedHeading: 'More guides around this comparison',
  relatedIntro: (a, b) =>
    `Internal reading paths for students comparing ${a} and ${b}, with extra scholarship context and essay-writing support.`,
  relatedResourcesSub: 'Related scholarship articles',
  relatedEssaysSub: 'Related essay guides',
  tocOnThisPage: 'On this page',
  tocWritingEfforts: 'Writing efforts',
  tocStateBattle: 'Not sure about the location?',
  tocFaq: 'FAQ',
  faqHeading: 'FAQ',
  thinVerdictHeading: 'Final verdict explanation',
  stateBattleHeading: 'Not sure about the location?',
  stateBattleBodyBefore: 'Compare ',
  stateBattleLink: (a, b) => `${a} vs ${b} scholarship markets`,
  stateBattleBodyAfter:
    ' to see how the broader state climate changes the funding picture.',
  metaDescriptionFallback: (a, b) =>
    `Compare scholarships and aid signals for ${a} and ${b}.`,
  iqCta: {
    featuredTool: 'Featured Tool',
    badge: 'Decision fit',
    title: 'Which college fits the way you think?',
    body: (a, b) =>
      `Before choosing between ${a} and ${b}, take a comprehensive cognitive assessment to see how your logic, speed, and pattern recognition shape your scholarship strategy.`,
    chips: ['Logic', 'Speed', 'Patterns', 'Strategy'],
    previewReport: 'Preview report',
    iqLabel: 'IQ',
    typeLabel: 'Type',
    profileLabel: 'Profile',
    startTest: 'Start IQ Test'
  }
};

const ES: CompareUniversityDetailUiCopy = {
  noData: 'No hay datos disponibles',
  backToHub: '← Volver a Universidad vs universidad',
  breadcrumbAria: 'Ruta de navegación',
  home: 'Inicio',
  compare: 'Comparar',
  universityHub: 'Universidad vs universidad',
  whoIsItFor: '¿Para quién es? ',
  badgeUniversityVsUniversity: 'Universidad vs universidad',
  institutionA: 'Institución A',
  institutionB: 'Institución B',
  quickComparison: 'Comparación rápida',
  tableMetric: 'Métrica',
  tableScholarshipsInCatalog: 'Becas en el catálogo',
  tableAvgAward: 'Beca media (cuando se conoce)',
  tableMaxAward: 'Beca máxima (señal del índice)',
  tableOpenDeadlinesShare: 'Cuota de plazos abiertos',
  tableMeritVsNeed: 'Mérito vs necesidad (aprox.)',
  meritNeedCell: (merit, need) => `Mérito ${merit} / Necesidad ${need}`,
  writingEfforts: 'Esfuerzo de redacción',
  sourcesHeading: 'Fuentes y páginas oficiales',
  sourcesIntro:
    'Páginas oficiales universitarias y de alta autoridad que respaldan esta comparación.',
  sourceOfficial: 'fuente universitaria oficial',
  sourceGovernment: 'referencia gubernamental',
  sourceAuthority: 'referencia de alta autoridad',
  relatedHeading: 'Más guías sobre esta comparación',
  relatedIntro: (a, b) =>
    `Rutas de lectura para estudiantes que comparan ${a} y ${b}, con contexto de becas y apoyo en ensayos.`,
  relatedResourcesSub: 'Artículos relacionados sobre becas',
  relatedEssaysSub: 'Guías de ensayos relacionadas',
  tocOnThisPage: 'En esta página',
  tocWritingEfforts: 'Esfuerzo de redacción',
  tocStateBattle: '¿No estás seguro de la ubicación?',
  tocFaq: 'Preguntas frecuentes',
  faqHeading: 'Preguntas frecuentes',
  thinVerdictHeading: 'Explicación del veredicto final',
  stateBattleHeading: '¿No estás seguro de la ubicación?',
  stateBattleBodyBefore: 'Compara ',
  stateBattleLink: (a, b) => `los mercados de becas de ${a} y ${b}`,
  stateBattleBodyAfter:
    ' para ver cómo el clima estatal amplía el panorama de financiación.',
  metaDescriptionFallback: (a, b) =>
    `Compara becas y señales de ayuda para ${a} y ${b}.`,
  iqCta: {
    featuredTool: 'Herramienta destacada',
    badge: 'Encaje de decisión',
    title: '¿Qué universidad encaja con tu forma de pensar?',
    body: (a, b) =>
      `Antes de elegir entre ${a} y ${b}, realiza una evaluación cognitiva para ver cómo tu lógica, velocidad y reconocimiento de patrones moldean tu estrategia de becas.`,
    chips: ['Lógica', 'Velocidad', 'Patrones', 'Estrategia'],
    previewReport: 'Vista previa del informe',
    iqLabel: 'CI',
    typeLabel: 'Tipo',
    profileLabel: 'Perfil',
    startTest: 'Iniciar test de CI'
  }
};

const FR: CompareUniversityDetailUiCopy = {
  noData: 'Aucune donnée disponible',
  backToHub: '← Retour à Université vs université',
  breadcrumbAria: "Fil d'Ariane",
  home: 'Accueil',
  compare: 'Comparer',
  universityHub: 'Université vs université',
  whoIsItFor: 'Pour qui est-ce ? ',
  badgeUniversityVsUniversity: 'Université vs université',
  institutionA: 'Établissement A',
  institutionB: 'Établissement B',
  quickComparison: 'Comparaison rapide',
  tableMetric: 'Indicateur',
  tableScholarshipsInCatalog: 'Bourses dans le catalogue',
  tableAvgAward: 'Montant moyen (si connu)',
  tableMaxAward: 'Bourse max. (signal d’index)',
  tableOpenDeadlinesShare: 'Part des dates limites ouvertes',
  tableMeritVsNeed: 'Mérite vs besoin (approx.)',
  meritNeedCell: (merit, need) => `Mérite ${merit} / Besoin ${need}`,
  writingEfforts: 'Efforts de rédaction',
  sourcesHeading: 'Sources et pages officielles',
  sourcesIntro:
    'Pages officielles universitaires et de haute autorité utilisées pour cette comparaison.',
  sourceOfficial: 'source universitaire officielle',
  sourceGovernment: 'référence gouvernementale',
  sourceAuthority: 'référence de haute autorité',
  relatedHeading: 'Plus de guides autour de cette comparaison',
  relatedIntro: (a, b) =>
    `Parcours de lecture pour les étudiants comparant ${a} et ${b}, avec contexte sur les bourses et l’aide à la rédaction.`,
  relatedResourcesSub: 'Articles sur les bourses',
  relatedEssaysSub: "Guides d'essais associés",
  tocOnThisPage: 'Sur cette page',
  tocWritingEfforts: 'Efforts de rédaction',
  tocStateBattle: 'Pas sûr de l’emplacement ?',
  tocFaq: 'FAQ',
  faqHeading: 'FAQ',
  thinVerdictHeading: 'Explication du verdict final',
  stateBattleHeading: 'Pas sûr de l’emplacement ?',
  stateBattleBodyBefore: 'Comparez ',
  stateBattleLink: (a, b) => `les marchés de bourses ${a} vs ${b}`,
  stateBattleBodyAfter:
    ' pour voir comment le climat régional modifie le tableau du financement.',
  metaDescriptionFallback: (a, b) =>
    `Comparez les bourses et signaux d’aide pour ${a} et ${b}.`,
  iqCta: {
    featuredTool: 'Outil en vedette',
    badge: 'Adéquation décision',
    title: 'Quelle université correspond à votre façon de penser ?',
    body: (a, b) =>
      `Avant de choisir entre ${a} et ${b}, passez une évaluation cognitive pour voir comment votre logique, vitesse et reconnaissance de formes orientent votre stratégie de bourses.`,
    chips: ['Logique', 'Vitesse', 'Modèles', 'Stratégie'],
    previewReport: 'Aperçu du rapport',
    iqLabel: 'QI',
    typeLabel: 'Type',
    profileLabel: 'Profil',
    startTest: 'Lancer le test QI'
  }
};

export function getCompareUniversityDetailUiCopy(
  locale: LocalizedUiLocale
): CompareUniversityDetailUiCopy {
  if (locale === 'es') return ES;
  if (locale === 'fr') return FR;
  return EN;
}
