import { HUB_INTERNATIONAL_SEGMENT } from '@/app/scholarships/scholarshipHubPath';
import {
  hrefForLocalizedUiRequired,
  localizedScholarshipHubTabHref,
  type LocalizedUiLocale
} from '@/lib/i18n/localizedHref';

export type ProviderDetailUiCopy = {
  nav: {
    breadcrumbAria: string;
    home: string;
    providersHub: string;
  };
  tocOnThisPage: string;
  scholarshipMatchCta: {
    heading: string;
    button: string;
  };
  scholarshipsEmpty: {
    onboardingHint: string;
    getNotified: string;
  };
  showingScholarships: (
    from: number,
    to: number,
    totalFormatted: string
  ) => string;
  trust: {
    verifyBeforeApply: string;
    verifyItems: [string, string, string];
    verificationMethodology: string;
    reportCorrection: string;
  };
  sourceLinkLabel: (index: number, host: string) => string;
  metaDescriptionFallback: (providerName: string) => string;
  toc: {
    aboutProvider: string;
    sourceStatus: string;
    exploreScholarships: string;
    officialWebsite: string;
    sources: string;
    faq: string;
    scholarshipsFromProvider: string;
    similarOrganizations: string;
  };
  stats: {
    activeScholarships: string;
    totalAwardPool: string;
    knownAmountsFor: (count: string) => string;
    lastUpdated: string;
    dataCompleteness: string;
    location: string;
  };
  about: {
    heading: string;
    emptyBody: string;
  };
  official: {
    openOfficialWebsite: string;
  };
  scholarships: {
    heading: string;
    viewScholarship: string;
    noScholarships: string;
  };
  similar: {
    heading: string;
    exploreHeading: string;
    scholarshipsCount: (count: string) => string;
  };
  iqCta: {
    featuredTool: string;
    providerFit: string;
    prioritizeTitle: (providerName: string) => string;
    body: string;
    chips: [string, string, string, string];
    previewReport: string;
    cta: string;
  };
  sourceStatus: {
    sectionEyebrow: string;
    heading: (providerName: string) => string;
    intro: string;
    sourceLabel: string;
    completenessLabel: string;
  };
  contextLinks: {
    heading: string;
    body: string;
    itemTitles: {
      matches: string;
      easyApply: string;
      international: string;
      resources: string;
      essays: string;
      compare: string;
    };
  };
};

