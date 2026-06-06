import type { LocalizedUiLocale } from '@/lib/i18n/localizedHref';

export type HomeTrustCardCopy = {
  title: string;
  body: string;
  cta: string;
  href: string;
};

export type HomePageCopy = {
  h1: string;
  heroSubtext: string;
  heroImageAlt: string;
  ctaFind: string;
  heroTrustLine: string;
  howWorksTitle: string;
  howWorksSubtext: string;
  steps: Array<{ step: string; title: string; text: string }>;
  intelligenceEyebrow: string;
  intelligenceTitle: string;
  intelligenceBody: string;
  verifyCta: string;
  rankCta: string;
  dataStandardsTitle: string;
  dataStandardItems: readonly string[];
  audienceTitle: string;
  audienceItems: readonly string[];
  whyStudentsTitle: string;
  whyStudentsP1: string;
  whyStudentsP2: string;
  whyStudentsP3: string;
  whyStudentsSimple: string;
  workflowTitle: string;
  workflowSubtext: string;
  workflowBullets: readonly string[];
  previewMatchesTitle: string;
  previewNewBadge: string;
  upgradeTitle: string;
  upgradeSubtext: string;
  explorePremium: string;
  trustStrip: {
    title: string;
    cards: HomeTrustCardCopy[];
  };
  whatWeVerify: {
    title: string;
    subtitle: string;
    items: Array<{ title: string; body: string }>;
    cta: string;
    ctaHref: string;
  };
  guidedEssay: {
    title: string;
    body: string;
    steps: readonly string[];
    disclaimer: string;
    tryCta: string;
    playVideoAria: string;
    essayHref: string;
  };
  finalCta: {
    title: string;
    subtitle: string;
    trustLine: string;
  };
  internationalGrants: {
    badge: string;
    titleLine1: string;
    titleLine2: string;
    body: string;
    cta: string;
    destinationsLabel: string;
    destinationsCountTemplate: string;
    scholarshipsTracked: string;
    knownAwardValue: string;
    countryListingsTemplate: string;
    countryAriaTemplate: string;
    countriesRegionAria: string;
    getScholarshipsHref: string;
  };
  featuredResources: {
    title: string;
    subtitle: string;
    empty: string;
    browseAll: string;
    essayGuides: string;
    cardFallbackDescription: string;
    resourcesHref: string;
    essaysHref: string;
  };
  featuredBrands: {
    title: string;
    disclaimer: string;
    scrollLeft: string;
    scrollRight: string;
  };
};

