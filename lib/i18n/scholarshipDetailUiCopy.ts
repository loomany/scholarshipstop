import type { Scholarship } from '@/app/scholarships/scholarshipsData';
import type { LocalizedUiLocale } from '@/lib/i18n/localizedHref';

export type ScholarshipDetailUiCopy = {
  backToMatches: string;
  scholarshipsHub: string;
  home: string;
  breadcrumbAria: string;
  notFound: string;
  failedToLoad: string;
  loadingScholarship: string;
  deadline: string;
  deadlinePassed: string;
  deadlineSecondary: string;
  deadlinePassedNotice: string;
  awardAmount: string;
  applicants: string;
  requirements: string;
  whoCanApply: string;
  verifyEligibilityNote: string;
  sponsorAndApplication: string;
  applyNow: string;
  applyPremiumTitle: string;
  applyLoadingAria: string;
  save: string;
  saved: string;
  saveAria: string;
  removeSavedAria: string;
  notRelevant: string;
  notRelevantAria: string;
  restoreToMatches: string;
  restoreAria: string;
  lastVerifiedPrefix: string;
  confirmOfficialNote: string;
  showMore: string;
  showLess: string;
  studyInPrefix: string;
  studyInMulti: (count: number) => string;
  providerWebsite: string;
  signInToUnlock: string;
  language: string;
  recurring: string;
  urgencyPrefix: string;
  faqHeading: string;
  sections: {
    eligibility: string;
    scholarshipSupport: string;
    applicationDetails: string;
    keyRequirements: (count: number) => string;
    requiredDocuments: string;
    requiredDocumentsNote: string;
    requiredDocumentsNoteGov: string;
    awardPayment: string;
    importantNotes: string;
    aboutProvider: string;
    source: string;
    overview: string;
    applying: string;
    notification: string;
    selectionCriteria: string;
    programDetails: string;
    keyRequirementsNote: string;
    keyRequirementsNoteGov: string;
    keyRequirementsNoteAlt: string;
  };
  quickFacts: {
    title: string;
    status: string;
    studyLevels: string;
    fieldOfStudy: string;
    eligibleInstitutions: string;
    institutionsLockedHint: string;
    location: string;
    numberOfAwards: string;
    payoutMethod: string;
  };
  matchCta: {
    title: string;
    button: string;
  };
  quickDecision: {
    title: string;
    badge: string;
    bestFor: string;
    highlights: string;
    whyApply: string;
    importantChecks: string;
  };
  trust: {
    kicker: string;
    title: string;
    intro: string;
    methodology: string;
    disclaimer: string;
    officialSourceStatus: string;
    reviewStatus: string;
    reviewValueMissing: string;
    reviewBodyWhenPresent: string;
    reviewBodyWhenMissing: string;
    deadlineUrgency: string;
    applicationDifficulty: string;
    missingDetails: string;
    completeListingNote: string;
  };
  ai: {
    badge: string;
    guidanceBadge: string;
    lowConfidenceNote: string;
    whyApplyTitle: string;
    whyApplySubtitle: string;
    applicationTipsTitle: string;
    applicationTipsSubtitle: string;
    nextStepsTitle: string;
    nextStepsSubtitle: string;
    beforeApplyTitle: string;
    beforeApplySubtitle: string;
    importantChecks: string;
    detailsToConfirm: string;
    redFlags: string;
  };
  guestLock: {
    sectionAria: string;
    title: string;
    signIn: string;
  };
  iq: {
    startAria: string;
    featuredTool: string;
    iqBadge: string;
    applicantIntelligence: string;
    assessmentBadge: string;
    cardTitle: string;
    cardBody: string;
    chips: [string, string, string];
    cognitivePreview: string;
    iqLabel: string;
    typeLabel: string;
    startTest: string;
    promoTitle: string;
    promoBody: string;
    assessment: string;
  };
  similar: {
    title: string;
    introBold: string;
    introRest: string;
    categoryPrefix: string;
    allScholarships: string;
    moreInCategory: (label: string) => string;
    browseAll: string;
    openNow: string;
    scholarship: string;
    scholarships: string;
    pastDeadline: string;
    pastDeadlineNote: string;
    sponsorHiddenAria: string;
    geoAria: string;
    browseFilteredAria: (label: string) => string;
    browseMatchingTitle: (label: string) => string;
  };
  related: {
    hubsTitle: string;
    hubsIntro: string;
    compareTitle: string;
    compareIntro: string;
    compareVs: (name: string) => string;
    resourcesTitle: string;
    resourcesIntro: string;
    essaysTitle: string;
    essaysFallback: string;
    essayRequiredTitle: string;
    essayRequiredBody: string;
    essayChecklist: string;
    essayExamples: string;
    essayFinancialNeed: string;
    essayCareerGoals: string;
    essayLeadership: string;
    aiWriterTitle: string;
    aiWriterLink: string;
  };
  toast: {
    saveFailedTitle: string;
    saveFailedDescription: string;
  };
  premium: {
    sponsorHiddenAria: string;
    supportEmailHiddenAria: string;
    supportPhoneHiddenAria: string;
    providerHiddenAria: string;
    eligibilityAria: string;
  };
  requirementChips: {
    essay: string;
    transcript: string;
    recommendation: string;
    documents: string;
    photo: string;
    video: string;
    portfolio: string;
    survey: string;
    shortAnswers: string;
    goals: string;
    specialEligibility: string;
    financialNeed: string;
  };
  payoutMethods: {
    college: string;
    student: string;
    nonMonetary: string;
    notStated: string;
  };
  documents: {
    downloadPdf: string;
    officialDocument: string;
  };
};

