import type { LocalizedUiLocale } from '@/lib/i18n/localizedHref';
import type { ProvidersHubCountryBucket } from '@/lib/providers/providersHubCountryFilter';

export type EssaysHubUiCopy = {
  home: string;
  pageTitle: string;
  h1: string;
  intro: string;
  commandCenterEyebrow: string;
  commandCenterTitle: string;
  commandCenterBody: string;
  openEssayMentor: string;
  tryEssayMentor: string;
  curatedGuide: string;
  readGuide: string;
  noPublished: string;
  noMatches: string;
  groups: Array<{
    title: string;
    body: string;
    links: Array<[string, string]>;
  }>;
};

export type CompareHubToolbarCopy = {
  searchPlaceholder: string;
  categoriesAria: string;
  categoriesTitle: string;
  categoriesHint: string;
  categoryAll: string;
  categoryUniversities: string;
  categoryStates: string;
  stateKind: string;
  universityKind: string;
  clear: string;
  apply: string;
  resultLabel: string;
  searchSuggestionsAria: string;
};

export type CompareHubGridIqCopy = {
  featuredTool: string;
  badge: string;
  title: string;
  body: string;
  assessmentLabel: string;
  startIqTest: string;
  startIqAria: string;
};

export type CompareHubUiCopy = {
  home: string;
  breadcrumb: string;
  h1: string;
  intro: string;
  noPublished: string;
  noMatchesFilters: string;
  evergreenEyebrow: string;
  evergreenTitle: string;
  evergreenBody: string;
  evergreenBadge: string;
  readComparison: string;
  toolbar: CompareHubToolbarCopy;
  gridIq: CompareHubGridIqCopy;
};

export type ResourcesHubUiCopy = {
  home: string;
  h1: string;
  intro: string;
  staticGuidesEyebrow: string;
  staticGuidesTitle: string;
  scamWarning: string;
  noPublished: string;
  noMatches: string;
};

export type ProvidersHubCountryOption = {
  value: ProvidersHubCountryBucket;
  label: string;
};

export type ProvidersHubGridIqCopy = {
  featuredTool: string;
  badge: string;
  title: string;
  body: string;
  assessmentLabel: string;
  startIqTest: string;
  startIqAria: string;
};

export type ProvidersHubUiCopy = {
  home: string;
  breadcrumb: string;
  h1: string;
  intro: string;
  searchPlaceholder: string;
  showingProviders: (
    from: number,
    to: number,
    total: number,
    opts?: { query?: string; stateName?: string | null; countrySummary?: string | null }
  ) => string;
  countryOptions: ProvidersHubCountryOption[];
  resetFilters: string;
  emptyUs: string;
  emptyState: (stateName: string) => string;
  emptyOther: string;
  emptySearch: string;
  emptyDefault: string;
  loadingSearchAria: string;
  gridIq: ProvidersHubGridIqCopy;
};

export type ScholarshipsCatalogIntroCopy = {
  title: string;
  body: string;
  tips: readonly string[];
  mistakesTitle: string;
  mistakes: readonly string[];
  quickLinks: ReadonlyArray<{ label: string; href: string }>;
};

const EN_ESSAYS: EssaysHubUiCopy = {
  home: 'Home',
  pageTitle: 'Scholarship Essay Guides & Examples (2026)',
  h1: 'Scholarship Essay Guides & Examples (2026)',
  intro:
    'How-to guides for scholarship essays—structured prompts, outlines, and revision checklists. For browsing awards, use the scholarship directory.',
  commandCenterEyebrow: 'Scholarship essay command center',
  commandCenterTitle: 'Plan the essay before you write the essay',
  commandCenterBody:
    'Start with the prompt, choose the right evidence, revise against a checklist, and confirm provider instructions before submitting. Writing guidance can improve clarity, but it does not guarantee an award.',
  openEssayMentor: 'Open Essay Mentor',
  tryEssayMentor: 'Try Essay Mentor',
  curatedGuide: 'Curated guide',
  readGuide: 'Read guide →',
  noPublished: 'No published essay guides yet. Check back soon.',
  noMatches: 'No guides match your filters. Try clearing search or categories.',
  groups: [
    {
      title: 'Start here',
      body: 'Build the foundation before drafting: examples, outline, checklist, and mistakes.',
      links: [
        ['Examples', '/essays/examples'],
        ['Outline', '/essays/outline'],
        ['Checklist', '/essays/checklist'],
        ['Mistakes', '/essays/mistakes']
      ]
    },
    {
      title: 'Prompt guides',
      body: 'Use these when a scholarship asks about need, goals, leadership, or personal background.',
      links: [
        ['Financial Need', '/essays/financial-need'],
        ['Career Goals', '/essays/career-goals'],
        ['Leadership', '/essays/leadership'],
        ['Personal Statement', '/essays/personal-statement']
      ]
    },
    {
      title: 'Applicant profiles',
      body: 'Match your writing strategy to the type of award or student profile you are targeting.',
      links: [
        ['STEM Essay', '/essays/stem'],
        ['No-Essay Scholarships', '/essays/no-essay-scholarships'],
        ['No Essay Hub', '/scholarships/no-essay'],
        ['International Students', '/scholarships/international-students']
      ]
    }
  ]
};