const EN: ProviderDetailUiCopy = {
  nav: {
    breadcrumbAria: 'Breadcrumb',
    home: 'Home',
    providersHub: 'Providers'
  },
  tocOnThisPage: 'On this page',
  scholarshipMatchCta: {
    heading: 'Find scholarships that fit your profile',
    button: 'Find My Scholarships'
  },
  scholarshipsEmpty: {
    onboardingHint:
      'Create a free account to get scholarship alerts and updates when new opportunities from this organization appear in the catalog.',
    getNotified: 'Get notified'
  },
  showingScholarships: (from, to, total) =>
    `Showing ${from}-${to} of ${total} scholarships`,
  trust: {
    verifyBeforeApply: 'Application checklist',
    verifyItems: [
      'Eligibility signals and student profile requirements.',
      'Deadline context, timezone notes, and application route.',
      'Award amount, payment method, renewal, and required materials.'
    ],
    verificationMethodology: 'Verification methodology',
    reportCorrection: 'Report a correction'
  },
  sourceLinkLabel: (index, host) =>
    host ? `Source ${index + 1}: ${host}` : `Source ${index + 1}`,
  metaDescriptionFallback: (name) =>
    `Scholarships and profile for ${name} on ScholarshipTop.`,
  toc: {
    aboutProvider: 'About Provider',
    sourceStatus: 'Source status',
    exploreScholarships: 'Explore scholarships and guides',
    officialWebsite: 'Provider link',
    sources: 'Sources',
    faq: 'FAQ',
    scholarshipsFromProvider: 'Scholarships from this provider',
    similarOrganizations: 'Similar organizations'
  },
  stats: {
    activeScholarships: 'Active scholarships',
    totalAwardPool: 'Total listed award pool',
    knownAmountsFor: (count) => `Known amounts for ${count} awards`,
    lastUpdated: 'Last updated',
    dataCompleteness: 'Data completeness',
    location: 'Location'
  },
  about: {
    heading: 'About Provider',
    emptyBody:
      "We don't have a profile write-up for this organization yet. Browse the scholarships below and use provider links when they are available."
  },
  official: { openOfficialWebsite: 'Open provider link' },
  scholarships: {
    heading: 'Scholarships from this provider',
    viewScholarship: 'View scholarship',
    noScholarships:
      'No active scholarships are listed for this provider right now.'
  },
  similar: {
    heading: 'Similar organizations',
    exploreHeading: 'Explore similar organizations',
    scholarshipsCount: (count) => `${count} scholarships`
  },
  iqCta: {
    featuredTool: 'Featured Tool',
    providerFit: 'Provider fit',
    prioritizeTitle: (name) => `Prioritize ${name} with your Brain Archetype`,
    body: 'Take a comprehensive cognitive assessment to understand whether your strengths fit research-heavy, essay-heavy, deadline-driven, or fast-apply scholarship opportunities.',
    chips: ['Logic', 'Speed', 'Research', 'Essays'],
    previewReport: 'Preview report',
    cta: 'Start IQ Test'
  },
  sourceStatus: {
    sectionEyebrow: 'Provider source status',
    heading: (name) => `What ScholarshipTop knows about ${name}`,
    intro:
      'This provider profile is based on ScholarshipTop listing data. When a provider URL or application route is available, ScholarshipTop includes it alongside source-quality and data-completeness signals for planning.',
    sourceLabel: 'Source',
    completenessLabel: 'Completeness'
  },
  contextLinks: {
    heading: 'Explore scholarships and guides',
    body: 'Continue from this provider profile into matching scholarships, easy applications, international-friendly options, and practical scholarship guides.',
    itemTitles: {
      matches: 'Browse matching scholarships',
      easyApply: 'Easy apply scholarships',
      international: 'Scholarships for international students',
      resources: 'Scholarship guides',
      essays: 'Essay guides',
      compare: 'Compare opportunities'
    }
  }
};

