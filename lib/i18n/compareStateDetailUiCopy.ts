import type { LocalizedUiLocale } from '@/lib/i18n/localizedHref';

export type CompareStateDetailUiCopy = {
  noData: string;
  backToHub: string;
  breadcrumbAria: string;
  home: string;
  compare: string;
  stateHub: string;
  pageTitle: (stateA: string, stateB: string, year: number) => string;
  verdictLead: string;
  badgeStateVsState: string;
  institutionA: string;
  institutionB: string;
  quickComparison: string;
  tableMetric: string;
  tableActiveScholarships: string;
  tableAvgAward: string;
  tableMaxAward: string;
  climateHeading: string;
  sourcesHeading: string;
  sourcesIntro: string;
  sourceOfficial: string;
  sourceGovernment: string;
  sourceAuthority: string;
  relatedHeading: string;
  relatedIntro: (stateA: string, stateB: string) => string;
  relatedResourcesSub: string;
  relatedEssaysSub: string;
  tocOnThisPage: string;
  tocTopProviders: string;
  tocFaq: string;
  faqHeading: string;
  thinVerdictHeading: string;
  exploreHeading: string;
  exploreIntro: string;
  exploreMatches: string;
  exploreInternational: string;
  exploreEasyApply: string;
  exploreEssaysLink: string;
  exploreResourcesLink: string;
  iqCta: {
    featuredTool: string;
    badge: string;
    title: string;
    body: (stateA: string, stateB: string) => string;
    chips: [string, string, string, string];
    previewReport: string;
    iqLabel: string;
    typeLabel: string;
    profileLabel: string;
    startTest: string;
  };
};

const EN: CompareStateDetailUiCopy = {
  noData: 'No data available',
  backToHub: '← Back to State vs State',
  breadcrumbAria: 'Breadcrumb',
  home: 'Home',
  compare: 'Compare',
  stateHub: 'State vs State',
  pageTitle: (a, b, year) => `${a} vs ${b}: Scholarship Climate ${year}`,
  verdictLead: 'Which climate fits best? ',
  badgeStateVsState: 'State vs State',
  institutionA: 'State A',
  institutionB: 'State B',
  quickComparison: 'Quick comparison',
  tableMetric: 'Metric',
  tableActiveScholarships: 'Active scholarships in catalog',
  tableAvgAward: 'Avg. award (where known)',
  tableMaxAward: 'Max indexed award',
  climateHeading: 'Scholarship climate by state',
  sourcesHeading: 'Sources and official pages',
  sourcesIntro:
    'Official and high-authority pages used to support this State vs State comparison.',
  sourceOfficial: 'official source',
  sourceGovernment: 'government reference',
  sourceAuthority: 'high-authority reference',
  relatedHeading: 'More guides around this State vs State comparison',
  relatedIntro: (a, b) =>
    `Internal reading paths around scholarship search, application strategy, and essay preparation for students comparing ${a} and ${b}.`,
  relatedResourcesSub: 'Related scholarship articles',
  relatedEssaysSub: 'Related essay guides',
  tocOnThisPage: 'On this page',
  tocTopProviders: 'Top scholarship providers',
  tocFaq: 'FAQ',
  faqHeading: 'FAQ',
  thinVerdictHeading: 'Final verdict explanation',
  exploreHeading: 'Explore related scholarships',
  exploreIntro:
    'Continue from this comparison into ScholarshipTop hubs tuned for discovery speed, visas, and lighter-touch applications—then deepen planning with evergreen essays and resource articles when you need narrative or policy context.',
  exploreMatches: 'Recommended matches browsing',
  exploreInternational: 'International-friendly spotlight',
  exploreEasyApply: 'Easier applications & streamlined forms',
  exploreEssaysLink: 'Scholarship Essay Guides',
  exploreResourcesLink: 'Scholarship Resources',
  iqCta: {
    featuredTool: 'Featured Tool',
    badge: 'Market fit',
    title: 'Which scholarship market fits your thinking style?',
    body: (a, b) =>
      `Before comparing ${a} and ${b}, take a comprehensive cognitive assessment to see how your logic, speed, and pattern recognition shape the way you evaluate scholarship opportunities.`,
    chips: ['Logic', 'Speed', 'Patterns', 'Strategy'],
    previewReport: 'Preview report',
    iqLabel: 'IQ',
    typeLabel: 'Type',
    profileLabel: 'Profile',
    startTest: 'Start IQ Test'
  }
};