const EN: ScholarshipDetailUiCopy = {
  backToMatches: '← Back to Matches',
  scholarshipsHub: 'Scholarships',
  home: 'Home',
  breadcrumbAria: 'Breadcrumb',
  notFound: 'Scholarship not found',
  failedToLoad: 'Failed to load scholarships',
  loadingScholarship: 'Loading scholarship…',
  deadline: 'Deadline',
  deadlinePassed: 'Deadline passed',
  deadlineSecondary: 'Scholarship deadline',
  deadlinePassedNotice:
    'This listed deadline may have passed. Save the opportunity and use the application path to plan for a current or future cycle.',
  awardAmount: 'Award amount',
  applicants: 'Scholarship applicants',
  requirements: 'Requirements',
  whoCanApply: 'Who can apply',
  verifyEligibilityNote:
    'ScholarshipTop organizes eligibility signals so you can compare fit, prepare materials, and move toward the application path with less guesswork.',
  sponsorAndApplication: 'Sponsor & application',
  applyNow: 'Apply now',
  applyPremiumTitle:
    'Upgrade to Premium to unlock organized scholarship details, deadlines, provider application links, saved lists, smart filters, and AI application support in one workspace.',
  applyLoadingAria: 'Loading apply link',
  save: 'Save',
  saved: 'Saved ✓',
  saveAria: 'Save scholarship',
  removeSavedAria: 'Remove from saved',
  notRelevant: 'Not relevant',
  notRelevantAria: 'Hide scholarship from matches',
  restoreToMatches: 'Restore to matches',
  restoreAria: 'Restore scholarship to matches',
  lastVerifiedPrefix: 'Information last verified',
  confirmOfficialNote:
    'ScholarshipTop organizes scholarship details, deadlines, eligibility signals, provider application paths, saved shortlists, and AI help in one workspace so you can move faster from discovery to application.',
  showMore: 'Show more',
  showLess: 'Show less',
  studyInPrefix: 'Study in:',
  studyInMulti: (count) => `Study in: ${count} countries`,
  providerWebsite: 'Provider application path',
  signInToUnlock: 'Sign in to unlock',
  language: 'Language',
  recurring: 'recurring',
  urgencyPrefix: 'Urgency:',
  faqHeading: 'FAQ',
  sections: {
    eligibility: 'Eligibility',
    scholarshipSupport: 'Scholarship Support',
    applicationDetails: 'Application details',
    keyRequirements: (count) => `Key requirements (${count})`,
    requiredDocuments: 'Required documents',
    requiredDocumentsNote:
      'Materials you may need to upload or submit; use this list to prepare faster.',
    requiredDocumentsNoteGov:
      'Use this list to prepare the current opportunity materials.',
    awardPayment: 'Award & payment',
    importantNotes: 'Important notes',
    aboutProvider: 'About the provider',
    source: 'Source',
    overview: 'Overview',
    applying: 'Applying',
    notification: 'Notification',
    selectionCriteria: 'Selection criteria',
    programDetails: 'Program details',
    keyRequirementsNote:
      'Program rules and conditions. Uploads and file types are listed under Required documents.',
    keyRequirementsNoteGov:
      'Requirements and conditions as stated on the federal listing.',
    keyRequirementsNoteAlt:
      'Program rules and conditions to use while preparing your application materials.'
  },
  quickFacts: {
    title: 'Quick facts',
    status: 'Status',
    studyLevels: 'Study levels',
    fieldOfStudy: 'Field of study',
    eligibleInstitutions: 'Eligible institutions',
    institutionsLockedHint:
      'Institution details may name the sponsor — hidden until you subscribe.',
    location: 'Location',
    numberOfAwards: 'Number of awards',
    payoutMethod: 'Payout method'
  },
  matchCta: {
    title: 'Get matched with scholarships in 2 minutes',
    button: 'Find My Scholarships'
  },
  quickDecision: {
    title: 'Quick decision',
    badge: 'AI insights',
    bestFor: 'Best for',
    highlights: 'Key highlights',
    whyApply: 'Why apply',
    importantChecks: 'Important checks'
  },
  trust: {
    kicker: 'ScholarshipTop workspace',
    title: 'Application readiness',
    intro:
      'Use these details to understand fit, prepare materials, save the opportunity, and move toward the provider application path when ready.',
    methodology: 'Data standards',
    disclaimer: 'View matches',
    officialSourceStatus: 'Application path',
    reviewStatus: 'Review status',
    reviewValueMissing: 'Last reviewed date unavailable',
    reviewBodyWhenPresent:
      'ScholarshipTop has a review timestamp for this listing.',
    reviewBodyWhenMissing:
      'This listing has not exposed a manual review date yet.',
    deadlineUrgency: 'Deadline urgency',
    applicationDifficulty: 'Application difficulty',
    missingDetails: 'Details to complete',
    completeListingNote:
      'ScholarshipTop has organized the core listing fields so you can compare fit, prepare materials, track the deadline, and move toward the provider application path when ready.'
  },
  ai: {
    badge: 'AI insights',
    guidanceBadge: 'AI guidance',
    lowConfidenceNote:
      "I'll surface the key details, eligibility signals, likely next steps, and provider application link when available so you can move from shortlist to application faster.",
    whyApplyTitle: 'Why this may be worth applying to',
    whyApplySubtitle:
      'Student-friendly angle based on the organized listing details.',
    applicationTipsTitle: 'Application tips',
    applicationTipsSubtitle:
      'Listing-specific ideas from our AI layer to help you prepare materials and next steps.',
    nextStepsTitle: 'Next steps',
    nextStepsSubtitle:
      'A short checklist so you know what to do after reading the listing.',
    beforeApplyTitle: 'Application plan',
    beforeApplySubtitle:
      'Use these notes to prepare materials, track timing, and move toward submission.',
    importantChecks: 'Application signals',
    detailsToConfirm: 'Details to use',
    redFlags: 'Red flags'
  },
  guestLock: {
    sectionAria: 'Scholarship details require sign-in',
    title: 'Sign in to unlock full access to AI insights',
    signIn: 'Sign in'
  },
  iq: {
    startAria: 'Start IQ assessment',
    featuredTool: 'Featured Tool',
    iqBadge: 'IQ',
    applicantIntelligence: 'Applicant intelligence',
    assessmentBadge: 'IQ assessment',
    cardTitle: 'Is this scholarship worth your time?',
    cardBody:
      'Take a cognitive assessment to see whether your strengths fit essay-heavy, research-heavy, fast-apply, or logic-based scholarship opportunities.',
    chips: ['Essay fit', 'Fast apply', 'Priority clarity'],
    cognitivePreview: 'Cognitive preview',
    iqLabel: 'IQ',
    typeLabel: 'Type',
    startTest: 'Start IQ test',
    promoTitle: 'Find scholarships that fit how you think',
    promoBody:
      'See whether your strengths fit essays, research-heavy awards, or fast applications.',
    assessment: 'Assessment'
  },
  similar: {
    title: 'Similar scholarships',
    introBold: 'Open deadlines first',
    introRest:
      '— same category when possible, then active picks from the catalog. Up to three closed grants from this category are shown at the end for context.',
    categoryPrefix: 'Category:',
    allScholarships: 'All scholarships',
    moreInCategory: (label) => `More scholarships in ${label}`,
    browseAll: 'Browse all scholarships',
    openNow: 'Open now',
    scholarship: 'scholarship',
    scholarships: 'scholarships',
    pastDeadline: 'Past deadline',
    pastDeadlineNote: 'Same category · reference only',
    sponsorHiddenAria: 'Sponsor name hidden until you subscribe.',
    geoAria: 'Host location and eligibility',
    browseFilteredAria: (label) => `Browse scholarships filtered by ${label}`,
    browseMatchingTitle: (label) => `${label} — browse matching scholarships`
  },
  related: {
    hubsTitle: 'Related scholarship hubs',
    hubsIntro: 'Browse curated listings that match this program’s state and field.',
    compareTitle: 'Compare with other universities',
    compareIntro:
      'See how aid and essay expectations differ when this provider is stacked against other schools in our catalog.',
    compareVs: (name) => `vs ${name}`,
    resourcesTitle: 'From our resources',
    resourcesIntro:
      'Articles and guides on this site that mention this program in context.',
    essaysTitle: 'Example essays & guides',
    essaysFallback:
      'A dedicated how-to guide for this program may be added over time. Browse all essay guides from the hub.',
    essayRequiredTitle: 'Need an essay for this scholarship?',
    essayRequiredBody:
      'Start with a checklist, study examples for structure, and choose a prompt guide that matches the application.',
    essayChecklist: 'Essay checklist',
    essayExamples: 'Essay examples',
    essayFinancialNeed: 'Financial need essay',
    essayCareerGoals: 'Career goals essay',
    essayLeadership: 'Leadership essay',
    aiWriterTitle:
      'Need to write an essay for this grant? Use our AI Essay Writer to draft a unique personal statement fast.',
    aiWriterLink: 'Open AI Essay Writer →'
  },
  toast: {
    saveFailedTitle: 'Could not update saved scholarships',
    saveFailedDescription: 'Check your connection and try again.'
  },
  premium: {
    sponsorHiddenAria: 'Sponsor name hidden until you subscribe.',
    supportEmailHiddenAria:
      'Support email hidden. Upgrade to premium to see contact details.',
    supportPhoneHiddenAria:
      'Support phone hidden. Upgrade to premium to see contact details.',
    providerHiddenAria:
      'Provider name hidden. Upgrade to premium to see the sponsor.',
    eligibilityAria: 'Scholarship country eligibility and study destination'
  },
  requirementChips: {
    essay: 'Essay',
    transcript: 'Transcript',
    recommendation: 'Recommendation letter',
    documents: 'Documents',
    photo: 'Photo',
    video: 'Video',
    portfolio: 'Portfolio / link',
    survey: 'Survey',
    shortAnswers: 'Short answers',
    goals: 'Goals statement',
    specialEligibility: 'Special eligibility',
    financialNeed: 'Financial need'
  },
  payoutMethods: {
    college: 'Paid to the college or financial aid office',
    student: 'Paid directly to the student',
    nonMonetary: 'Non-monetary award (courses, equipment, or similar)',
    notStated: 'Not stated on the listing'
  },
  documents: {
    downloadPdf: 'Download PDF',
    officialDocument: 'Official Document'
  }
};

