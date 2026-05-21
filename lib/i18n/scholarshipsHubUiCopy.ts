import type { ScholarshipHubCanonicalSeoSlug } from '@/app/scholarships/scholarshipHubCanonicalSeoContent';
import type { SortOption } from '@/app/scholarships/scholarshipSort';
import type { ScholarshipListTabId } from '@/app/scholarships/scholarshipTabs';
import type { LocalizedUiLocale } from '@/lib/i18n/localizedHref';

export type ScholarshipsHubUiCopy = {
  defaultPageTitle: string;
  internationalStudentsPageTitle: string;
  pageTitles: Record<ScholarshipListTabId, string>;
  loadingText: Record<ScholarshipListTabId, string>;
  searchByKeyword: string;
  searchByKeywordAria: string;
  sortLabel: string;
  sortOptionsAria: string;
  filters: string;
  filtersAria: string;
  categories: string;
  searchCategories: string;
  applyCategories: string;
  clearCategories: string;
  imFrom: string;
  imFromTitle: string;
  studyIn: string;
  studyInTitle: string;
  searchCountry: string;
  searchCountries: string;
  apply: string;
  clear: string;
  showingRange: (from: number, to: number, total: number, unit: string) => string;
  foundCount: (count: number, unit: string) => string;
  foundZero: (unit: string) => string;
  clearAll: string;
  savedFiltersDefault: string;
  notSpecified: string;
  filterByCategoryAria: string;
  categoriesPanelIncludeOnly: string;
  restoreToMatches: string;
  loadingCountAria: string;
  sortOptions: { value: SortOption; label: string }[];
  sortTriggerLabels: Record<SortOption, string>;
  listingResultUnit: (tab: ScholarshipListTabId | undefined, plural: boolean) => string;
  card: {
    save: string;
    saved: string;
    removeFromSavedAria: string;
    saveScholarshipAria: string;
    notRelevant: string;
    restoreToMatches: string;
    badgeNew: string;
    badgeNewAria: string;
    awardAmountLabel: string;
    requirementsLabel: string;
    requirementsNone: string;
    requirementsOne: string;
    requirementsMany: (count: number) => string;
    requirementsSummaryZero: string;
    requirementsSummaryListed: (count: number) => string;
    bestForPrefix: string;
    effortPrefix: string;
    sourcePrefix: string;
    hostNotSpecified: string;
    hostNotSpecifiedTitle: string;
    studyInPrefix: string;
    studyInMulti: (count: number) => string;
    intelligenceAria: string;
    bestForBadgeTitle: string;
    unlockAwardAria: string;
  };
  tryEssayMentor: string;
  inlineIq: {
    startIqAria: string;
    featuredTool: string;
    iqAssessment: string;
    title: string;
    body: string;
    logic: string;
    spatial: string;
    speed: string;
    preview: string;
    type: string;
    strategyUnlocked: string;
    startIqTest: string;
  };
  sidebar: {
    myScholarships: string;
    scholarshipCategoriesNavAria: string;
    bestRecommendation: string;
    easyApply: string;
    easyApplyTooltip: string;
    hotDeadlines: string;
    hotDeadlinesTooltip: string;
    matches: string;
    matchesTooltip: string;
    saved: string;
    savedTooltip: string;
    ignored: string;
    ignoredTooltip: string;
    internationalFriendly: string;
    internationalFriendlyTooltip: string;
    guestUnlock: string;
    guestUnlockShort: string;
    internationalFriendlyActivate: string;
    internationalFriendlyShowAria: string;
    internationalFriendlyOnAria: string;
    subscriptionUnlockShort: string;
    matchesNewIndicatorTitle: (count: number) => string;
    matchesNewIndicatorAria: (count: number) => string;
  };
  continueSearch: {
    heading: string;
    subtitle: string;
    exploringHeading: string;
    exploringSubtitle: string;
    explore: string;
    resourcesTitle: string;
    resourcesBody: string;
    essaysTitle: string;
    essaysBody: string;
    providersTitle: string;
    providersBody: string;
    compareTitle: string;
    compareBody: string;
    easyApplyTitle: string;
    easyApplyBody: string;
    internationalTitle: string;
    internationalBody: string;
  };
  hubCanonicalIntro: Record<ScholarshipHubCanonicalSeoSlug, string>;
  guestExploreRecommendedTitle: string;
  guestExploreTopTitle: string;
};