const ES_ESSAYS: EssaysHubUiCopy = {
  home: 'Inicio',
  pageTitle: 'Guías y ejemplos de ensayos para becas (2026)',
  h1: 'Guías y ejemplos de ensayos para becas (2026)',
  intro:
    'Guías prácticas para ensayos de becas: prompts, esquemas y checklists de revisión. Para explorar becas, usa el catálogo.',
  commandCenterEyebrow: 'Centro de ensayos para becas',
  commandCenterTitle: 'Planifica el ensayo antes de escribirlo',
  commandCenterBody:
    'Empieza por el prompt, elige evidencia real, revisa con un checklist y confirma las instrucciones del proveedor antes de enviar. La orientación mejora la claridad, pero no garantiza una beca.',
  openEssayMentor: 'Abrir Essay Mentor',
  tryEssayMentor: 'Probar Essay Mentor',
  curatedGuide: 'Guía seleccionada',
  readGuide: 'Leer guía →',
  noPublished: 'Aún no hay guías publicadas. Vuelve pronto.',
  noMatches: 'Ninguna guía coincide con tus filtros. Prueba limpiar búsqueda o categorías.',
  groups: EN_ESSAYS.groups.map((group, index) => {
    const titles = ['Empieza aquí', 'Guías por prompt', 'Perfiles de solicitante'];
    const bodies = [
      'Construye la base antes de redactar: ejemplos, esquema, checklist y errores.',
      'Úsalas cuando la beca pregunte por necesidad, metas, liderazgo o trayectoria personal.',
      'Alinea tu estrategia con el tipo de beca o perfil que buscas.'
    ];
    const linkLabels: Record<string, string> = {
      '/essays/examples': 'Ejemplos',
      '/essays/outline': 'Esquema',
      '/essays/checklist': 'Checklist',
      '/essays/mistakes': 'Errores',
      '/essays/financial-need': 'Necesidad financiera',
      '/essays/career-goals': 'Metas profesionales',
      '/essays/leadership': 'Liderazgo',
      '/essays/personal-statement': 'Declaración personal',
      '/essays/stem': 'Ensayo STEM',
      '/essays/no-essay-scholarships': 'Becas sin ensayo',
      '/scholarships/no-essay': 'Hub sin ensayo',
      '/scholarships/international-students': 'Estudiantes internacionales'
    };
    return {
      title: titles[index] ?? group.title,
      body: bodies[index] ?? group.body,
      links: group.links.map(
        ([, href]) => [linkLabels[href] ?? href, href] as [string, string]
      )
    };
  })
};

const FR_ESSAYS: EssaysHubUiCopy = {
  home: 'Accueil',
  pageTitle: 'Guides et exemples de rédaction de bourses (2026)',
  h1: 'Guides et exemples de rédaction de bourses (2026)',
  intro:
    'Guides pratiques pour les essais de bourses : consignes, plans et checklists de révision. Pour parcourir les bourses, utilisez le catalogue.',
  commandCenterEyebrow: 'Centre de rédaction pour bourses',
  commandCenterTitle: 'Planifiez l’essai avant de le rédiger',
  commandCenterBody:
    'Commencez par la consigne, choisissez des preuves réelles, révisez avec une checklist et confirmez les instructions du fournisseur avant d’envoyer. L’aide à la rédaction améliore la clarté, mais ne garantit pas une bourse.',
  openEssayMentor: 'Ouvrir Essay Mentor',
  tryEssayMentor: 'Essayer Essay Mentor',
  curatedGuide: 'Guide sélectionné',
  readGuide: 'Lire le guide →',
  noPublished: 'Aucun guide publié pour le moment. Revenez bientôt.',
  noMatches: 'Aucun guide ne correspond à vos filtres. Essayez d’effacer la recherche ou les catégories.',
  groups: EN_ESSAYS.groups.map((group, index) => {
    const titles = ['Commencer ici', 'Guides par consigne', 'Profils de candidats'];
    const bodies = [
      'Construisez les bases avant de rédiger : exemples, plan, checklist et erreurs.',
      'À utiliser quand la bourse porte sur le besoin, les objectifs, le leadership ou le parcours personnel.',
      'Alignez votre stratégie sur le type de bourse ou de profil visé.'
    ];
    const linkLabels: Record<string, string> = {
      '/essays/examples': 'Exemples',
      '/essays/outline': 'Plan',
      '/essays/checklist': 'Checklist',
      '/essays/mistakes': 'Erreurs',
      '/essays/financial-need': 'Besoin financier',
      '/essays/career-goals': 'Objectifs professionnels',
      '/essays/leadership': 'Leadership',
      '/essays/personal-statement': 'Déclaration personnelle',
      '/essays/stem': 'Essai STEM',
      '/essays/no-essay-scholarships': 'Bourses sans essai',
      '/scholarships/no-essay': 'Hub sans essai',
      '/scholarships/international-students': 'Étudiants internationaux'
    };
    return {
      title: titles[index] ?? group.title,
      body: bodies[index] ?? group.body,
      links: group.links.map(
        ([, href]) => [linkLabels[href] ?? href, href] as [string, string]
      )
    };
  })
};