const ES: ScholarshipDetailUiCopy = {
  ...EN,
  backToMatches: '← Volver a coincidencias',
  scholarshipsHub: 'Becas',
  home: 'Inicio',
  breadcrumbAria: 'Ruta de navegación',
  notFound: 'Beca no encontrada',
  failedToLoad: 'No se pudieron cargar las becas',
  loadingScholarship: 'Cargando beca…',
  deadline: 'Fecha límite',
  deadlinePassed: 'Fecha límite vencida',
  deadlineSecondary: 'Fecha límite de la beca',
  deadlinePassedNotice:
    'La fecha limite indicada puede haber pasado. Guarda la oportunidad y usa la ruta de postulacion para planificar este ciclo o el siguiente.',
  awardAmount: 'Monto del premio',
  applicants: 'Postulantes',
  requirements: 'Requisitos',
  whoCanApply: 'Quién puede postular',
  verifyEligibilityNote:
    'ScholarshipTop organiza senales de elegibilidad para comparar encaje, preparar materiales y avanzar hacia la ruta de postulacion con menos dudas.',
  sponsorAndApplication: 'Patrocinador y postulación',
  applyNow: 'Postular ahora',
  applyPremiumTitle:
    'Actualiza a Premium para desbloquear detalles organizados, plazos, enlaces de postulacion del proveedor, listas guardadas, filtros inteligentes y ayuda con IA en un solo workspace.',
  applyLoadingAria: 'Cargando enlace de postulación',
  save: 'Guardar',
  saved: 'Guardada ✓',
  saveAria: 'Guardar beca',
  removeSavedAria: 'Quitar de guardadas',
  notRelevant: 'No relevante',
  notRelevantAria: 'Ocultar beca de coincidencias',
  restoreToMatches: 'Restaurar en coincidencias',
  restoreAria: 'Restaurar beca en coincidencias',
  lastVerifiedPrefix: 'Información verificada por última vez',
  confirmOfficialNote:
    'ScholarshipTop organiza detalles, plazos, senales de elegibilidad, rutas de postulacion, listas guardadas y ayuda con IA en un solo workspace para avanzar mas rapido desde la busqueda hasta la postulacion.',
  showMore: 'Ver más',
  showLess: 'Ver menos',
  studyInPrefix: 'Estudiar en:',
  studyInMulti: (count) => `Estudiar en: ${count} países`,
  providerWebsite: 'Ruta de postulacion',
  signInToUnlock: 'Inicia sesión para desbloquear',
  language: 'Idioma',
  recurring: 'recurrente',
  urgencyPrefix: 'Urgencia:',
  faqHeading: 'Preguntas frecuentes',
  sections: {
    eligibility: 'Elegibilidad',
    scholarshipSupport: 'Soporte de la beca',
    applicationDetails: 'Detalles de postulación',
    keyRequirements: (count) => `Requisitos clave (${count})`,
    requiredDocuments: 'Documentos requeridos',
    requiredDocumentsNote:
      'Materiales que podrias subir o enviar; usa esta lista para prepararte mas rapido.',
    requiredDocumentsNoteGov:
      'Usa esta lista para preparar los materiales de esta oportunidad.',
    awardPayment: 'Premio y pago',
    importantNotes: 'Notas importantes',
    aboutProvider: 'Sobre el proveedor',
    source: 'Fuente',
    overview: 'Resumen',
    applying: 'Cómo postular',
    notification: 'Notificación',
    selectionCriteria: 'Criterios de selección',
    programDetails: 'Detalles del programa',
    keyRequirementsNote:
      'Reglas y condiciones del programa. Los archivos se listan en Documentos requeridos.',
    keyRequirementsNoteGov:
      'Requisitos y condiciones según el listado federal.',
    keyRequirementsNoteAlt:
      'Reglas del programa para preparar tus materiales de postulacion.'
  },
  quickFacts: {
    title: 'Datos rápidos',
    status: 'Estado',
    studyLevels: 'Niveles de estudio',
    fieldOfStudy: 'Campo de estudio',
    eligibleInstitutions: 'Instituciones elegibles',
    institutionsLockedHint:
      'Los detalles de instituciones pueden nombrar al patrocinador — ocultos hasta suscribirte.',
    location: 'Ubicación',
    numberOfAwards: 'Número de premios',
    payoutMethod: 'Método de pago'
  },
  matchCta: {
    title: 'Encuentra becas compatibles en 2 minutos',
    button: 'Encontrar mis becas'
  },
  quickDecision: {
    title: 'Decisión rápida',
    badge: 'Ideas con IA',
    bestFor: 'Ideal para',
    highlights: 'Puntos clave',
    whyApply: 'Por qué postular',
    importantChecks: 'Verificaciones importantes'
  },
  trust: {
    kicker: 'Notas de ScholarshipTop',
    title: 'Preparacion para postular',
    intro:
      'Usa estos detalles para entender el encaje, preparar materiales, guardar la oportunidad y avanzar hacia la ruta de postulacion cuando estes listo.',
    methodology: 'Estandares de datos',
    disclaimer: 'Ver matches',
    officialSourceStatus: 'Ruta de postulacion',
    reviewStatus: 'Estado de revisión',
    reviewValueMissing: 'Fecha de revisión no disponible',
    reviewBodyWhenPresent:
      'ScholarshipTop tiene una marca de tiempo de revisión para este listado.',
    reviewBodyWhenMissing:
      'Este listado aún no expone una fecha de revisión manual.',
    deadlineUrgency: 'Urgencia de la fecha límite',
    applicationDifficulty: 'Dificultad de postulación',
    missingDetails: 'Detalles para completar',
    completeListingNote:
      'ScholarshipTop organizo los campos principales para comparar encaje, preparar materiales, seguir el plazo y avanzar hacia la ruta de postulacion cuando estes listo.'
  },
  ai: {
    badge: 'Ideas con IA',
    guidanceBadge: 'Guía con IA',
    lowConfidenceNote:
      'La IA muestra detalles clave, senales de elegibilidad, posibles proximos pasos y el enlace de postulacion del proveedor cuando este disponible para avanzar mas rapido.',
    whyApplyTitle: 'Por qué puede valer la pena postular',
    whyApplySubtitle:
      'Angulo orientado al estudiante segun los detalles organizados del listado.',
    applicationTipsTitle: 'Consejos de postulación',
    applicationTipsSubtitle:
      'Ideas especificas de nuestra capa de IA para preparar materiales y proximos pasos.',
    nextStepsTitle: 'Próximos pasos',
    nextStepsSubtitle:
      'Lista breve para saber qué hacer después de leer el listado.',
    beforeApplyTitle: 'Plan de postulacion',
    beforeApplySubtitle:
      'Usa estas notas para preparar materiales, seguir tiempos y avanzar hacia el envio.',
    importantChecks: 'Senales de aplicacion',
    detailsToConfirm: 'Detalles para usar',
    redFlags: 'Señales de alerta'
  },
  guestLock: {
    sectionAria: 'Los detalles de la beca requieren iniciar sesión',
    title: 'Inicia sesión para desbloquear el acceso completo a ideas con IA',
    signIn: 'Iniciar sesión'
  },
  iq: {
    startAria: 'Iniciar evaluación IQ',
    featuredTool: 'Herramienta destacada',
    iqBadge: 'IQ',
    applicantIntelligence: 'Inteligencia del postulante',
    assessmentBadge: 'Evaluación IQ',
    cardTitle: '¿Vale la pena tu tiempo esta beca?',
    cardBody:
      'Haz una evaluación cognitiva para ver si tus fortalezas encajan con becas de ensayo, investigación, postulación rápida o lógica.',
    chips: ['Encaje con ensayo', 'Postulación rápida', 'Claridad de prioridad'],
    cognitivePreview: 'Vista previa cognitiva',
    iqLabel: 'IQ',
    typeLabel: 'Tipo',
    startTest: 'Iniciar test IQ',
    promoTitle: 'Encuentra becas que encajen con tu forma de pensar',
    promoBody:
      'Descubre si tus fortalezas encajan con ensayos, premios de investigación o postulaciones rápidas.',
    assessment: 'Evaluación'
  },
  similar: {
    title: 'Becas similares',
    introBold: 'Plazos abiertos primero',
    introRest:
      '— misma categoría cuando sea posible, luego opciones activas del catálogo. Hasta tres becas cerradas de esta categoría al final como contexto.',
    categoryPrefix: 'Categoría:',
    allScholarships: 'Todas las becas',
    moreInCategory: (label) => `Más becas en ${label}`,
    browseAll: 'Explorar todas las becas',
    openNow: 'Abiertas ahora',
    scholarship: 'beca',
    scholarships: 'becas',
    pastDeadline: 'Plazo vencido',
    pastDeadlineNote: 'Misma categoría · solo referencia',
    sponsorHiddenAria: 'Nombre del patrocinador oculto hasta suscribirte.',
    geoAria: 'Ubicación del programa y elegibilidad',
    browseFilteredAria: (label) => `Explorar becas filtradas por ${label}`,
    browseMatchingTitle: (label) => `${label} — explorar becas coincidentes`
  },
  related: {
    hubsTitle: 'Hubs de becas relacionados',
    hubsIntro:
      'Explora listados curados que coinciden con el estado y campo de este programa.',
    compareTitle: 'Comparar con otras universidades',
    compareIntro:
      'Mira cómo cambian la ayuda y los ensayos cuando este proveedor se compara con otras escuelas del catálogo.',
    compareVs: (name) => `vs ${name}`,
    resourcesTitle: 'Desde nuestros recursos',
    resourcesIntro:
      'Artículos y guías del sitio que mencionan este programa en contexto.',
    essaysTitle: 'Ensayos de ejemplo y guías',
    essaysFallback:
      'Puede añadirse una guía dedicada con el tiempo. Explora todas las guías de ensayos en el hub.',
    essayRequiredTitle: '¿Necesitas un ensayo para esta beca?',
    essayRequiredBody:
      'Empieza con una lista, estudia ejemplos de estructura y elige una guía de prompt acorde a la postulación.',
    essayChecklist: 'Lista de ensayo',
    essayExamples: 'Ejemplos de ensayo',
    essayFinancialNeed: 'Ensayo de necesidad económica',
    essayCareerGoals: 'Ensayo de metas profesionales',
    essayLeadership: 'Ensayo de liderazgo',
    aiWriterTitle:
      '¿Debes escribir un ensayo? Usa nuestro redactor de ensayos con IA para un borrador personalizado rápido.',
    aiWriterLink: 'Abrir redactor de ensayos con IA →'
  },
  toast: {
    saveFailedTitle: 'No se pudieron actualizar las becas guardadas',
    saveFailedDescription: 'Revisa tu conexión e inténtalo de nuevo.'
  },
  premium: {
    sponsorHiddenAria: 'Nombre del patrocinador oculto hasta suscribirte.',
    supportEmailHiddenAria:
      'Correo de soporte oculto. Mejora a premium para ver los datos de contacto.',
    supportPhoneHiddenAria:
      'Teléfono de soporte oculto. Mejora a premium para ver los datos de contacto.',
    providerHiddenAria:
      'Nombre del proveedor oculto. Mejora a premium para ver el patrocinador.',
    eligibilityAria: 'País de elegibilidad y destino de estudio de la beca'
  },
  requirementChips: {
    essay: 'Ensayo',
    transcript: 'Expediente académico',
    recommendation: 'Carta de recomendación',
    documents: 'Documentos',
    photo: 'Foto',
    video: 'Video',
    portfolio: 'Portafolio / enlace',
    survey: 'Encuesta',
    shortAnswers: 'Respuestas breves',
    goals: 'Declaración de metas',
    specialEligibility: 'Elegibilidad especial',
    financialNeed: 'Necesidad económica'
  },
  payoutMethods: {
    college: 'Pago a la universidad u oficina de ayuda financiera',
    student: 'Pago directo al estudiante',
    nonMonetary: 'Premio no monetario (cursos, equipo, etc.)',
    notStated: 'No indicado en el listado'
  },
  documents: {
    downloadPdf: 'Descargar PDF',
    officialDocument: 'Documento oficial'
  }
};