const EN: ScholarshipsHubUiCopy = {
  defaultPageTitle: 'Scholarship matches',
  internationalStudentsPageTitle: 'Scholarships for international students',
  pageTitles: {
    'best-recommendation': 'Best recommendations',
    recommended: 'Saved filters',
    'easy-apply': 'Easy apply scholarships',
    'hot-deadlines': 'Hot deadlines',
    'from-email': 'From email',
    matches: 'Scholarship matches',
    saved: 'Saved scholarships',
    started: 'Started applications',
    submitted: 'Submitted applications',
    ignored: 'Ignored scholarships'
  },
  loadingText: {
    'best-recommendation': 'Loading best recommendations…',
    recommended: 'Loading saved filters…',
    'easy-apply': 'Loading easy apply…',
    'hot-deadlines': 'Loading hot deadlines…',
    'from-email': 'Loading grants from email…',
    matches: 'Loading matches…',
    saved: 'Loading saved…',
    started: 'Loading started…',
    submitted: 'Loading submitted…',
    ignored: 'Loading ignored…'
  },
  searchByKeyword: 'Search by keyword',
  searchByKeywordAria: 'Search by keyword',
  sortLabel: 'Sort:',
  sortOptionsAria: 'Sort options',
  filters: 'Filters',
  filtersAria: 'Open more filters',
  categories: 'Categories',
  searchCategories: 'Search categories',
  applyCategories: 'Apply',
  clearCategories: 'Clear',
  imFrom: "I'm from",
  imFromTitle: 'I am from (citizenship / home country)',
  studyIn: 'Study in',
  studyInTitle: 'Study in (program location)',
  searchCountry: 'Search by country name',
  searchCountries: 'Search countries',
  apply: 'Apply',
  clear: 'Clear',
  showingRange: (from, to, total, unit) =>
    `Showing ${from}–${to} of ${total} ${unit}`,
  foundCount: (count, unit) => `Found ${count} ${unit}`,
  foundZero: (unit) => `Found 0 ${unit}`,
  clearAll: 'Clear all',
  savedFiltersDefault: 'Saved filters',
  notSpecified: 'Not specified',
  filterByCategoryAria: 'Filter by category',
  categoriesPanelIncludeOnly: 'Include only selected categories in the list.',
  restoreToMatches: 'Restore to matches',
  loadingCountAria: 'Loading scholarship count',
  sortOptions: [
    { value: 'magic', label: 'Recommended' },
    { value: 'most_recent', label: 'Newest' },
    { value: 'closest_deadline', label: 'Deadline soonest' },
    { value: 'highest_amount', label: 'Amount high → low' },
    { value: 'verified_first', label: 'Verified first' },
    { value: 'least_requirements', label: 'Fewest requirements' },
    { value: 'fewest_applicants', label: 'Least applicants' }
  ],
  sortTriggerLabels: {
    best_match: 'Recommended',
    best_recommendation: 'Recommended',
    most_recent: 'Newest',
    closest_deadline: 'Deadline soonest',
    highest_amount: 'Amount high → low',
    magic: 'Recommended',
    lowest_amount: 'Recommended',
    least_requirements: 'Fewest requirements',
    fewest_applicants: 'Least applicants',
    verified_first: 'Verified first'
  },
  listingResultUnit: (tab, plural) => {
    switch (tab) {
      case 'saved':
        return plural ? 'saved scholarships' : 'saved scholarship';
      case 'started':
        return plural ? 'started applications' : 'started application';
      case 'submitted':
        return plural ? 'submitted applications' : 'submitted application';
      case 'ignored':
        return plural ? 'ignored scholarships' : 'ignored scholarship';
      default:
        return plural ? 'scholarships' : 'scholarship';
    }
  },
  card: {
    save: 'Save',
    saved: 'Saved ✓',
    removeFromSavedAria: 'Remove from saved',
    saveScholarshipAria: 'Save scholarship',
    notRelevant: 'Not relevant',
    restoreToMatches: 'Restore to matches',
    badgeNew: 'NEW',
    badgeNewAria: 'New - not opened yet',
    awardAmountLabel: 'Award Amount',
    requirementsLabel: 'Requirements',
    requirementsNone: 'None',
    requirementsOne: '1 requirement',
    requirementsMany: (count) => `${count} requirements`,
    requirementsSummaryZero: '0 requirements: No requirements',
    requirementsSummaryListed: (count) =>
      `${count} requirement${count === 1 ? '' : 's'}: Listed in detail`,
    bestForPrefix: 'Best for:',
    effortPrefix: 'Effort:',
    sourcePrefix: 'Source:',
    hostNotSpecified: 'Host: Not specified',
    hostNotSpecifiedTitle:
      'Host/program location is not specified in the source data yet.',
    studyInPrefix: 'Study in:',
    studyInMulti: (count) => `Study in: ${count} countries`,
    intelligenceAria: 'ScholarshipTop listing intelligence',
    bestForBadgeTitle: 'ScholarshipTop best-fit signal from listing facts',
    unlockAwardAria: 'Unlock award and deadline with a free account or plan'
  },
  tryEssayMentor: 'Try Essay Mentor',
  inlineIq: {
    startIqAria: 'Start IQ test',
    featuredTool: 'Featured Tool',
    iqAssessment: 'IQ assessment',
    title: 'Find scholarships that fit how you think',
    body: 'See whether your strengths point toward essays, research-heavy awards, fast applications, or logic-based opportunities.',
    logic: 'Logic',
    spatial: 'Spatial',
    speed: 'Speed',
    preview: 'Preview',
    type: 'Type',
    strategyUnlocked: 'Scholarship strategy unlocked',
    startIqTest: 'Start IQ test'
  },
  sidebar: {
    myScholarships: 'My scholarships',
    scholarshipCategoriesNavAria: 'Scholarship categories',
    bestRecommendation: 'Best recommendation',
    easyApply: 'Easy apply',
    easyApplyTooltip: 'Scholarships with lighter application effort.',
    hotDeadlines: 'Hot Deadlines',
    hotDeadlinesTooltip:
      'Deadlines in the next week — under 1 day or 1–7 days out.',
    matches: 'Matches',
    matchesTooltip: 'Scholarships that match your criteria.',
    saved: 'Saved',
    savedTooltip: 'Scholarships you have saved.',
    ignored: 'Ignored',
    ignoredTooltip: 'Scholarships you chose to hide.',
    internationalFriendly: 'International Friendly',
    internationalFriendlyTooltip:
      'Scholarships tagged International Friendly in our catalog (mentions international or foreign-national eligibility in our data).',
    guestUnlock: 'Create a free account to unlock this section',
    guestUnlockShort: 'Create a free account to unlock',
    internationalFriendlyActivate:
      'Create a free account to use International Friendly',
    internationalFriendlyShowAria: 'Show International Friendly scholarships',
    internationalFriendlyOnAria: 'International Friendly on — click to clear',
    subscriptionUnlockShort: 'Start your free access to unlock',
    matchesNewIndicatorTitle: (count) => `${count} not opened yet`,
    matchesNewIndicatorAria: (count) => `${count} new scholarships`
  },
  continueSearch: {
    heading: 'Continue your scholarship search',
    subtitle:
      'Explore next steps to find scholarships faster, write stronger applications, and compare opportunities.',
    exploringHeading: 'Continue exploring',
    exploringSubtitle:
      'Short paths to resources, essays, and curated hubs—without leaving the product flow.',
    explore: 'Explore →',
    resourcesTitle: 'Scholarship resources',
    resourcesBody: 'Guides to find, track, and apply step by step.',
    essaysTitle: 'Essay guides',
    essaysBody: 'Structure and revise scholarship essays faster.',
    providersTitle: 'Scholarship providers',
    providersBody: 'See who funds listings and how profiles are verified.',
    compareTitle: 'Compare scholarships',
    compareBody: 'Merit vs need, no-essay vs essay, and more decision guides.',
    easyApplyTitle: 'Easy apply hub',
    easyApplyBody: 'Scholarships with lighter application requirements.',
    internationalTitle: 'International-friendly',
    internationalBody: 'Opportunities open to students outside the U.S.'
  },
  hubCanonicalIntro: {
    matches:
      'Browse scholarships matched to your profile, eligibility, education level, and goals.',
    'easy-apply':
      'Find scholarships with simpler applications, fewer requirements, and faster ways to apply.',
    'international-friendly':
      'Explore scholarships that may be open to international students, non-U.S. citizens, or students studying in the United States.',
    'hot-deadlines':
      'Find scholarships closing soon and prioritize applications before deadlines pass.',
    'best-recommendation':
      'Complete your scholarship profile to get better recommendations and receive alerts when new matching grants are added.'
  },
  guestExploreRecommendedTitle: 'Recommended scholarships for you',
  guestExploreTopTitle: 'Top scholarships to explore'
};