const EN_COMPARE_TOOLBAR: CompareHubToolbarCopy = {
  searchPlaceholder: 'Search comparisons',
  categoriesAria: 'Categories',
  categoriesTitle: 'Categories',
  categoriesHint: 'Choose which comparison collection to browse.',
  categoryAll: 'All comparisons',
  categoryUniversities: 'University vs University',
  categoryStates: 'State vs State',
  stateKind: 'State',
  universityKind: 'University',
  clear: 'Clear',
  apply: 'Apply',
  resultLabel: 'comparisons',
  searchSuggestionsAria: 'Search suggestions'
};

const EN_COMPARE: CompareHubUiCopy = {
  home: 'Home',
  breadcrumb: 'Compare',
  h1: 'Scholarship Comparisons',
  intro:
    'Explore published state and university matchups, compare funding environments, and jump into the strongest scholarship markets faster.',
  noPublished: 'No published comparisons yet. Check back soon.',
  noMatchesFilters:
    'No comparisons match your filters. Try clearing search or categories.',
  evergreenEyebrow: 'Compare scholarship types',
  evergreenTitle: 'Start with evergreen decisions before comparing matchups',
  evergreenBody:
    'These guides explain common scholarship choices in plain English: grant versus scholarship, merit versus need, no-essay versus essay, and local versus national opportunities.',
  evergreenBadge: 'Evergreen guide',
  readComparison: 'Read comparison',
  toolbar: EN_COMPARE_TOOLBAR,
  gridIq: {
    featuredTool: 'Featured Tool',
    badge: 'Decision fit',
    title: 'Not sure which path fits you?',
    body: 'Take a cognitive assessment and discover the thinking strengths that can guide your scholarship strategy.',
    assessmentLabel: 'IQ assessment',
    startIqTest: 'Start IQ test',
    startIqAria: 'Start IQ assessment for college fit'
  }
};

const ES_COMPARE: CompareHubUiCopy = {
  home: 'Inicio',
  breadcrumb: 'Comparar',
  h1: 'Comparaciones de becas',
  intro:
    'Explora enfrentamientos por estado y universidad, compara entornos de financiación y entra más rápido en los mercados de becas más fuertes.',
  noPublished: 'Aún no hay comparaciones publicadas. Vuelve pronto.',
  noMatchesFilters:
    'Ninguna comparación coincide con tus filtros. Prueba limpiar búsqueda o categorías.',
  evergreenEyebrow: 'Comparar tipos de beca',
  evergreenTitle: 'Empieza por decisiones permanentes antes de comparar enfrentamientos',
  evergreenBody:
    'Estas guías explican elecciones habituales: beca frente a subvención, mérito frente a necesidad, sin ensayo frente a con ensayo, y local frente a nacional.',
  evergreenBadge: 'Guía permanente',
  readComparison: 'Leer comparación',
  toolbar: {
    searchPlaceholder: 'Buscar comparaciones',
    categoriesAria: 'Categorías',
    categoriesTitle: 'Categorías',
    categoriesHint: 'Elige qué colección de comparaciones explorar.',
    categoryAll: 'Todas las comparaciones',
    categoryUniversities: 'Universidad vs universidad',
    categoryStates: 'Estado vs estado',
    stateKind: 'Estado',
    universityKind: 'Universidad',
    clear: 'Limpiar',
    apply: 'Aplicar',
    resultLabel: 'comparaciones',
    searchSuggestionsAria: 'Sugerencias de búsqueda'
  },
  gridIq: {
    featuredTool: 'Herramienta destacada',
    badge: 'Encaje de decisión',
    title: '¿No sabes qué camino te conviene?',
    body: 'Haz una evaluación cognitiva y descubre fortalezas de pensamiento que guíen tu estrategia de becas.',
    assessmentLabel: 'Evaluación IQ',
    startIqTest: 'Iniciar prueba IQ',
    startIqAria: 'Iniciar evaluación IQ para encaje universitario'
  }
};