const ES: ProviderDetailUiCopy = {
  nav: {
    breadcrumbAria: 'Ruta de navegación',
    home: 'Inicio',
    providersHub: 'Proveedores'
  },
  tocOnThisPage: 'En esta página',
  scholarshipMatchCta: {
    heading: 'Encuentra becas en 2 minutos',
    button: 'Encontrar mis becas'
  },
  scholarshipsEmpty: {
    onboardingHint:
      'Crea una cuenta gratuita para recibir alertas de becas cuando aparezcan nuevas oportunidades de esta organización.',
    getNotified: 'Recibir avisos'
  },
  showingScholarships: (from, to, total) =>
    `Mostrando ${from}-${to} de ${total} becas`,
  trust: {
    verifyBeforeApply: 'Preparacion para aplicar',
    verifyItems: [
      'Senales de elegibilidad y requisitos del perfil del estudiante.',
      'Contexto de fecha limite, zona horaria y ruta de solicitud.',
      'Monto del premio, metodo de pago, renovacion y materiales requeridos.'
    ],
    verificationMethodology: 'Metodología de verificación',
    reportCorrection: 'Reportar corrección'
  },
  sourceLinkLabel: (index, host) =>
    host ? `Fuente ${index + 1}: ${host}` : `Fuente ${index + 1}`,
  metaDescriptionFallback: (name) =>
    `Becas y perfil de ${name} en ScholarshipTop.`,
  toc: {
    aboutProvider: 'Acerca del proveedor',
    sourceStatus: 'Estado de la fuente',
    exploreScholarships: 'Explorar becas y guías',
    officialWebsite: 'Enlace del proveedor',
    sources: 'Fuentes',
    faq: 'Preguntas frecuentes',
    scholarshipsFromProvider: 'Becas de este proveedor',
    similarOrganizations: 'Organizaciones similares'
  },
  stats: {
    activeScholarships: 'Becas activas',
    totalAwardPool: 'Premio total listado',
    knownAmountsFor: (count) => `Importes conocidos para ${count} premios`,
    lastUpdated: 'Última actualización',
    dataCompleteness: 'Completitud de datos',
    location: 'Ubicación'
  },
  about: {
    heading: 'Acerca del proveedor',
    emptyBody:
      'Aun no tenemos una ficha para esta organizacion. Explora las becas abajo y usa los enlaces del proveedor cuando esten disponibles.'
  },
  official: { openOfficialWebsite: 'Abrir enlace del proveedor' },
  scholarships: {
    heading: 'Becas de este proveedor',
    viewScholarship: 'Ver beca',
    noScholarships: 'No hay becas activas listadas para este proveedor ahora.'
  },
  similar: {
    heading: 'Organizaciones similares',
    exploreHeading: 'Explorar organizaciones similares',
    scholarshipsCount: (count) => `${count} becas`
  },
  iqCta: {
    featuredTool: 'Herramienta destacada',
    providerFit: 'Encaje con proveedor',
    prioritizeTitle: (name) => `Prioriza ${name} con tu arquetipo cerebral`,
    body: 'Haz una evaluación cognitiva para ver si tus fortalezas encajan con becas de investigación, ensayos, plazos ajustados o solicitudes rápidas.',
    chips: ['Lógica', 'Velocidad', 'Investigación', 'Ensayos'],
    previewReport: 'Vista previa del informe',
    cta: 'Iniciar test de CI'
  },
  sourceStatus: {
    sectionEyebrow: 'Estado de la fuente del proveedor',
    heading: (name) => `Qué sabe ScholarshipTop sobre ${name}`,
    intro:
      'Este perfil se basa en datos del catalogo de ScholarshipTop. Cuando hay URL o ruta de solicitud del proveedor, ScholarshipTop la muestra junto con senales de calidad de fuente y completitud de datos.',
    sourceLabel: 'Fuente',
    completenessLabel: 'Completitud'
  },
  contextLinks: {
    heading: 'Explorar becas y guías',
    body: 'Continúa desde este perfil de proveedor hacia becas coincidentes, solicitudes fáciles, opciones para estudiantes internacionales y guías prácticas sobre becas.',
    itemTitles: {
      matches: 'Explorar becas coincidentes',
      easyApply: 'Becas de solicitud fácil',
      international: 'Becas para estudiantes internacionales',
      resources: 'Guías de becas',
      essays: 'Guías de ensayos',
      compare: 'Comparar oportunidades'
    }
  }
};