const EN: HomePageCopy = {
  h1: 'Find scholarships that fit you in 2 minutes',
  heroSubtext:
    'Answer a few quick questions and find scholarships you can apply for today',
  ctaFind: 'Find My Scholarships',
  heroTrustLine:
    'Structured listings • Updated regularly • Provider application links. Takes less than a minute to get started.',
  howWorksTitle: 'How ScholarshipTop works',
  howWorksSubtext:
    'A simpler workflow for finding scholarships worth your time.',
  steps: [
    {
      step: '1',
      title: 'Create your profile',
      text: 'Tell us about your academic level, background, interests, and goals.'
    },
    {
      step: '2',
      title: 'See better-fit matches',
      text: 'We surface scholarships that are more relevant to your profile and filters.'
    },
    {
      step: '3',
      title: 'Track and apply',
      text: 'Save opportunities, watch deadlines, and use provider application paths when ready.'
    }
  ],
  intelligenceEyebrow: 'Scholarship intelligence',
  intelligenceTitle: 'What ScholarshipTop adds on top of raw listings',
  intelligenceBody:
    'We organize scholarships by fit, deadline, requirements, award value, source status, and application effort so students can decide what is worth saving and preparing.',
  verifyCta: 'See our data standards',
  rankCta: 'How recommendations work',
  dataStandardsTitle: 'Scholarship data standards',
  dataStandardItems: [
    'Provider path status',
    'Last reviewed or review status',
    'Deadline clarity',
    'Eligibility clarity',
    'Application effort',
    'Missing-data flags'
  ],
  audienceTitle: 'Who ScholarshipTop is for',
  audienceItems: [
    'International students comparing country rules',
    'High school seniors building a realistic shortlist',
    'Undergraduate and graduate students checking fit',
    'Students who want to avoid unclear or outdated listings',
    'Applicants who need deadlines, documents, and next steps in one place'
  ],
  whyStudentsTitle: 'Why students use ScholarshipTop',
  whyStudentsP1: "Thousands of listings — most won't match your profile.",
  whyStudentsP2:
    'Hours go into searching and filtering; strong fits still get missed.',
  whyStudentsP3: 'Deadlines slip. Good options disappear.',
  whyStudentsSimple: 'We make it simple.',
  workflowTitle: 'Your scholarship workflow',
  workflowSubtext:
    'A focused dashboard preview — matches, saves, and signals in one place so you can move from discovery to application without tab chaos.',
  workflowBullets: [
    'See scholarships that match your profile',
    'Save the ones you like',
    "Ignore what doesn't fit",
    'Stay focused on what matters'
  ],
  previewMatchesTitle: 'Matches for you',
  previewNewBadge: 'New',
  upgradeTitle: 'Why students upgrade',
  upgradeSubtext:
    'Go deeper with advanced matching, precision filters, saved views, and full essay support — built for students who want a serious, repeatable application pipeline.',
  explorePremium: 'Explore Premium',
  heroImageAlt:
    'Student organizing scholarship search with a clearer path forward',
  trustStrip: {
    title: 'Built to reduce guesswork',
    cards: [
      {
        title: 'Verified listings',
        body: 'We review key scholarship details before surfacing opportunities to students.',
        cta: 'Read methodology',
        href: '/scholarship-verification-methodology'
      },
      {
        title: 'Updated regularly',
        body: 'We work to keep deadlines, eligibility notes, and award details current as programs change.',
        cta: 'Report a correction',
        href: '/corrections'
      },
      {
        title: 'Application-path workflow',
        body: 'Provider links and application-path signals are organized with each listing when available.',
        cta: 'How ScholarshipTop works',
        href: '/how-scholarshiptop-works'
      }
    ]
  },
  whatWeVerify: {
    title: 'What we organize',
    subtitle:
      'Clear signals so you can evaluate opportunities quickly — before you invest time in an application.',
    items: [
      {
        title: 'Eligibility signals',
        body: 'We summarize degree level, residency, field, and other common requirements so you can spot fit faster.'
      },
      {
        title: 'Deadlines and award details',
        body: 'We track dates and amounts as stated by the provider when the listing was last reviewed — and flag when details look incomplete.'
      },
      {
        title: 'Where to apply next',
        body: 'We prioritize provider-hosted application paths and next-step links when available.'
      }
    ],
    cta: 'See how ScholarshipTop works',
    ctaHref: '/how-scholarshiptop-works'
  },
  guidedEssay: {
    title: 'Guided essay support for scholarship applications',
    body: 'Use AI tools to brainstorm, structure, and refine your ideas based on your own experiences and goals.',
    steps: [
      'Understand the prompt',
      'Build your angle',
      'Create a strong outline',
      'Refine your draft'
    ],
    disclaimer:
      'Designed to support your writing process, not replace your judgment or your voice.',
    tryCta: 'Try Essay Mentor',
    playVideoAria:
      'Play video: guided essay support for scholarship applications',
    essayHref: '/essay'
  },
  finalCta: {
    title: 'Start with clearer matches',
    subtitle:
      'Build your profile once — then focus on deadlines and applications that fit.',
    trustLine:
      'Structured listings • Updated regularly • Provider application links'
  },
  internationalGrants: {
    badge: 'US & International programs',
    titleLine1: 'Study grants in',
    titleLine2: 'the US & beyond',
    body: "Find funding in the world's leading colleges and universities. We've combined the largest US grant database with international programs to support your talent anywhere on the globe.",
    cta: 'Match me with grants',
    destinationsLabel: 'Top destinations in our catalog',
    destinationsCountTemplate: '{count} destinations',
    scholarshipsTracked: 'scholarships tracked live',
    knownAwardValue: 'known listed award value',
    countryListingsTemplate: '{count} listings',
    countryAriaTemplate:
      '{label}: {count} scholarship listings — start matching',
    countriesRegionAria: 'Top countries by scholarship listing count',
    getScholarshipsHref: '/get-scholarships'
  },
  featuredResources: {
    title: 'Resource hub',
    subtitle:
      'Guides and articles to help you navigate applications with more confidence.',
    empty:
      'New guides are added regularly — browse the hubs below to see everything we have published.',
    browseAll: 'Browse all resources',
    essayGuides: 'Essay guides',
    cardFallbackDescription:
      'Open the full piece for the complete walkthrough and tips.',
    resourcesHref: '/resources',
    essaysHref: '/essays'
  },
  featuredBrands: {
    title: 'Examples from our scholarship catalog',
    disclaimer:
      'Listings shown here are examples from our catalog and do not imply sponsorship or endorsement unless clearly stated.',
    scrollLeft: 'Scroll scholarships left',
    scrollRight: 'Scroll scholarships right'
  }
};