const FR_COMPARE: CompareHubUiCopy = {
  home: 'Accueil',
  breadcrumb: 'Comparer',
  h1: 'Comparaisons de bourses',
  intro:
    'Explorez les matchs par État et université, comparez les environnements de financement et accédez plus vite aux marchés les plus solides.',
  noPublished: 'Aucune comparaison publiée pour le moment. Revenez bientôt.',
  noMatchesFilters:
    'Aucune comparaison ne correspond à vos filtres. Essayez d’effacer la recherche ou les catégories.',
  evergreenEyebrow: 'Comparer les types de bourses',
  evergreenTitle: 'Commencez par les décisions durables avant les matchs',
  evergreenBody:
    'Ces guides expliquent les choix courants : bourse vs subvention, mérite vs besoin, sans essai vs avec essai, local vs national.',
  evergreenBadge: 'Guide durable',
  readComparison: 'Lire la comparaison',
  toolbar: {
    searchPlaceholder: 'Rechercher des comparaisons',
    categoriesAria: 'Catégories',
    categoriesTitle: 'Catégories',
    categoriesHint: 'Choisissez la collection de comparaisons à parcourir.',
    categoryAll: 'Toutes les comparaisons',
    categoryUniversities: 'Université vs université',
    categoryStates: 'État vs État',
    stateKind: 'État',
    universityKind: 'Université',
    clear: 'Effacer',
    apply: 'Appliquer',
    resultLabel: 'comparaisons',
    searchSuggestionsAria: 'Suggestions de recherche'
  },
  gridIq: {
    featuredTool: 'Outil en vedette',
    badge: 'Adéquation décision',
    title: 'Vous ne savez pas quelle voie vous convient ?',
    body: 'Passez une évaluation cognitive et découvrez les forces de raisonnement qui guident votre stratégie de bourses.',
    assessmentLabel: 'Évaluation IQ',
    startIqTest: 'Commencer le test IQ',
    startIqAria: 'Commencer l’évaluation IQ pour l’adéquation universitaire'
  }
};

const EN_RESOURCES: ResourcesHubUiCopy = {
  home: 'Home',
  h1: 'Resources — Guides & Tips',
  intro:
    'Guides and expert tips to help you find scholarships, write stronger applications, and stay organized.',
  staticGuidesEyebrow: 'Scholarship search guides',
  staticGuidesTitle: 'Start with practical scholarship strategy',
  scamWarning: 'Scam warning signs',
  noPublished: 'No published resources yet. Check back soon.',
  noMatches: 'No guides match your filters. Try clearing search or categories.'
};

const ES_RESOURCES: ResourcesHubUiCopy = {
  home: 'Inicio',
  h1: 'Recursos — Guías y consejos',
  intro:
    'Guías y consejos para encontrar becas, redactar mejores solicitudes y mantener el orden.',
  staticGuidesEyebrow: 'Guías de búsqueda de becas',
  staticGuidesTitle: 'Empieza con una estrategia práctica de becas',
  scamWarning: 'Señales de fraude',
  noPublished: 'Aún no hay recursos publicados. Vuelve pronto.',
  noMatches: 'Ninguna guía coincide con tus filtros. Prueba limpiar búsqueda o categorías.'
};

const FR_RESOURCES: ResourcesHubUiCopy = {
  home: 'Accueil',
  h1: 'Ressources — Guides et conseils',
  intro:
    'Guides et conseils pour trouver des bourses, rédiger de meilleures candidatures et rester organisé.',
  staticGuidesEyebrow: 'Guides de recherche de bourses',
  staticGuidesTitle: 'Commencez par une stratégie pratique',
  scamWarning: 'Signes d’arnaque',
  noPublished: 'Aucune ressource publiée pour le moment. Revenez bientôt.',
  noMatches: 'Aucun guide ne correspond à vos filtres. Essayez d’effacer la recherche ou les catégories.'
};