const FR: ProviderDetailUiCopy = {
  nav: {
    breadcrumbAria: "Fil d'Ariane",
    home: 'Accueil',
    providersHub: 'Fournisseurs'
  },
  tocOnThisPage: 'Sur cette page',
  scholarshipMatchCta: {
    heading: 'Trouvez des bourses en 2 minutes',
    button: 'Trouver mes bourses'
  },
  scholarshipsEmpty: {
    onboardingHint:
      'Créez un compte gratuit pour recevoir des alertes lorsque de nouvelles bourses de cette organisation sont publiées.',
    getNotified: 'Recevoir des alertes'
  },
  showingScholarships: (from, to, total) =>
    `Affichage ${from}-${to} sur ${total} bourses`,
  trust: {
    verifyBeforeApply: 'Preparation de candidature',
    verifyItems: [
      'Signaux d eligibilite et exigences du profil etudiant.',
      'Contexte de date limite, fuseau horaire et voie de candidature.',
      'Montant de la bourse, versement, renouvellement et documents requis.'
    ],
    verificationMethodology: 'Méthode de vérification',
    reportCorrection: 'Signaler une correction'
  },
  sourceLinkLabel: (index, host) =>
    host ? `Source ${index + 1} : ${host}` : `Source ${index + 1}`,
  metaDescriptionFallback: (name) =>
    `Bourses et profil de ${name} sur ScholarshipTop.`,
  toc: {
    aboutProvider: 'À propos du fournisseur',
    sourceStatus: 'État de la source',
    exploreScholarships: 'Explorer bourses et guides',
    officialWebsite: 'Lien fournisseur',
    sources: 'Sources',
    faq: 'FAQ',
    scholarshipsFromProvider: 'Bourses de ce fournisseur',
    similarOrganizations: 'Organisations similaires'
  },
  stats: {
    activeScholarships: 'Bourses actives',
    totalAwardPool: 'Montant total listé',
    knownAmountsFor: (count) => `Montants connus pour ${count} prix`,
    lastUpdated: 'Dernière mise à jour',
    dataCompleteness: 'Complétude des données',
    location: 'Emplacement'
  },
  about: {
    heading: 'À propos du fournisseur',
    emptyBody:
      'Nous n avons pas encore de fiche pour cette organisation. Parcourez les bourses ci-dessous et utilisez les liens fournisseur quand ils sont disponibles.'
  },
  official: { openOfficialWebsite: 'Ouvrir le lien fournisseur' },
  scholarships: {
    heading: 'Bourses de ce fournisseur',
    viewScholarship: 'Voir la bourse',
    noScholarships:
      'Aucune bourse active n’est listée pour ce fournisseur pour l’instant.'
  },
  similar: {
    heading: 'Organisations similaires',
    exploreHeading: 'Explorer des organisations similaires',
    scholarshipsCount: (count) => `${count} bourses`
  },
  iqCta: {
    featuredTool: 'Outil en vedette',
    providerFit: 'Adéquation fournisseur',
    prioritizeTitle: (name) =>
      `Prioriser ${name} avec votre archétype cérébral`,
    body: 'Passez une évaluation cognitive pour voir si vos forces conviennent aux bourses recherche, essais, délais serrés ou candidatures rapides.',
    chips: ['Logique', 'Vitesse', 'Recherche', 'Essais'],
    previewReport: 'Aperçu du rapport',
    cta: 'Commencer le test de QI'
  },
  sourceStatus: {
    sectionEyebrow: 'État de la source du fournisseur',
    heading: (name) => `Ce que ScholarshipTop sait sur ${name}`,
    intro:
      'Ce profil repose sur les donnees du catalogue ScholarshipTop. Quand une URL ou une voie de candidature fournisseur existe, ScholarshipTop l affiche avec les signaux de qualite de source et de completude.',
    sourceLabel: 'Source',
    completenessLabel: 'Complétude'
  },
  contextLinks: {
    heading: 'Explorer bourses et guides',
    body: 'Poursuivez depuis ce profil fournisseur vers les bourses correspondantes, les candidatures faciles, les options favorables aux étudiants internationaux et les guides pratiques.',
    itemTitles: {
      matches: 'Parcourir les bourses correspondantes',
      easyApply: 'Bourses à candidature facile',
      international: 'Bourses pour étudiants internationaux',
      resources: 'Guides de bourses',
      essays: 'Guides de rédaction',
      compare: 'Comparer les opportunités'
    }
  }
};

export function getProviderContextLinkItems(
  locale: LocalizedUiLocale
): Array<{ href: string; title: string }> {
  const titles = getProviderDetailUiCopy(locale).contextLinks.itemTitles;
  return [
    {
      href: localizedScholarshipHubTabHref(locale, 'matches'),
      title: titles.matches
    },
    {
      href: localizedScholarshipHubTabHref(locale, 'easy-apply'),
      title: titles.easyApply
    },
    {
      href: localizedScholarshipHubTabHref(locale, HUB_INTERNATIONAL_SEGMENT),
      title: titles.international
    },
    {
      href: hrefForLocalizedUiRequired(locale, '/resources'),
      title: titles.resources
    },
    {
      href: hrefForLocalizedUiRequired(locale, '/essays'),
      title: titles.essays
    },
    {
      href: hrefForLocalizedUiRequired(locale, '/compare'),
      title: titles.compare
    }
  ];
}

export function getProviderDetailUiCopy(
  locale: LocalizedUiLocale
): ProviderDetailUiCopy {
  if (locale === 'es') return ES;
  if (locale === 'fr') return FR;
  return EN;
}