const ES: HomePageCopy = {
  h1: 'Encuentra becas que encajen contigo en 2 minutos',
  heroSubtext:
    'Responde unas preguntas rápidas y descubre becas a las que puedes aplicar hoy',
  ctaFind: 'Encontrar mis becas',
  heroTrustLine:
    'Listados estructurados • Actualizados con frecuencia • Enlaces de solicitud del proveedor. Empieza en menos de un minuto.',
  howWorksTitle: 'Cómo funciona ScholarshipTop',
  howWorksSubtext:
    'Un flujo más simple para encontrar becas que valgan tu tiempo.',
  steps: [
    {
      step: '1',
      title: 'Crea tu perfil',
      text: 'Cuéntanos tu nivel académico, contexto, intereses y metas.'
    },
    {
      step: '2',
      title: 'Ve mejores coincidencias',
      text: 'Mostramos becas más relevantes para tu perfil y filtros.'
    },
    {
      step: '3',
      title: 'Haz seguimiento y aplica',
      text: 'Guarda oportunidades, vigila fechas y usa rutas de solicitud del proveedor cuando estes listo.'
    }
  ],
  intelligenceEyebrow: 'Inteligencia de becas',
  intelligenceTitle: 'Qué añade ScholarshipTop a los listados',
  intelligenceBody:
    'Organizamos becas por ajuste, fecha, requisitos, monto, fuente y esfuerzo para decidir que guardar y preparar.',
  verifyCta: 'Ver estandares de datos',
  rankCta: 'Cómo funcionan las recomendaciones',
  dataStandardsTitle: 'Estándares de datos de becas',
  dataStandardItems: EN.dataStandardItems.map((item) =>
    item
      .replace('Provider path status', 'Estado de ruta del proveedor')
      .replace('Last reviewed or review status', 'Última revisión o estado')
      .replace('Deadline clarity', 'Claridad de fecha límite')
      .replace('Eligibility clarity', 'Claridad de elegibilidad')
      .replace('Application effort', 'Esfuerzo de solicitud')
      .replace('Missing-data flags', 'Señales de datos incompletos')
  ),
  audienceTitle: 'Para quién es ScholarshipTop',
  audienceItems: [
    'Estudiantes internacionales que comparan reglas por país',
    'Bachillerato que arma una lista realista',
    'Pregrado y posgrado que verifican ajuste',
    'Quienes quieren evitar listados poco claros o desactualizados',
    'Solicitantes que necesitan fechas, documentos y pasos en un solo lugar'
  ],
  whyStudentsTitle: 'Por qué usan ScholarshipTop',
  whyStudentsP1: 'Miles de listados — la mayoría no encaja con tu perfil.',
  whyStudentsP2: 'Horas de búsqueda y filtros; aún se pierden buenas opciones.',
  whyStudentsP3: 'Las fechas pasan. Desaparecen buenas oportunidades.',
  whyStudentsSimple: 'Lo hacemos simple.',
  workflowTitle: 'Tu flujo de becas',
  workflowSubtext:
    'Vista previa del panel: coincidencias, guardados y señales en un lugar para pasar de descubrimiento a solicitud sin caos de pestañas.',
  workflowBullets: [
    'Ve becas que encajan con tu perfil',
    'Guarda las que te interesan',
    'Ignora lo que no encaja',
    'Mantén el foco en lo importante'
  ],
  previewMatchesTitle: 'Coincidencias para ti',
  previewNewBadge: 'Nuevo',
  upgradeTitle: 'Por qué actualizan a Premium',
  upgradeSubtext:
    'Más profundidad con coincidencias avanzadas, filtros precisos, vistas guardadas y apoyo completo de ensayos — para un pipeline serio y repetible.',
  explorePremium: 'Explorar Premium',
  heroImageAlt:
    'Estudiante organizando la búsqueda de becas con un camino más claro',
  trustStrip: {
    title: 'Hecho para reducir la incertidumbre',
    cards: [
      {
        title: 'Listados verificados',
        body: 'Revisamos datos clave de becas antes de mostrar oportunidades a estudiantes.',
        cta: 'Leer metodología',
        href: '/scholarship-verification-methodology'
      },
      {
        title: 'Actualizados con frecuencia',
        body: 'Trabajamos para mantener fechas, elegibilidad y montos al día cuando los programas cambian.',
        cta: 'Reportar una corrección',
        href: '/corrections'
      },
      {
        title: 'Flujo con ruta de solicitud',
        body: 'Los enlaces del proveedor y las senales de ruta de solicitud se organizan con cada listado cuando estan disponibles.',
        cta: 'Como funciona ScholarshipTop',
        href: '/how-scholarshiptop-works'
      }
    ]
  },
  whatWeVerify: {
    title: 'Que organizamos',
    subtitle:
      'Señales claras para evaluar oportunidades rápido — antes de invertir tiempo en una solicitud.',
    items: [
      {
        title: 'Señales de elegibilidad',
        body: 'Resumimos nivel académico, residencia, campo y otros requisitos comunes para ver ajuste más rápido.'
      },
      {
        title: 'Fechas y detalles del premio',
        body: 'Seguimos fechas y montos según el proveedor en la última revisión — y marcamos datos incompletos.'
      },
      {
        title: 'Dónde aplicar',
        body: 'Priorizamos rutas alojadas por el proveedor y enlaces de siguiente paso cuando estan disponibles.'
      }
    ],
    cta: 'Ver cómo funciona ScholarshipTop',
    ctaHref: '/how-scholarshiptop-works'
  },
  guidedEssay: {
    title: 'Apoyo guiado para ensayos de becas',
    body: 'Usa herramientas de IA para idear, estructurar y refinar ideas basadas en tu experiencia y metas.',
    steps: [
      'Entiende el prompt',
      'Define tu enfoque',
      'Crea un esquema sólido',
      'Refina tu borrador'
    ],
    disclaimer:
      'Apoya tu proceso de escritura, no reemplaza tu criterio ni tu voz.',
    tryCta: 'Probar Essay Mentor',
    playVideoAria: 'Reproducir video: apoyo guiado de ensayos para becas',
    essayHref: '/essay'
  },
  finalCta: {
    title: 'Empieza con coincidencias más claras',
    subtitle:
      'Crea tu perfil una vez — luego enfócate en fechas y solicitudes que encajen.',
    trustLine:
      'Listados estructurados • Actualizados con frecuencia • Enlaces de solicitud del proveedor'
  },
  internationalGrants: {
    badge: 'Programas en EE. UU. e internacionales',
    titleLine1: 'Becas para estudiar en',
    titleLine2: 'EE. UU. y más allá',
    body: 'Encuentra financiación en universidades líderes. Combinamos el mayor catálogo de becas de EE. UU. con programas internacionales.',
    cta: 'Encontrar becas para mí',
    destinationsLabel: 'Destinos principales en el catálogo',
    destinationsCountTemplate: '{count} destinos',
    scholarshipsTracked: 'becas activas en seguimiento',
    knownAwardValue: 'valor de premios listados conocido',
    countryListingsTemplate: '{count} listados',
    countryAriaTemplate:
      '{label}: {count} listados de becas — empezar a buscar',
    countriesRegionAria: 'Países principales por cantidad de listados',
    getScholarshipsHref: '/get-scholarships'
  },
  featuredResources: {
    title: 'Centro de recursos',
    subtitle: 'Guías y artículos para navegar solicitudes con más confianza.',
    empty:
      'Añadimos guías con frecuencia — explora los hubs abajo para ver todo lo publicado.',
    browseAll: 'Ver todos los recursos',
    essayGuides: 'Guías de ensayos',
    cardFallbackDescription:
      'Abre el artículo completo para el recorrido y consejos.',
    resourcesHref: '/resources',
    essaysHref: '/essays'
  },
  featuredBrands: {
    title: 'Ejemplos de nuestro catálogo de becas',
    disclaimer:
      'Los listados mostrados son ejemplos del catálogo y no implican patrocinio ni respaldo salvo indicación clara.',
    scrollLeft: 'Desplazar becas a la izquierda',
    scrollRight: 'Desplazar becas a la derecha'
  }
};