const EN_PROVIDERS_GRID_IQ: ProvidersHubGridIqCopy = {
  featuredTool: 'Featured Tool',
  badge: 'Provider fit',
  title: 'Not sure which providers to prioritize?',
  body: 'Take a cognitive assessment and use your logic, speed, and pattern strengths to plan a smarter scholarship search.',
  assessmentLabel: 'IQ assessment',
  startIqTest: 'Start IQ test',
  startIqAria: 'Start IQ assessment for provider research'
};

const EN_PROVIDERS: ProvidersHubUiCopy = {
  home: 'Home',
  breadcrumb: 'Providers',
  h1: 'Scholarship Providers',
  intro:
    'Explore organizations and foundations offering financial aid across the United States.',
  searchPlaceholder: 'Search by provider name, state, or your request...',
  showingProviders: (from, to, total, opts) => {
    let line = `Showing ${from}-${to} of ${total.toLocaleString()} providers`;
    if (opts?.query?.trim()) line += ` matching “${opts.query.trim()}”`;
    if (opts?.stateName) line += ` in ${opts.stateName}`;
    if (opts?.countrySummary) line += ` · ${opts.countrySummary}`;
    return line;
  },
  countryOptions: [
    { value: 'all', label: 'All countries' },
    { value: 'us', label: 'United States' },
    { value: 'other', label: 'Other & international' }
  ],
  resetFilters: 'Reset filters',
  emptyUs: 'No US providers match these filters.',
  emptyState: (stateName) => `No providers found in ${stateName}.`,
  emptyOther: 'No providers in this category yet.',
  emptySearch: 'No providers match your search.',
  emptyDefault: 'No providers found.',
  loadingSearchAria: 'Loading search',
  gridIq: EN_PROVIDERS_GRID_IQ
};

const ES_PROVIDERS: ProvidersHubUiCopy = {
  home: 'Inicio',
  breadcrumb: 'Proveedores',
  h1: 'Proveedores de becas',
  intro:
    'Explora organizaciones y fundaciones que ofrecen ayuda financiera en Estados Unidos.',
  searchPlaceholder: 'Buscar por proveedor, estado o tu consulta...',
  showingProviders: (from, to, total, opts) => {
    let line = `Mostrando ${from}-${to} de ${total.toLocaleString()} proveedores`;
    if (opts?.query?.trim()) line += ` que coinciden con “${opts.query.trim()}”`;
    if (opts?.stateName) line += ` en ${opts.stateName}`;
    if (opts?.countrySummary) line += ` · ${opts.countrySummary}`;
    return line;
  },
  countryOptions: [
    { value: 'all', label: 'Todos los países' },
    { value: 'us', label: 'Estados Unidos' },
    { value: 'other', label: 'Otros e internacional' }
  ],
  resetFilters: 'Restablecer filtros',
  emptyUs: 'Ningún proveedor de EE. UU. coincide con estos filtros.',
  emptyState: (stateName) => `No se encontraron proveedores en ${stateName}.`,
  emptyOther: 'Aún no hay proveedores en esta categoría.',
  emptySearch: 'Ningún proveedor coincide con tu búsqueda.',
  emptyDefault: 'No se encontraron proveedores.',
  loadingSearchAria: 'Cargando búsqueda',
  gridIq: {
    featuredTool: 'Herramienta destacada',
    badge: 'Encaje de proveedor',
    title: '¿No sabes qué proveedores priorizar?',
    body: 'Haz una evaluación cognitiva y usa tu lógica, velocidad y patrones para planificar una búsqueda de becas más inteligente.',
    assessmentLabel: 'Evaluación IQ',
    startIqTest: 'Iniciar prueba IQ',
    startIqAria: 'Iniciar evaluación IQ para investigar proveedores'
  }
};