const ES: ScholarshipsHubUiCopy = {
  ...EN,
  defaultPageTitle: 'Becas encontradas',
  internationalStudentsPageTitle: 'Becas para estudiantes internacionales',
  pageTitles: {
    'best-recommendation': 'Mejores recomendaciones',
    recommended: 'Filtros guardados',
    'easy-apply': 'Becas de solicitud fácil',
    'hot-deadlines': 'Fechas urgentes',
    'from-email': 'Desde el correo',
    matches: 'Becas encontradas',
    saved: 'Becas guardadas',
    started: 'Solicitudes iniciadas',
    submitted: 'Solicitudes enviadas',
    ignored: 'Becas ignoradas'
  },
  loadingText: {
    'best-recommendation': 'Cargando mejores recomendaciones…',
    recommended: 'Cargando filtros guardados…',
    'easy-apply': 'Cargando solicitud fácil…',
    'hot-deadlines': 'Cargando fechas urgentes…',
    'from-email': 'Cargando becas del correo…',
    matches: 'Cargando coincidencias…',
    saved: 'Cargando guardadas…',
    started: 'Cargando iniciadas…',
    submitted: 'Cargando enviadas…',
    ignored: 'Cargando ignoradas…'
  },
  searchByKeyword: 'Buscar por palabra clave',
  searchByKeywordAria: 'Buscar por palabra clave',
  sortLabel: 'Ordenar:',
  sortOptionsAria: 'Opciones de orden',
  filters: 'Filtros',
  filtersAria: 'Abrir más filtros',
  categories: 'Categorías',
  searchCategories: 'Buscar categorías',
  applyCategories: 'Aplicar',
  clearCategories: 'Limpiar',
  imFrom: 'Soy de',
  imFromTitle: 'País de ciudadanía / residencia',
  studyIn: 'Estudio en',
  studyInTitle: 'Ubicación del programa',
  searchCountry: 'Buscar por país',
  searchCountries: 'Buscar países',
  apply: 'Aplicar',
  clear: 'Limpiar',
  showingRange: (from, to, total, unit) =>
    `Mostrando ${from}–${to} de ${total} ${unit}`,
  foundCount: (count, unit) => `${count} ${unit} encontradas`,
  foundZero: (unit) => `0 ${unit} encontradas`,
  clearAll: 'Borrar todo',
  savedFiltersDefault: 'Filtros guardados',
  notSpecified: 'Sin especificar',
  filterByCategoryAria: 'Filtrar por categoría',
  categoriesPanelIncludeOnly:
    'Incluir solo las categorías seleccionadas en la lista.',
  restoreToMatches: 'Restaurar en coincidencias',
  loadingCountAria: 'Cargando recuento de becas',
  sortOptions: [
    { value: 'magic', label: 'Recomendado' },
    { value: 'most_recent', label: 'Más recientes' },
    { value: 'closest_deadline', label: 'Fecha más próxima' },
    { value: 'highest_amount', label: 'Monto: mayor a menor' },
    { value: 'verified_first', label: 'Verificadas primero' },
    { value: 'least_requirements', label: 'Menos requisitos' },
    { value: 'fewest_applicants', label: 'Menos postulantes' }
  ],
  sortTriggerLabels: {
    best_match: 'Recomendado',
    best_recommendation: 'Recomendado',
    most_recent: 'Más recientes',
    closest_deadline: 'Fecha más próxima',
    highest_amount: 'Monto: mayor a menor',
    magic: 'Recomendado',
    lowest_amount: 'Recomendado',
    least_requirements: 'Menos requisitos',
    fewest_applicants: 'Menos postulantes',
    verified_first: 'Verificadas primero'
  },
  listingResultUnit: (tab, plural) => {
    switch (tab) {
      case 'saved':
        return plural ? 'becas guardadas' : 'beca guardada';
      case 'started':
        return plural ? 'solicitudes iniciadas' : 'solicitud iniciada';
      case 'submitted':
        return plural ? 'solicitudes enviadas' : 'solicitud enviada';
      case 'ignored':
        return plural ? 'becas ignoradas' : 'beca ignorada';
      default:
        return plural ? 'becas' : 'beca';
    }
  },
  card: {
    save: 'Guardar',
    saved: 'Guardada ✓',
    removeFromSavedAria: 'Quitar de guardadas',
    saveScholarshipAria: 'Guardar beca',
    notRelevant: 'No relevante',
    restoreToMatches: 'Restaurar en coincidencias',
    badgeNew: 'NUEVO',
    badgeNewAria: 'Nuevo — aún no abierto',
    awardAmountLabel: 'Monto de la beca',
    requirementsLabel: 'Requisitos',
    requirementsNone: 'Ninguno',
    requirementsOne: '1 requisito',
    requirementsMany: (count) => `${count} requisitos`,
    requirementsSummaryZero: '0 requisitos: sin requisitos',
    requirementsSummaryListed: (count) =>
      `${count} requisito${count === 1 ? '' : 's'}: ver detalle`,
    bestForPrefix: 'Mejor para:',
    effortPrefix: 'Esfuerzo:',
    sourcePrefix: 'Fuente:',
    hostNotSpecified: 'Anfitrión: sin especificar',
    hostNotSpecifiedTitle:
      'La ubicación del programa/anfitrión aún no está especificada en los datos.',
    studyInPrefix: 'Estudio en:',
    studyInMulti: (count) => `Estudio en: ${count} países`,
    intelligenceAria: 'Señales de listado ScholarshipTop',
    bestForBadgeTitle: 'Señal de mejor encaje de ScholarshipTop',
    unlockAwardAria: 'Desbloquea monto y fecha con cuenta gratuita o plan'
  },
  tryEssayMentor: 'Probar Essay Mentor',
  inlineIq: {
    startIqAria: 'Iniciar prueba IQ',
    featuredTool: 'Herramienta destacada',
    iqAssessment: 'Evaluación IQ',
    title: 'Encuentra becas que encajen con tu forma de pensar',
    body: 'Descubre si tus fortalezas apuntan a ensayos, becas de investigación, solicitudes rápidas u oportunidades lógicas.',
    logic: 'Lógica',
    spatial: 'Espacial',
    speed: 'Velocidad',
    preview: 'Vista previa',
    type: 'Tipo',
    strategyUnlocked: 'Estrategia de becas desbloqueada',
    startIqTest: 'Iniciar prueba IQ'
  },
  sidebar: {
    myScholarships: 'Mis becas',
    scholarshipCategoriesNavAria: 'Categorías de becas',
    bestRecommendation: 'Mejor recomendación',
    easyApply: 'Solicitud fácil',
    easyApplyTooltip: 'Becas con menor esfuerzo de solicitud.',
    hotDeadlines: 'Fechas urgentes',
    hotDeadlinesTooltip: 'Fechas en la próxima semana.',
    matches: 'Coincidencias',
    matchesTooltip: 'Becas que coinciden con tus criterios.',
    saved: 'Guardadas',
    savedTooltip: 'Becas que guardaste.',
    ignored: 'Ignoradas',
    ignoredTooltip: 'Becas que decidiste ocultar.',
    internationalFriendly: 'Internacional',
    internationalFriendlyTooltip:
      'Becas marcadas como aptas para estudiantes internacionales en nuestro catálogo.',
    guestUnlock: 'Crea una cuenta gratuita para desbloquear esta sección',
    guestUnlockShort: 'Crea una cuenta gratuita para desbloquear',
    internationalFriendlyActivate:
      'Crea una cuenta gratuita para usar Internacional',
    internationalFriendlyShowAria:
      'Mostrar becas para estudiantes internacionales',
    internationalFriendlyOnAria:
      'Internacional activado — haz clic para limpiar',
    subscriptionUnlockShort: 'Inicia tu acceso gratuito para desbloquear',
    matchesNewIndicatorTitle: (count) => `${count} sin abrir aún`,
    matchesNewIndicatorAria: (count) => `${count} nuevas becas`
  },
  continueSearch: {
    heading: 'Continúa tu búsqueda de becas',
    subtitle:
      'Explora los siguientes pasos para encontrar becas más rápido, redactar mejores solicitudes y comparar opciones.',
    exploringHeading: 'Seguir explorando',
    exploringSubtitle:
      'Accesos rápidos a recursos, ensayos y hubs curados sin salir del flujo.',
    explore: 'Explorar →',
    resourcesTitle: 'Recursos de becas',
    resourcesBody: 'Guías para encontrar, seguir y solicitar paso a paso.',
    essaysTitle: 'Guías de ensayos',
    essaysBody: 'Estructura y revisa ensayos para becas más rápido.',
    providersTitle: 'Proveedores de becas',
    providersBody: 'Quién financia las becas y cómo verificamos perfiles.',
    compareTitle: 'Comparar becas',
    compareBody: 'Mérito vs necesidad, sin ensayo vs con ensayo y más guías.',
    easyApplyTitle: 'Hub de solicitud fácil',
    easyApplyBody: 'Becas con requisitos de solicitud más ligeros.',
    internationalTitle: 'Para internacionales',
    internationalBody: 'Oportunidades abiertas a estudiantes fuera de EE. UU.'
  },
  hubCanonicalIntro: {
    matches:
      'Explora becas según tu perfil, elegibilidad, nivel educativo y objetivos.',
    'easy-apply':
      'Encuentra becas con solicitudes más simples, menos requisitos y formas más rápidas de postular.',
    'international-friendly':
      'Explora becas que pueden estar abiertas a estudiantes internacionales, no ciudadanos de EE. UU. o quienes estudian en Estados Unidos.',
    'hot-deadlines':
      'Encuentra becas que cierran pronto y prioriza las solicitudes antes de las fechas límite.',
    'best-recommendation':
      'Completa tu perfil de becas para obtener mejores recomendaciones y alertas cuando se añadan nuevas oportunidades.'
  },
  guestExploreRecommendedTitle: 'Becas recomendadas para ti',
  guestExploreTopTitle: 'Becas destacadas para explorar'
};