const FR: HomePageCopy = {
  h1: 'Trouvez des bourses adaptées en 2 minutes',
  heroSubtext:
    'Répondez à quelques questions et découvrez des bourses auxquelles vous pouvez postuler aujourd’hui',
  ctaFind: 'Trouver mes bourses',
  heroTrustLine:
    'Listes structurees • Mises a jour regulierement • Liens de candidature fournisseur. Commencez en moins d une minute.',
  howWorksTitle: 'Comment fonctionne ScholarshipTop',
  howWorksSubtext:
    'Un parcours plus simple pour trouver des bourses qui valent votre temps.',
  steps: [
    {
      step: '1',
      title: 'Créez votre profil',
      text: 'Indiquez votre niveau, parcours, intérêts et objectifs.'
    },
    {
      step: '2',
      title: 'Voyez de meilleures correspondances',
      text: 'Nous mettons en avant les bourses les plus pertinentes pour votre profil.'
    },
    {
      step: '3',
      title: 'Suivez et postulez',
      text: 'Enregistrez les opportunites, surveillez les dates et utilisez les voies de candidature fournisseur quand vous etes pret.'
    }
  ],
  intelligenceEyebrow: 'Intelligence bourses',
  intelligenceTitle: 'Ce que ScholarshipTop ajoute aux listes brutes',
  intelligenceBody:
    'Nous organisons les bourses par adequation, date, exigences, montant, source et effort pour decider quoi enregistrer et preparer.',
  verifyCta: 'Voir nos standards de donnees',
  rankCta: 'Comment fonctionnent les recommandations',
  dataStandardsTitle: 'Standards de données',
  dataStandardItems: [
    'Statut de voie fournisseur',
    'Dernière révision ou statut',
    'Clarté des dates',
    'Clarté d’admissibilité',
    'Effort de candidature',
    'Signaux de données manquantes'
  ],
  audienceTitle: 'Pour qui est ScholarshipTop',
  audienceItems: [
    'Étudiants internationaux comparant les règles par pays',
    'Lycéens construisant une liste réaliste',
    'Étudiants de premier cycle et cycles supérieurs',
    'Ceux qui veulent éviter les listes floues ou obsolètes',
    'Candidats qui ont besoin des dates, documents et étapes au même endroit'
  ],
  whyStudentsTitle: 'Pourquoi les étudiants utilisent ScholarshipTop',
  whyStudentsP1:
    'Des milliers de listes — la plupart ne correspondent pas à votre profil.',
  whyStudentsP2:
    'Des heures de recherche et de filtres ; de bonnes options passent encore à côté.',
  whyStudentsP3: 'Les dates passent. De bonnes options disparaissent.',
  whyStudentsSimple: 'Nous simplifions.',
  workflowTitle: 'Votre flux de bourses',
  workflowSubtext:
    'Aperçu du tableau de bord : correspondances, favoris et signaux au même endroit pour passer de la découverte à la candidature sans chaos d’onglets.',
  workflowBullets: [
    'Voir les bourses qui correspondent à votre profil',
    'Enregistrer celles qui vous intéressent',
    'Ignorer ce qui ne convient pas',
    'Rester concentré sur l’essentiel'
  ],
  previewMatchesTitle: 'Correspondances pour vous',
  previewNewBadge: 'Nouveau',
  upgradeTitle: 'Pourquoi passer à Premium',
  upgradeSubtext:
    'Allez plus loin avec correspondances avancées, filtres précis, vues enregistrées et aide complète à la rédaction — pour un pipeline sérieux et répétable.',
  explorePremium: 'Découvrir Premium',
  heroImageAlt:
    'Étudiant organisant sa recherche de bourses avec un parcours plus clair',
  trustStrip: {
    title: 'Conçu pour réduire l’incertitude',
    cards: [
      {
        title: 'Listes vérifiées',
        body: 'Nous examinons les détails clés des bourses avant de les présenter aux étudiants.',
        cta: 'Lire la méthode',
        href: '/scholarship-verification-methodology'
      },
      {
        title: 'Mises à jour régulièrement',
        body: 'Nous visons à garder dates, critères et montants à jour quand les programmes changent.',
        cta: 'Signaler une correction',
        href: '/corrections'
      },
      {
        title: 'Parcours de candidature',
        body: 'Les liens fournisseur et les signaux de voie de candidature sont organises avec chaque fiche quand ils sont disponibles.',
        cta: 'Comment fonctionne ScholarshipTop',
        href: '/how-scholarshiptop-works'
      }
    ]
  },
  whatWeVerify: {
    title: 'Ce que nous organisons',
    subtitle:
      'Des signaux clairs pour évaluer rapidement — avant d’investir du temps dans une candidature.',
    items: [
      {
        title: 'Signaux d’admissibilité',
        body: 'Nous résumons niveau, résidence, domaine et autres critères courants pour repérer l’adéquation plus vite.'
      },
      {
        title: 'Dates et détails du montant',
        body: 'Nous suivons dates et montants selon le fournisseur à la dernière révision — et signalons les lacunes.'
      },
      {
        title: 'Où postuler ensuite',
        body: 'Nous priorisons les voies de candidature hebergees par le fournisseur et les liens de prochaine etape quand ils sont disponibles.'
      }
    ],
    cta: 'Voir comment fonctionne ScholarshipTop',
    ctaHref: '/how-scholarshiptop-works'
  },
  guidedEssay: {
    title: 'Aide guidée à la rédaction pour bourses',
    body: 'Utilisez des outils IA pour structurer et affiner vos idées à partir de votre expérience et de vos objectifs.',
    steps: [
      'Comprendre la consigne',
      'Définir votre angle',
      'Créer un plan solide',
      'Affiner le brouillon'
    ],
    disclaimer:
      'Soutient votre processus d’écriture, sans remplacer votre jugement ni votre voix.',
    tryCta: 'Essayer Essay Mentor',
    playVideoAria: 'Lire la vidéo : aide guidée à la rédaction pour bourses',
    essayHref: '/essay'
  },
  finalCta: {
    title: 'Commencez avec des correspondances plus claires',
    subtitle:
      'Créez votre profil une fois — puis concentrez-vous sur les dates et candidatures adaptées.',
    trustLine:
      'Listes structurees • Mises a jour regulierement • Liens de candidature fournisseur'
  },
  internationalGrants: {
    badge: 'Programmes aux États-Unis et internationaux',
    titleLine1: 'Bourses pour étudier aux',
    titleLine2: 'États-Unis et ailleurs',
    body: 'Trouvez un financement dans les universités leaders. Nous combinons le plus grand catalogue américain avec des programmes internationaux.',
    cta: 'Trouver des bourses pour moi',
    destinationsLabel: 'Principales destinations du catalogue',
    destinationsCountTemplate: '{count} destinations',
    scholarshipsTracked: 'bourses suivies en direct',
    knownAwardValue: 'montant de bourses listé connu',
    countryListingsTemplate: '{count} listes',
    countryAriaTemplate:
      '{label} : {count} listes de bourses — commencer la recherche',
    countriesRegionAria: 'Pays principaux par nombre de listes',
    getScholarshipsHref: '/get-scholarships'
  },
  featuredResources: {
    title: 'Centre de ressources',
    subtitle: 'Guides et articles pour candidater avec plus de confiance.',
    empty:
      'De nouveaux guides sont ajoutés régulièrement — parcourez les hubs ci-dessous.',
    browseAll: 'Voir toutes les ressources',
    essayGuides: 'Guides de rédaction',
    cardFallbackDescription:
      'Ouvrez l’article complet pour le parcours et les conseils.',
    resourcesHref: '/resources',
    essaysHref: '/essays'
  },
  featuredBrands: {
    title: 'Exemples de notre catalogue de bourses',
    disclaimer:
      'Les listes affichées sont des exemples du catalogue et n’impliquent pas de parrainage sauf mention contraire.',
    scrollLeft: 'Faire défiler les bourses vers la gauche',
    scrollRight: 'Faire défiler les bourses vers la droite'
  }
};

export function getHomePageCopy(locale: LocalizedUiLocale): HomePageCopy {
  if (locale === 'es') return ES;
  if (locale === 'fr') return FR;
  return EN;
}