const FR_PROVIDERS: ProvidersHubUiCopy = {
  home: 'Accueil',
  breadcrumb: 'Fournisseurs',
  h1: 'Fournisseurs de bourses',
  intro:
    'Explorez les organisations et fondations qui proposent une aide financière aux États-Unis.',
  searchPlaceholder: 'Rechercher par fournisseur, État ou votre requête...',
  showingProviders: (from, to, total, opts) => {
    let line = `Affichage ${from}-${to} sur ${total.toLocaleString()} fournisseurs`;
    if (opts?.query?.trim()) line += ` correspondant à « ${opts.query.trim()} »`;
    if (opts?.stateName) line += ` dans ${opts.stateName}`;
    if (opts?.countrySummary) line += ` · ${opts.countrySummary}`;
    return line;
  },
  countryOptions: [
    { value: 'all', label: 'Tous les pays' },
    { value: 'us', label: 'États-Unis' },
    { value: 'other', label: 'Autres et international' }
  ],
  resetFilters: 'Réinitialiser les filtres',
  emptyUs: 'Aucun fournisseur américain ne correspond à ces filtres.',
  emptyState: (stateName) => `Aucun fournisseur trouvé dans ${stateName}.`,
  emptyOther: 'Pas encore de fournisseurs dans cette catégorie.',
  emptySearch: 'Aucun fournisseur ne correspond à votre recherche.',
  emptyDefault: 'Aucun fournisseur trouvé.',
  loadingSearchAria: 'Chargement de la recherche',
  gridIq: {
    featuredTool: 'Outil en vedette',
    badge: 'Adéquation fournisseur',
    title: 'Vous ne savez pas quels fournisseurs prioriser ?',
    body: 'Passez une évaluation cognitive et utilisez logique, vitesse et motifs pour planifier une recherche de bourses plus intelligente.',
    assessmentLabel: 'Évaluation IQ',
    startIqTest: 'Commencer le test IQ',
    startIqAria: 'Commencer l’évaluation IQ pour la recherche de fournisseurs'
  }
};

const EN_SCHOLARSHIPS_INTRO: ScholarshipsCatalogIntroCopy = {
  title: 'How to use this scholarship catalog',
  body: 'Start broad, then narrow by eligibility, deadline, award value, documents, location, and application effort. Prioritize scholarships where your profile clearly matches the provider rules and where the deadline and application path are clear.',
  tips: [
    'Check eligibility first',
    'Sort by deadline urgency',
    'Compare effort vs award',
    'Confirm the official source',
    'Save realistic options'
  ],
  mistakesTitle: 'Common mistakes to avoid',
  mistakes: [
    'Applying from the title alone',
    'Ignoring citizenship or residency rules',
    'Missing deadline timezone details',
    'Not checking payout or renewal terms',
    'Submitting before documents are ready',
    'Trusting unclear sources'
  ],
  quickLinks: [
    { label: 'No essay scholarships', href: '/scholarships/no-essay' },
    { label: 'Easy apply scholarships', href: '/scholarships/hub/easy-apply' },
    {
      label: 'International students',
      href: '/scholarships/hub/international-friendly'
    },
    {
      label: 'Verification methodology',
      href: '/scholarship-verification-methodology'
    },
    { label: 'Scam warning signs', href: '/scholarship-scam-warning' }
  ]
};

const ES_SCHOLARSHIPS_INTRO: ScholarshipsCatalogIntroCopy = {
  title: 'Cómo usar este catálogo de becas',
  body: 'Empieza amplio y luego filtra por elegibilidad, fecha, monto, documentos, ubicación y esfuerzo. Prioriza becas donde tu perfil encaje con las reglas del proveedor y la ruta de solicitud sea clara.',
  tips: [
    'Revisa elegibilidad primero',
    'Ordena por urgencia de fecha',
    'Compara esfuerzo vs monto',
    'Confirma la fuente oficial',
    'Guarda opciones realistas'
  ],
  mistakesTitle: 'Errores frecuentes',
  mistakes: [
    'Aplicar solo por el título',
    'Ignorar reglas de ciudadanía o residencia',
    'Perder detalles de zona horaria',
    'No revisar pago o renovación',
    'Enviar antes de tener documentos',
    'Confiar en fuentes poco claras'
  ],
  quickLinks: [
    { label: 'Becas sin ensayo', href: '/scholarships/no-essay' },
    { label: 'Becas de solicitud fácil', href: '/scholarships/hub/easy-apply' },
    {
      label: 'Estudiantes internacionales',
      href: '/scholarships/hub/international-friendly'
    },
    {
      label: 'Metodología de verificación',
      href: '/scholarship-verification-methodology'
    },
    { label: 'Señales de fraude', href: '/scholarship-scam-warning' }
  ]
};