const FR: ScholarshipDetailUiCopy = {
  ...EN,
  backToMatches: '← Retour aux correspondances',
  scholarshipsHub: 'Bourses',
  home: 'Accueil',
  breadcrumbAria: "Fil d'Ariane",
  notFound: 'Bourse introuvable',
  failedToLoad: 'Impossible de charger les bourses',
  loadingScholarship: 'Chargement de la bourse…',
  deadline: 'Date limite',
  deadlinePassed: 'Date limite dépassée',
  deadlineSecondary: 'Date limite de la bourse',
  deadlinePassedNotice:
    'La date limite indiquee est peut-etre passee. Enregistrez cette opportunite et utilisez le parcours de candidature pour planifier ce cycle ou le suivant.',
  awardAmount: 'Montant de la bourse',
  applicants: 'Candidats',
  requirements: 'Exigences',
  whoCanApply: 'Qui peut postuler',
  verifyEligibilityNote:
    'ScholarshipTop organise les signaux d eligibilite pour comparer l adequation, preparer les documents et avancer vers le parcours de candidature avec moins d incertitude.',
  sponsorAndApplication: 'Commanditaire et candidature',
  applyNow: 'Postuler',
  applyPremiumTitle:
    'Passez a Premium pour debloquer les details organises, les dates limites, les liens de candidature fournisseur, les listes enregistrees, les filtres intelligents et l aide IA dans un seul workspace.',
  applyLoadingAria: 'Chargement du lien de candidature',
  save: 'Enregistrer',
  saved: 'Enregistrée ✓',
  saveAria: 'Enregistrer la bourse',
  removeSavedAria: 'Retirer des enregistrées',
  notRelevant: 'Non pertinent',
  notRelevantAria: 'Masquer la bourse des correspondances',
  restoreToMatches: 'Restaurer dans les correspondances',
  restoreAria: 'Restaurer la bourse dans les correspondances',
  lastVerifiedPrefix: 'Informations vérifiées pour la dernière fois',
  confirmOfficialNote:
    'ScholarshipTop organise les details, dates limites, signaux d eligibilite, parcours de candidature, listes enregistrees et aide IA dans un seul workspace pour passer plus vite de la decouverte a la candidature.',
  showMore: 'Afficher plus',
  showLess: 'Afficher moins',
  studyInPrefix: 'Étudier en :',
  studyInMulti: (count) => `Étudier en : ${count} pays`,
  providerWebsite: 'Parcours de candidature',
  signInToUnlock: 'Connectez-vous pour débloquer',
  language: 'Langue',
  recurring: 'récurrent',
  urgencyPrefix: 'Urgence :',
  faqHeading: 'FAQ',
  sections: {
    eligibility: 'Éligibilité',
    scholarshipSupport: 'Assistance bourse',
    applicationDetails: 'Détails de candidature',
    keyRequirements: (count) => `Exigences clés (${count})`,
    requiredDocuments: 'Documents requis',
    requiredDocumentsNote:
      'Documents a televerser ou soumettre; utilisez cette liste pour preparer plus vite.',
    requiredDocumentsNoteGov:
      'Utilisez cette liste pour preparer les documents de cette opportunite.',
    awardPayment: 'Bourse et paiement',
    importantNotes: 'Notes importantes',
    aboutProvider: 'À propos du fournisseur',
    source: 'Source',
    overview: 'Aperçu',
    applying: 'Candidature',
    notification: 'Notification',
    selectionCriteria: 'Critères de sélection',
    programDetails: 'Détails du programme',
    keyRequirementsNote:
      'Règles du programme. Les fichiers figurent sous Documents requis.',
    keyRequirementsNoteGov:
      'Exigences selon la fiche fédérale.',
    keyRequirementsNoteAlt:
      'Regles du programme a utiliser pour preparer vos documents de candidature.'
  },
  quickFacts: {
    title: 'Faits essentiels',
    status: 'Statut',
    studyLevels: 'Niveaux d’études',
    fieldOfStudy: 'Domaine d’études',
    eligibleInstitutions: 'Établissements admissibles',
    institutionsLockedHint:
      'Les établissements peuvent nommer le commanditaire — masqué jusqu’à l’abonnement.',
    location: 'Lieu',
    numberOfAwards: 'Nombre de bourses',
    payoutMethod: 'Mode de versement'
  },
  matchCta: {
    title: 'Trouvez des bourses adaptées en 2 minutes',
    button: 'Trouver mes bourses'
  },
  quickDecision: {
    title: 'Décision rapide',
    badge: 'Aperçus IA',
    bestFor: 'Idéal pour',
    highlights: 'Points clés',
    whyApply: 'Pourquoi postuler',
    importantChecks: 'Vérifications importantes'
  },
  trust: {
    kicker: 'Notes ScholarshipTop',
    title: 'Preparation de candidature',
    intro:
      'Utilisez ces details pour comprendre l adequation, preparer les documents, enregistrer l opportunite et avancer vers le parcours de candidature quand vous etes pret.',
    methodology: 'Standards de donnees',
    disclaimer: 'Voir les matches',
    officialSourceStatus: 'Parcours de candidature',
    reviewStatus: 'Statut de révision',
    reviewValueMissing: 'Date de révision indisponible',
    reviewBodyWhenPresent:
      'ScholarshipTop dispose d’un horodatage de révision pour cette fiche.',
    reviewBodyWhenMissing:
      'Cette fiche n’expose pas encore de date de révision manuelle.',
    deadlineUrgency: 'Urgence de la date limite',
    applicationDifficulty: 'Difficulté de candidature',
    missingDetails: 'Details a completer',
    completeListingNote:
      'ScholarshipTop a organise les champs principaux pour comparer l adequation, preparer les documents, suivre la date limite et avancer vers le parcours de candidature quand vous etes pret.'
  },
  ai: {
    badge: 'Aperçus IA',
    guidanceBadge: 'Conseils IA',
    lowConfidenceNote:
      'L IA met en avant les details cles, les signaux d eligibilite, les prochaines etapes probables et le lien de candidature fournisseur quand il est disponible.',
    whyApplyTitle: 'Pourquoi cette bourse peut valoir le coup',
    whyApplySubtitle:
      'Angle etudiant base sur les details organises de la fiche.',
    applicationTipsTitle: 'Conseils de candidature',
    applicationTipsSubtitle:
      'Idees specifiques de notre couche IA pour preparer les documents et les prochaines etapes.',
    nextStepsTitle: 'Prochaines étapes',
    nextStepsSubtitle:
      'Liste courte pour savoir quoi faire après la lecture de la fiche.',
    beforeApplyTitle: 'Plan de candidature',
    beforeApplySubtitle:
      'Utilisez ces notes pour preparer les documents, suivre le timing et avancer vers la soumission.',
    importantChecks: 'Signaux de candidature',
    detailsToConfirm: 'Details a utiliser',
    redFlags: 'Signaux d’alerte'
  },
  guestLock: {
    sectionAria: 'Les détails de la bourse nécessitent une connexion',
    title: 'Connectez-vous pour débloquer l’accès complet aux aperçus IA',
    signIn: 'Se connecter'
  },
  iq: {
    startAria: 'Démarrer l’évaluation IQ',
    featuredTool: 'Outil en vedette',
    iqBadge: 'IQ',
    applicantIntelligence: 'Profil du candidat',
    assessmentBadge: 'Évaluation IQ',
    cardTitle: 'Cette bourse vaut-elle votre temps ?',
    cardBody:
      'Passez une évaluation cognitive pour voir si vos forces conviennent aux bourses avec essai, recherche, candidature rapide ou logique.',
    chips: ['Essai', 'Candidature rapide', 'Priorités claires'],
    cognitivePreview: 'Aperçu cognitif',
    iqLabel: 'IQ',
    typeLabel: 'Type',
    startTest: 'Démarrer le test IQ',
    promoTitle: 'Trouvez des bourses qui correspondent à votre façon de penser',
    promoBody:
      'Voyez si vos forces conviennent aux essais, aux prix de recherche ou aux candidatures rapides.',
    assessment: 'Évaluation'
  },
  similar: {
    title: 'Bourses similaires',
    introBold: 'Dates ouvertes en premier',
    introRest:
      '— même catégorie si possible, puis choix actifs du catalogue. Jusqu’à trois bourses closes de cette catégorie en fin de liste pour contexte.',
    categoryPrefix: 'Catégorie :',
    allScholarships: 'Toutes les bourses',
    moreInCategory: (label) => `Plus de bourses en ${label}`,
    browseAll: 'Parcourir toutes les bourses',
    openNow: 'Ouvertes',
    scholarship: 'bourse',
    scholarships: 'bourses',
    pastDeadline: 'Date dépassée',
    pastDeadlineNote: 'Même catégorie · référence seulement',
    sponsorHiddenAria: 'Nom du commanditaire masqué jusqu’à l’abonnement.',
    geoAria: 'Lieu du programme et éligibilité',
    browseFilteredAria: (label) => `Parcourir les bourses filtrées par ${label}`,
    browseMatchingTitle: (label) => `${label} — parcourir les bourses correspondantes`
  },
  related: {
    hubsTitle: 'Hubs de bourses liés',
    hubsIntro:
      'Parcourez des listes qui correspondent à l’État et au domaine de ce programme.',
    compareTitle: 'Comparer avec d’autres universités',
    compareIntro:
      'Voyez comment l’aide et les essais diffèrent face à d’autres écoles du catalogue.',
    compareVs: (name) => `vs ${name}`,
    resourcesTitle: 'Depuis nos ressources',
    resourcesIntro:
      'Articles et guides du site qui mentionnent ce programme en contexte.',
    essaysTitle: 'Exemples d’essais et guides',
    essaysFallback:
      'Un guide dédié pourra être ajouté plus tard. Parcourez tous les guides depuis le hub.',
    essayRequiredTitle: 'Besoin d’un essai pour cette bourse ?',
    essayRequiredBody:
      'Commencez par une liste, étudiez des exemples de structure et choisissez un guide de consigne adapté.',
    essayChecklist: 'Liste essai',
    essayExamples: 'Exemples d’essais',
    essayFinancialNeed: 'Essai besoins financiers',
    essayCareerGoals: 'Essai objectifs de carrière',
    essayLeadership: 'Essai leadership',
    aiWriterTitle:
      'Rédigez un essai ? Utilisez notre rédacteur IA pour un brouillon personnel rapidement.',
    aiWriterLink: 'Ouvrir le rédacteur d’essais IA →'
  },
  toast: {
    saveFailedTitle: 'Impossible de mettre à jour les bourses enregistrées',
    saveFailedDescription: 'Vérifiez votre connexion et réessayez.'
  },
  premium: {
    sponsorHiddenAria: 'Nom du commanditaire masqué jusqu’à l’abonnement.',
    supportEmailHiddenAria:
      'E-mail de support masqué. Passez en premium pour voir les coordonnées.',
    supportPhoneHiddenAria:
      'Téléphone masqué. Passez en premium pour voir les coordonnées.',
    providerHiddenAria:
      'Nom du fournisseur masqué. Passez en premium pour voir le commanditaire.',
    eligibilityAria: 'Pays d’éligibilité et destination d’études de la bourse'
  },
  requirementChips: {
    essay: 'Essai',
    transcript: 'Relevé de notes',
    recommendation: 'Lettre de recommandation',
    documents: 'Documents',
    photo: 'Photo',
    video: 'Vidéo',
    portfolio: 'Portfolio / lien',
    survey: 'Questionnaire',
    shortAnswers: 'Réponses courtes',
    goals: 'Déclaration d’objectifs',
    specialEligibility: 'Éligibilité spéciale',
    financialNeed: 'Besoin financier'
  },
  payoutMethods: {
    college: 'Versement au collège ou bureau d’aide financière',
    student: 'Versement direct à l’étudiant',
    nonMonetary: 'Bourse non monétaire (cours, équipement, etc.)',
    notStated: 'Non indiqué sur la fiche'
  },
  documents: {
    downloadPdf: 'Télécharger le PDF',
    officialDocument: 'Document officiel'
  }
};