const ES: CompareStateDetailUiCopy = {
  noData: 'No hay datos disponibles',
  backToHub: '← Volver a Estado vs estado',
  breadcrumbAria: 'Ruta de navegación',
  home: 'Inicio',
  compare: 'Comparar',
  stateHub: 'Estado vs estado',
  pageTitle: (a, b, year) => `${a} vs ${b}: clima de becas ${year}`,
  verdictLead: '¿Qué clima encaja mejor? ',
  badgeStateVsState: 'Estado vs estado',
  institutionA: 'Estado A',
  institutionB: 'Estado B',
  quickComparison: 'Comparación rápida',
  tableMetric: 'Métrica',
  tableActiveScholarships: 'Becas activas en el catálogo',
  tableAvgAward: 'Beca media (cuando se conoce)',
  tableMaxAward: 'Beca máxima indexada',
  climateHeading: 'Clima de becas por estado',
  sourcesHeading: 'Fuentes y páginas oficiales',
  sourcesIntro:
    'Páginas oficiales y de alta autoridad que respaldan esta comparación entre estados.',
  sourceOfficial: 'fuente oficial',
  sourceGovernment: 'referencia gubernamental',
  sourceAuthority: 'referencia de alta autoridad',
  relatedHeading: 'Más guías sobre esta comparación entre estados',
  relatedIntro: (a, b) =>
    `Rutas de lectura sobre búsqueda de becas, estrategia de solicitud y redacción para estudiantes que comparan ${a} y ${b}.`,
  relatedResourcesSub: 'Artículos relacionados sobre becas',
  relatedEssaysSub: 'Guías de ensayos relacionadas',
  tocOnThisPage: 'En esta página',
  tocTopProviders: 'Principales proveedores de becas',
  tocFaq: 'Preguntas frecuentes',
  faqHeading: 'Preguntas frecuentes',
  thinVerdictHeading: 'Explicación del veredicto final',
  exploreHeading: 'Explorar becas relacionadas',
  exploreIntro:
    'Sigue desde esta comparación hacia los hubs de ScholarshipTop para descubrir becas, visados y solicitudes más sencillas; profundiza con guías de ensayos y recursos cuando necesites contexto.',
  exploreMatches: 'Explorar coincidencias recomendadas',
  exploreInternational: 'Becas favorables a estudiantes internacionales',
  exploreEasyApply: 'Solicitudes más sencillas',
  exploreEssaysLink: 'Guías de ensayos para becas',
  exploreResourcesLink: 'Recursos de becas',
  iqCta: {
    featuredTool: 'Herramienta destacada',
    badge: 'Encaje de mercado',
    title: '¿Qué mercado de becas encaja con tu forma de pensar?',
    body: (a, b) =>
      `Antes de comparar ${a} y ${b}, realiza una evaluación cognitiva para ver cómo tu lógica, velocidad y reconocimiento de patrones influyen en cómo evalúas las becas.`,
    chips: ['Lógica', 'Velocidad', 'Patrones', 'Estrategia'],
    previewReport: 'Vista previa del informe',
    iqLabel: 'CI',
    typeLabel: 'Tipo',
    profileLabel: 'Perfil',
    startTest: 'Iniciar test de CI'
  }
};

const FR: CompareStateDetailUiCopy = {
  noData: 'Aucune donnée disponible',
  backToHub: '← Retour à État vs État',
  breadcrumbAria: "Fil d'Ariane",
  home: 'Accueil',
  compare: 'Comparer',
  stateHub: 'État vs État',
  pageTitle: (a, b, year) => `${a} vs ${b} : climat des bourses ${year}`,
  verdictLead: 'Quel climat convient le mieux ? ',
  badgeStateVsState: 'État vs État',
  institutionA: 'État A',
  institutionB: 'État B',
  quickComparison: 'Comparaison rapide',
  tableMetric: 'Indicateur',
  tableActiveScholarships: 'Bourses actives dans le catalogue',
  tableAvgAward: 'Montant moyen (si connu)',
  tableMaxAward: 'Bourse max. indexée',
  climateHeading: 'Climat des bourses par État',
  sourcesHeading: 'Sources et pages officielles',
  sourcesIntro:
    'Pages officielles et de haute autorité utilisées pour cette comparaison entre États.',
  sourceOfficial: 'source officielle',
  sourceGovernment: 'référence gouvernementale',
  sourceAuthority: 'référence de haute autorité',
  relatedHeading: 'Plus de guides autour de cette comparaison',
  relatedIntro: (a, b) =>
    `Parcours de lecture sur la recherche de bourses, la candidature et les essais pour les étudiants comparant ${a} et ${b}.`,
  relatedResourcesSub: 'Articles sur les bourses',
  relatedEssaysSub: "Guides d'essais associés",
  tocOnThisPage: 'Sur cette page',
  tocTopProviders: 'Principaux fournisseurs de bourses',
  tocFaq: 'FAQ',
  faqHeading: 'FAQ',
  thinVerdictHeading: 'Explication du verdict final',
  exploreHeading: 'Explorer les bourses associées',
  exploreIntro:
    'Poursuivez depuis cette comparaison vers les hubs ScholarshipTop (découverte, visas, candidatures simplifiées), puis les guides d’essais et ressources pour le contexte.',
  exploreMatches: 'Parcourir les correspondances recommandées',
  exploreInternational: 'Bourses favorables aux étudiants internationaux',
  exploreEasyApply: 'Candidatures plus simples',
  exploreEssaysLink: 'Guides de rédaction de bourses',
  exploreResourcesLink: 'Ressources bourses',
  iqCta: {
    featuredTool: 'Outil en vedette',
    badge: 'Adéquation marché',
    title: 'Quel marché de bourses correspond à votre profil cognitif ?',
    body: (a, b) =>
      `Avant de comparer ${a} et ${b}, passez une évaluation cognitive pour voir comment votre logique, vitesse et reconnaissance de formes orientent votre recherche de bourses.`,
    chips: ['Logique', 'Vitesse', 'Modèles', 'Stratégie'],
    previewReport: 'Aperçu du rapport',
    iqLabel: 'QI',
    typeLabel: 'Type',
    profileLabel: 'Profil',
    startTest: 'Lancer le test QI'
  }
};

export function getCompareStateDetailUiCopy(
  locale: LocalizedUiLocale
): CompareStateDetailUiCopy {
  if (locale === 'es') return ES;
  if (locale === 'fr') return FR;
  return EN;
}