const FR_SCHOLARSHIPS_INTRO: ScholarshipsCatalogIntroCopy = {
  title: 'Comment utiliser ce catalogue de bourses',
  body: 'Commencez large, puis affinez par admissibilité, date, montant, documents, lieu et effort. Priorisez les bourses où votre profil correspond clairement aux règles du fournisseur et où la voie de candidature est claire.',
  tips: [
    'Vérifiez l’admissibilité d’abord',
    'Triez par urgence de date',
    'Comparez effort vs montant',
    'Confirmez la source officielle',
    'Enregistrez des options réalistes'
  ],
  mistakesTitle: 'Erreurs fréquentes',
  mistakes: [
    'Postuler sur le titre seul',
    'Ignorer citoyenneté ou résidence',
    'Oublier le fuseau horaire',
    'Ne pas vérifier paiement ou renouvellement',
    'Envoyer avant les documents',
    'Faire confiance à des sources floues'
  ],
  quickLinks: [
    { label: 'Bourses sans essai', href: '/scholarships/no-essay' },
    {
      label: 'Bourses à candidature facile',
      href: '/scholarships/hub/easy-apply'
    },
    {
      label: 'Étudiants internationaux',
      href: '/scholarships/hub/international-friendly'
    },
    {
      label: 'Méthode de vérification',
      href: '/scholarship-verification-methodology'
    },
    { label: 'Signes d’arnaque', href: '/scholarship-scam-warning' }
  ]
};

export function getEssaysHubUiCopy(locale: LocalizedUiLocale): EssaysHubUiCopy {
  if (locale === 'es') return ES_ESSAYS;
  if (locale === 'fr') return FR_ESSAYS;
  return EN_ESSAYS;
}

export function getCompareHubUiCopy(locale: LocalizedUiLocale): CompareHubUiCopy {
  if (locale === 'es') return ES_COMPARE;
  if (locale === 'fr') return FR_COMPARE;
  return EN_COMPARE;
}

export function getResourcesHubUiCopy(locale: LocalizedUiLocale): ResourcesHubUiCopy {
  if (locale === 'es') return ES_RESOURCES;
  if (locale === 'fr') return FR_RESOURCES;
  return EN_RESOURCES;
}

export function getProvidersHubUiCopy(locale: LocalizedUiLocale): ProvidersHubUiCopy {
  if (locale === 'es') return ES_PROVIDERS;
  if (locale === 'fr') return FR_PROVIDERS;
  return EN_PROVIDERS;
}

export function getScholarshipsCatalogIntroCopy(
  locale: LocalizedUiLocale
): ScholarshipsCatalogIntroCopy {
  if (locale === 'es') return ES_SCHOLARSHIPS_INTRO;
  if (locale === 'fr') return FR_SCHOLARSHIPS_INTRO;
  return EN_SCHOLARSHIPS_INTRO;
}

export type HubToolbarUiCopy = {
  searchByKeyword: string;
  searchByKeywordAria: string;
  categories: string;
  filters: string;
  showingRange: (
    from: number,
    to: number,
    total: number,
    unit?: string
  ) => string;
  readMore: string;
};

export type HubIqPromoUiCopy = {
  featuredTool: string;
  iqBadge: string;
  assessment: string;
  startIqTest: string;
  buildSmarterStrategy: string;
  buildSmarterStrategyBody: string;
  notSureWhatToRead: string;
  notSureWhatToReadBody: string;
  findBestNextMove: string;
  personalized: string;
  strategyFit: string;
  mapCognitiveDna: string;
  mapCognitiveDnaBodyFirst: string;
  mapCognitiveDnaBodyLast: string;
  iqAssessmentTitle: string;
  iqAssessmentBody: string;
  startIqAria: string;
};

const EN_TOOLBAR: HubToolbarUiCopy = {
  searchByKeyword: 'Search by keyword',
  searchByKeywordAria: 'Search by keyword',
  categories: 'Categories',
  filters: 'Filters',
  showingRange: (from, to, total, unit) =>
    `Showing ${from}–${to} of ${total}${unit ? ` ${unit}` : ''}`,
  readMore: 'Read more →'
};

const ES_TOOLBAR: HubToolbarUiCopy = {
  searchByKeyword: 'Buscar por palabra clave',
  searchByKeywordAria: 'Buscar por palabra clave',
  categories: 'Categorías',
  filters: 'Filtros',
  showingRange: (from, to, total, unit) =>
    `Mostrando ${from}–${to} de ${total}${unit ? ` ${unit}` : ''}`,
  readMore: 'Leer más →'
};

const FR_TOOLBAR: HubToolbarUiCopy = {
  searchByKeyword: 'Rechercher par mot-clé',
  searchByKeywordAria: 'Rechercher par mot-clé',
  categories: 'Catégories',
  filters: 'Filtres',
  showingRange: (from, to, total, unit) =>
    `Affichage ${from}–${to} sur ${total}${unit ? ` ${unit}` : ''}`,
  readMore: 'Lire la suite →'
};