const BY_LOCALE: Record<LocalizedUiLocale, ScholarshipDetailUiCopy> = {
  en: EN,
  es: ES,
  fr: FR
};

export function getScholarshipDetailUiCopy(
  locale: LocalizedUiLocale
): ScholarshipDetailUiCopy {
  return BY_LOCALE[locale] ?? EN;
}

export function scholarshipDetailPayoutLabel(
  locale: LocalizedUiLocale,
  method: string | null | undefined
): string | null {
  const m = method?.toLowerCase();
  if (!m) return null;
  const copy = getScholarshipDetailUiCopy(locale);
  const map: Record<string, string> = {
    college: copy.payoutMethods.college,
    student: copy.payoutMethods.student,
    non_monetary: copy.payoutMethods.nonMonetary,
    not_stated: copy.payoutMethods.notStated
  };
  return map[m] ?? method;
}

function isGenericDocumentLinkTitle(
  title: string | null | undefined,
  url: string
): boolean {
  const normalized = title?.trim().toLowerCase().replace(/\s+/g, ' ') ?? '';
  if (!normalized) return true;
  if (normalized === url.trim().toLowerCase()) return true;
  return (
    normalized === 'document' ||
    normalized === 'official document' ||
    normalized === 'download' ||
    normalized === 'download pdf' ||
    normalized === 'pdf' ||
    /^document\s+\d+$/.test(normalized) ||
    /^download(?:\s+document)?$/.test(normalized)
  );
}

