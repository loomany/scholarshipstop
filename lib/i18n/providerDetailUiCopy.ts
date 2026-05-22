import type { LocalizedUiLocale } from '@/lib/i18n/localizedHref';

export type ProviderDetailUiCopy = {
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
};

const EN: ProviderDetailUiCopy = {
  toc: {
    aboutProvider: 'About Provider',
    sourceStatus: 'Source status',
    exploreScholarships: 'Explore scholarships and guides',
    officialWebsite: 'Official website',
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
      "We don't have a profile write-up for this organization yet. Browse the scholarships below or open the official site when it's listed."
  },
  official: { openOfficialWebsite: 'Open official website' },
  scholarships: {
    heading: 'Scholarships from this provider',
    viewScholarship: 'View scholarship',
    noScholarships: 'No active scholarships are listed for this provider right now.'
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
      'This provider profile is based on ScholarshipTop listing data. If an official provider URL is available, students should use it to confirm application details directly. If source information is incomplete, this page marks what still needs verification before applying.',
    sourceLabel: 'Source',
    completenessLabel: 'Completeness'
  }
};

const ES: ProviderDetailUiCopy = {
  toc: {
    aboutProvider: 'Acerca del proveedor',
    sourceStatus: 'Estado de la fuente',
    exploreScholarships: 'Explorar becas y guías',
    officialWebsite: 'Sitio web oficial',
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
      'Aún no tenemos una ficha para esta organización. Explora las becas abajo o abre el sitio oficial cuando esté listado.'
  },
  official: { openOfficialWebsite: 'Abrir sitio web oficial' },
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
      'Este perfil se basa en datos del catálogo de ScholarshipTop. Si hay URL oficial, úsala para confirmar los requisitos. Si falta información, esta página indica qué conviene verificar antes de solicitar.',
    sourceLabel: 'Fuente',
    completenessLabel: 'Completitud'
  }
};

const FR: ProviderDetailUiCopy = {
  toc: {
    aboutProvider: 'À propos du fournisseur',
    sourceStatus: 'État de la source',
    exploreScholarships: 'Explorer bourses et guides',
    officialWebsite: 'Site officiel',
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
      'Nous n’avons pas encore de fiche pour cette organisation. Parcourez les bourses ci-dessous ou le site officiel lorsqu’il est indiqué.'
  },
  official: { openOfficialWebsite: 'Ouvrir le site officiel' },
  scholarships: {
    heading: 'Bourses de ce fournisseur',
    viewScholarship: 'Voir la bourse',
    noScholarships: 'Aucune bourse active n’est listée pour ce fournisseur pour l’instant.'
  },
  similar: {
    heading: 'Organisations similaires',
    exploreHeading: 'Explorer des organisations similaires',
    scholarshipsCount: (count) => `${count} bourses`
  },
  iqCta: {
    featuredTool: 'Outil en vedette',
    providerFit: 'Adéquation fournisseur',
    prioritizeTitle: (name) => `Prioriser ${name} avec votre archétype cérébral`,
    body: 'Passez une évaluation cognitive pour voir si vos forces conviennent aux bourses recherche, essais, délais serrés ou candidatures rapides.',
    chips: ['Logique', 'Vitesse', 'Recherche', 'Essais'],
    previewReport: 'Aperçu du rapport',
    cta: 'Commencer le test de QI'
  },
  sourceStatus: {
    sectionEyebrow: 'État de la source du fournisseur',
    heading: (name) => `Ce que ScholarshipTop sait sur ${name}`,
    intro:
      'Ce profil repose sur les données du catalogue ScholarshipTop. En cas d’URL officielle, utilisez-la pour confirmer les détails. Si des informations manquent, cette page indique ce qu’il reste à vérifier avant de postuler.',
    sourceLabel: 'Source',
    completenessLabel: 'Complétude'
  }
};

export function getProviderDetailUiCopy(
  locale: LocalizedUiLocale
): ProviderDetailUiCopy {
  if (locale === 'es') return ES;
  if (locale === 'fr') return FR;
  return EN;
}