const EN_IQ: HubIqPromoUiCopy = {
  featuredTool: 'Featured Tool',
  iqBadge: 'IQ',
  assessment: 'Assessment',
  startIqTest: 'Start IQ test',
  buildSmarterStrategy: 'Build a smarter scholarship strategy',
  buildSmarterStrategyBody:
    'Use your Brain Archetype to choose the guides, essays, and application tactics that match how you think and work best.',
  notSureWhatToRead: 'Not sure what to read next?',
  notSureWhatToReadBody:
    'Discover whether your scholarship strategy should focus on essays, deadlines, research, or fast applications.',
  findBestNextMove: 'Find your best next move',
  personalized: 'Personalized',
  strategyFit: 'Strategy Fit',
  mapCognitiveDna: 'Map Your Cognitive DNA',
  mapCognitiveDnaBodyFirst:
    'After your first guide, map your Brain Archetype to sharpen essay strategy.',
  mapCognitiveDnaBodyLast:
    'Before you keep browsing, unlock your reasoning profile.',
  iqAssessmentTitle: 'IQ Assessment for Scholarship Applicants',
  iqAssessmentBody:
    'Identify your Brain Archetype through logic, spatial reasoning, and pattern recognition before prioritizing applications.',
  startIqAria: 'Start IQ assessment for scholarship applicants'
};

const ES_IQ: HubIqPromoUiCopy = {
  featuredTool: 'Herramienta destacada',
  iqBadge: 'IQ',
  assessment: 'Evaluación',
  startIqTest: 'Iniciar prueba IQ',
  buildSmarterStrategy: 'Construye una estrategia de becas más inteligente',
  buildSmarterStrategyBody:
    'Usa tu arquetipo cerebral para elegir guías, ensayos y tácticas de solicitud que encajen contigo.',
  notSureWhatToRead: '¿No sabes qué leer después?',
  notSureWhatToReadBody:
    'Descubre si tu estrategia debe centrarse en ensayos, fechas, investigación o solicitudes rápidas.',
  findBestNextMove: 'Encuentra tu mejor siguiente paso',
  personalized: 'Personalizado',
  strategyFit: 'Ajuste estratégico',
  mapCognitiveDna: 'Mapea tu ADN cognitivo',
  mapCognitiveDnaBodyFirst:
    'Después de tu primera guía, mapea tu arquetipo cerebral para afinar la estrategia del ensayo.',
  mapCognitiveDnaBodyLast:
    'Antes de seguir navegando, desbloquea tu perfil de razonamiento.',
  iqAssessmentTitle: 'Evaluación IQ para solicitantes de becas',
  iqAssessmentBody:
    'Identifica tu arquetipo cerebral con lógica, razonamiento espacial y patrones antes de priorizar solicitudes.',
  startIqAria: 'Iniciar evaluación IQ para becas'
};

const FR_IQ: HubIqPromoUiCopy = {
  featuredTool: 'Outil en vedette',
  iqBadge: 'IQ',
  assessment: 'Évaluation',
  startIqTest: 'Commencer le test IQ',
  buildSmarterStrategy: 'Construisez une stratégie de bourses plus intelligente',
  buildSmarterStrategyBody:
    'Utilisez votre archétype cognitif pour choisir guides, essais et tactiques adaptés à votre façon de travailler.',
  notSureWhatToRead: 'Vous ne savez pas quoi lire ensuite ?',
  notSureWhatToReadBody:
    'Découvrez si votre stratégie doit privilégier les essais, les dates, la recherche ou les candidatures rapides.',
  findBestNextMove: 'Trouvez votre prochaine meilleure étape',
  personalized: 'Personnalisé',
  strategyFit: 'Adéquation stratégique',
  mapCognitiveDna: 'Cartographiez votre ADN cognitif',
  mapCognitiveDnaBodyFirst:
    'Après votre premier guide, cartographiez votre archétype cognitif pour affiner la stratégie d’essai.',
  mapCognitiveDnaBodyLast:
    'Avant de continuer, débloquez votre profil de raisonnement.',
  iqAssessmentTitle: 'Évaluation IQ pour candidats aux bourses',
  iqAssessmentBody:
    'Identifiez votre archétype cognitif par la logique, le raisonnement spatial et les motifs avant de prioriser les candidatures.',
  startIqAria: 'Commencer l’évaluation IQ pour les bourses'
};

export function getHubToolbarUiCopy(locale: LocalizedUiLocale): HubToolbarUiCopy {
  if (locale === 'es') return ES_TOOLBAR;
  if (locale === 'fr') return FR_TOOLBAR;
  return EN_TOOLBAR;
}

export function getHubIqPromoUiCopy(locale: LocalizedUiLocale): HubIqPromoUiCopy {
  if (locale === 'es') return ES_IQ;
  if (locale === 'fr') return FR_IQ;
  return EN_IQ;
}