export function scholarshipDetailOfficialDocumentLabel(
  locale: LocalizedUiLocale,
  title: string | null | undefined,
  url: string
): string {
  if (!isGenericDocumentLinkTitle(title, url)) return title!.trim();
  const copy = getScholarshipDetailUiCopy(locale);
  return /\.pdf(?:$|[?#])/i.test(url)
    ? copy.documents.downloadPdf
    : copy.documents.officialDocument;
}

export function scholarshipDetailRequirementChips(
  locale: LocalizedUiLocale,
  s: Scholarship
): string[] {
  const c = getScholarshipDetailUiCopy(locale).requirementChips;
  const out: string[] = [];
  if (s.essayRequired) out.push(c.essay);
  if (s.transcriptRequired) out.push(c.transcript);
  if (s.recommendationRequired) out.push(c.recommendation);
  if (s.documentRequired) out.push(c.documents);
  if (s.photoRequired) out.push(c.photo);
  if (s.videoRequired) out.push(c.video);
  if (s.linkRequired) out.push(c.portfolio);
  if (s.surveyRequired) out.push(c.survey);
  if (s.questionRequired) out.push(c.shortAnswers);
  if (s.goalRequired) out.push(c.goals);
  if (s.specialEligibilityRequired) out.push(c.specialEligibility);
  if (s.financialNeedConsidered) out.push(c.financialNeed);
  return out;
}