const FR: ScholarshipsHubUiCopy = {
  ...EN,
  defaultPageTitle: 'Bourses trouvées',
  internationalStudentsPageTitle: 'Bourses pour étudiants internationaux',
  pageTitles: {
    'best-recommendation': 'Meilleures recommandations',
    recommended: 'Filtres enregistrés',
    'easy-apply': 'Bourses à candidature facile',
    'hot-deadlines': 'Dates urgentes',
    'from-email': 'Depuis l’e-mail',
    matches: 'Bourses trouvées',
    saved: 'Bourses enregistrées',
    started: 'Candidatures commencées',
    submitted: 'Candidatures envoyées',
    ignored: 'Bourses ignorées'
  },
  loadingText: {
    'best-recommendation': 'Chargement des meilleures recommandations…',
    recommended: 'Chargement des filtres enregistrés…',
    'easy-apply': 'Chargement candidature facile…',
    'hot-deadlines': 'Chargement des dates urgentes…',
    'from-email': 'Chargement des bourses par e-mail…',
    matches: 'Chargement des correspondances…',
    saved: 'Chargement des enregistrées…',
    started: 'Chargement des commencées…',
    submitted: 'Chargement des envoyées…',
    ignored: 'Chargement des ignorées…'
  },
  searchByKeyword: 'Rechercher par mot-clé',
  searchByKeywordAria: 'Rechercher par mot-clé',
  sortLabel: 'Trier :',
  sortOptionsAria: 'Options de tri',
  filters: 'Filtres',
  filtersAria: 'Ouvrir plus de filtres',
  categories: 'Catégories',
  searchCategories: 'Rechercher des catégories',
  applyCategories: 'Appliquer',
  clearCategories: 'Effacer',
  imFrom: 'Je viens de',
  imFromTitle: 'Pays de citoyenneté / résidence',
  studyIn: 'J’étudie en',
  studyInTitle: 'Lieu du programme',
  searchCountry: 'Rechercher un pays',
  searchCountries: 'Rechercher des pays',
  apply: 'Appliquer',
  clear: 'Effacer',
  showingRange: (from, to, total, unit) =>
    `Affichage ${from}–${to} sur ${total} ${unit}`,
  foundCount: (count, unit) => `${count} ${unit} trouvées`,
  foundZero: (unit) => `0 ${unit} trouvées`,
  clearAll: 'Tout effacer',
  savedFiltersDefault: 'Filtres enregistrés',
  notSpecified: 'Non précisé',
  filterByCategoryAria: 'Filtrer par catégorie',
  categoriesPanelIncludeOnly:
    'N’inclure que les catégories sélectionnées dans la liste.',
  restoreToMatches: 'Restaurer dans les correspondances',
  loadingCountAria: 'Chargement du nombre de bourses',
  sortOptions: [
    { value: 'magic', label: 'Recommandé' },
    { value: 'most_recent', label: 'Plus récentes' },
    { value: 'closest_deadline', label: 'Date la plus proche' },
    { value: 'highest_amount', label: 'Montant décroissant' },
    { value: 'verified_first', label: 'Vérifiées en premier' },
    { value: 'least_requirements', label: 'Moins d’exigences' },
    { value: 'fewest_applicants', label: 'Moins de candidats' }
  ],
  sortTriggerLabels: {
    best_match: 'Recommandé',
    best_recommendation: 'Recommandé',
    most_recent: 'Plus récentes',
    closest_deadline: 'Date la plus proche',
    highest_amount: 'Montant décroissant',
    magic: 'Recommandé',
    lowest_amount: 'Recommandé',
    least_requirements: 'Moins d’exigences',
    fewest_applicants: 'Moins de candidats',
    verified_first: 'Vérifiées en premier'
  },
  listingResultUnit: (tab, plural) => {
    switch (tab) {
      case 'saved':
        return plural ? 'bourses enregistrées' : 'bourse enregistrée';
      case 'started':
        return plural ? 'candidatures commencées' : 'candidature commencée';
      case 'submitted':
        return plural ? 'candidatures envoyées' : 'candidature envoyée';
      case 'ignored':
        return plural ? 'bourses ignorées' : 'bourse ignorée';
      default:
        return plural ? 'bourses' : 'bourse';
    }
  },
  card: {
    save: 'Enregistrer',
    saved: 'Enregistrée ✓',
    removeFromSavedAria: 'Retirer des enregistrées',
    saveScholarshipAria: 'Enregistrer la bourse',
    notRelevant: 'Non pertinent',
    restoreToMatches: 'Restaurer dans les correspondances',
    badgeNew: 'NOUVEAU',
    badgeNewAria: 'Nouveau — pas encore ouvert',
    awardAmountLabel: 'Montant de la bourse',
    requirementsLabel: 'Exigences',
    requirementsNone: 'Aucune',
    requirementsOne: '1 exigence',
    requirementsMany: (count) => `${count} exigences`,
    requirementsSummaryZero: '0 exigence : aucune exigence',
    requirementsSummaryListed: (count) =>
      `${count} exigence${count === 1 ? '' : 's'} : voir le détail`,
    bestForPrefix: 'Meilleur pour :',
    effortPrefix: 'Effort :',
    sourcePrefix: 'Source :',
    hostNotSpecified: 'Pays d’accueil non précisé',
    hostNotSpecifiedTitle:
      'Le lieu du programme/pays d’accueil n’est pas encore précisé dans les données.',
    studyInPrefix: 'Études en :',
    studyInMulti: (count) => `Études en : ${count} pays`,
    intelligenceAria: 'Signaux de liste ScholarshipTop',
    bestForBadgeTitle: 'Signal d’adéquation ScholarshipTop',
    unlockAwardAria: 'Débloquez montant et date avec un compte gratuit ou un forfait'
  },
  tryEssayMentor: 'Essayer Essay Mentor',
  inlineIq: {
    startIqAria: 'Commencer le test IQ',
    featuredTool: 'Outil en vedette',
    iqAssessment: 'Évaluation IQ',
    title: 'Trouvez des bourses adaptées à votre façon de penser',
    body: 'Voyez si vos forces orientent vers les essais, les bourses de recherche, les candidatures rapides ou les opportunités logiques.',
    logic: 'Logique',
    spatial: 'Spatial',
    speed: 'Vitesse',
    preview: 'Aperçu',
    type: 'Type',
    strategyUnlocked: 'Stratégie de bourses débloquée',
    startIqTest: 'Commencer le test IQ'
  },
  sidebar: {
    myScholarships: 'Mes bourses',
    scholarshipCategoriesNavAria: 'Catégories de bourses',
    bestRecommendation: 'Meilleure recommandation',
    easyApply: 'Candidature facile',
    easyApplyTooltip: 'Bourses demandant moins d’effort de candidature.',
    hotDeadlines: 'Dates urgentes',
    hotDeadlinesTooltip: 'Dates dans la semaine à venir.',
    matches: 'Correspondances',
    matchesTooltip: 'Bourses qui correspondent à vos critères.',
    saved: 'Enregistrées',
    savedTooltip: 'Bourses que vous avez enregistrées.',
    ignored: 'Ignorées',
    ignoredTooltip: 'Bourses que vous avez masquées.',
    internationalFriendly: 'International',
    internationalFriendlyTooltip:
      'Bourses marquées comme favorables aux étudiants internationaux dans notre catalogue.',
    guestUnlock: 'Créez un compte gratuit pour débloquer cette section',
    guestUnlockShort: 'Créez un compte gratuit pour débloquer',
    internationalFriendlyActivate:
      'Créez un compte gratuit pour utiliser International',
    internationalFriendlyShowAria:
      'Afficher les bourses pour étudiants internationaux',
    internationalFriendlyOnAria:
      'International activé — cliquez pour effacer',
    subscriptionUnlockShort: 'Démarrez votre accès gratuit pour débloquer',
    matchesNewIndicatorTitle: (count) => `${count} non ouvertes`,
    matchesNewIndicatorAria: (count) => `${count} nouvelles bourses`
  },
  continueSearch: {
    heading: 'Poursuivre votre recherche de bourses',
    subtitle:
      'Explorez les prochaines étapes pour trouver des bourses plus vite, rédiger de meilleures candidatures et comparer les options.',
    exploringHeading: 'Continuer à explorer',
    exploringSubtitle:
      'Accès rapides aux ressources, rédactions et hubs — sans quitter le parcours.',
    explore: 'Explorer →',
    resourcesTitle: 'Ressources bourses',
    resourcesBody: 'Guides pour trouver, suivre et postuler étape par étape.',
    essaysTitle: 'Guides de rédaction',
    essaysBody: 'Structurez et révisez vos essais de bourse plus vite.',
    providersTitle: 'Fournisseurs de bourses',
    providersBody: 'Qui finance les offres et comment nous vérifions les profils.',
    compareTitle: 'Comparer les bourses',
    compareBody: 'Mérite vs besoin, sans essai vs avec essai, et autres guides.',
    easyApplyTitle: 'Hub candidature facile',
    easyApplyBody: 'Bourses avec des exigences de candidature plus légères.',
    internationalTitle: 'Étudiants internationaux',
    internationalBody: 'Opportunités ouvertes aux étudiants hors des États-Unis.'
  },
  hubCanonicalIntro: {
    matches:
      'Parcourez des bourses selon votre profil, votre éligibilité, votre niveau d’études et vos objectifs.',
    'easy-apply':
      'Trouvez des bourses avec des candidatures plus simples, moins d’exigences et des démarches plus rapides.',
    'international-friendly':
      'Explorez des bourses ouvertes aux étudiants internationaux, aux non-ressortissants américains ou à ceux qui étudient aux États-Unis.',
    'hot-deadlines':
      'Trouvez des bourses qui ferment bientôt et priorisez vos candidatures avant les dates limites.',
    'best-recommendation':
      'Complétez votre profil bourses pour de meilleures recommandations et des alertes lorsque de nouvelles opportunités correspondent.'
  },
  guestExploreRecommendedTitle: 'Bourses recommandées pour vous',
  guestExploreTopTitle: 'Bourses à explorer en priorité'
};

export function getScholarshipsHubUiCopy(
  locale: LocalizedUiLocale
): ScholarshipsHubUiCopy {
  if (locale === 'es') return ES;
  if (locale === 'fr') return FR;
  return EN;
}

export function scholarshipListPageTitleLocalized(
  tab: ScholarshipListTabId,
  locale: LocalizedUiLocale,
  options?: { guest?: boolean }
): string {
  void options;
  const copy = getScholarshipsHubUiCopy(locale);
  if (tab === 'matches') return copy.defaultPageTitle;
  return copy.pageTitles[tab] ?? copy.defaultPageTitle;
}
