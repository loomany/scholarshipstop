import type { LocalizedUiLocale } from '@/lib/i18n/localizedHref';

export type ResourceDetailUiCopy = {
  backLabel: string;
  homeLabel: string;
  resourcesHubLabel: string;
  breadcrumbAria: string;
  publishedLabel: string;
  updatedLabel: string;
  faqSectionTitle: string;
  tocOnThisPage: string;
  disclaimer: string;
  exploreScholarshipsCta: {
    title: string;
    description: string;
    buttonText: string;
  };
  browseScholarshipsCta: {
    title: string;
    description: string;
    buttonText: string;
  };
  matchedScholarships: {
    heading: string;
    subheading: string;
    catalogLinkLabel: string;
    catalogLinkSuffix: string;
    viewScholarship: string;
  };
  continueReading: {
    heading: string;
  };
  coverImageAlt: (title: string) => string;
  iqCta: {
    featuredTool: string;
    strategyBadge: string;
    title: string;
    body: string;
    chips: [string, string, string, string];
    previewReport: string;
    iqLabel: string;
    typeLabel: string;
    startTest: string;
  };
};

const EN: ResourceDetailUiCopy = {
  backLabel: '← Back to Scholarship Resources',
  homeLabel: 'Home',
  resourcesHubLabel: 'Scholarship Resources',
  breadcrumbAria: 'Breadcrumb',
  publishedLabel: 'Published',
  updatedLabel: 'Updated',
  faqSectionTitle: 'FAQ',
  tocOnThisPage: 'On this page',
  disclaimer:
    'ScholarshipTop does not award scholarships or guarantee outcomes. Always verify requirements, deadlines, and award amounts on the official provider page.',
  exploreScholarshipsCta: {
    title: 'See scholarships you may qualify for',
    description:
      'Use the scholarship directory to explore real opportunities that match your eligibility and academic goals.',
    buttonText: 'Explore Scholarships'
  },
  browseScholarshipsCta: {
    title: 'Browse Scholarships',
    description: 'Explore verified opportunities in our scholarship directory.',
    buttonText: 'Browse Scholarships'
  },
  matchedScholarships: {
    heading: 'Related Scholarships',
    subheading: 'Real opportunities from our catalog, matched to this article.',
    catalogLinkLabel: 'Browse the full scholarship catalog',
    catalogLinkSuffix: '— filter by deadline, category, and more.',
    viewScholarship: 'View scholarship →'
  },
  continueReading: {
    heading: 'Continue Reading'
  },
  coverImageAlt: (title) => `Cover image for ${title}`,
  iqCta: {
    featuredTool: 'Featured Tool',
    strategyBadge: 'Strategy fit',
    title: 'Build a smarter scholarship strategy',
    body: 'Take a comprehensive cognitive assessment to see whether your strengths point toward essays, research, deadlines, or fast applications.',
    chips: ['Logic', 'Speed', 'Patterns', 'Strategy'],
    previewReport: 'Preview report',
    iqLabel: 'IQ',
    typeLabel: 'Type',
    startTest: 'Start IQ Test'
  }
};

const ES: ResourceDetailUiCopy = {
  backLabel: '← Volver a recursos de becas',
  homeLabel: 'Inicio',
  resourcesHubLabel: 'Recursos de becas',
  breadcrumbAria: 'Ruta de navegación',
  publishedLabel: 'Publicado',
  updatedLabel: 'Actualizado',
  faqSectionTitle: 'Preguntas frecuentes',
  tocOnThisPage: 'En esta página',
  disclaimer:
    'ScholarshipTop no concede becas ni garantiza resultados. Verifica siempre requisitos, plazos y montos en la página oficial del proveedor.',
  exploreScholarshipsCta: {
    title: 'Explora becas que podrían encajar contigo',
    description:
      'Usa el directorio para revisar oportunidades reales según tu elegibilidad y objetivos académicos.',
    buttonText: 'Explorar becas'
  },
  browseScholarshipsCta: {
    title: 'Explorar becas',
    description: 'Consulta oportunidades verificadas en nuestro directorio de becas.',
    buttonText: 'Ver directorio'
  },
  matchedScholarships: {
    heading: 'Becas relacionadas',
    subheading:
      'Oportunidades reales de nuestro catálogo, relacionadas con este artículo.',
    catalogLinkLabel: 'Ver el catálogo completo de becas',
    catalogLinkSuffix: '— filtra por plazo, categoría y más.',
    viewScholarship: 'Ver beca →'
  },
  continueReading: {
    heading: 'Sigue leyendo'
  },
  coverImageAlt: (title) => `Imagen de portada: ${title}`,
  iqCta: {
    featuredTool: 'Herramienta destacada',
    strategyBadge: 'Encaje estratégico',
    title: 'Construye una estrategia de becas más inteligente',
    body: 'Realiza una evaluación cognitiva para ver si tus fortalezas encajan mejor con ensayos, investigación, plazos o solicitudes rápidas.',
    chips: ['Lógica', 'Velocidad', 'Patrones', 'Estrategia'],
    previewReport: 'Vista previa',
    iqLabel: 'CI',
    typeLabel: 'Tipo',
    startTest: 'Iniciar prueba CI'
  }
};

const FR: ResourceDetailUiCopy = {
  backLabel: '← Retour aux ressources bourses',
  homeLabel: 'Accueil',
  resourcesHubLabel: 'Ressources bourses',
  breadcrumbAria: "Fil d'Ariane",
  publishedLabel: 'Publié',
  updatedLabel: 'Mis à jour',
  faqSectionTitle: 'Questions fréquentes',
  tocOnThisPage: 'Sur cette page',
  disclaimer:
    'ScholarshipTop n’accorde pas de bourses et ne garantit aucun résultat. Vérifiez toujours critères, dates et montants sur la page officielle du financeur.',
  exploreScholarshipsCta: {
    title: 'Explorez des bourses adaptées à votre profil',
    description:
      'Utilisez l’annuaire pour comparer des opportunités réelles selon votre éligibilité et vos objectifs.',
    buttonText: 'Parcourir les bourses'
  },
  browseScholarshipsCta: {
    title: 'Parcourir les bourses',
    description:
      'Découvrez des opportunités vérifiées dans notre annuaire de bourses.',
    buttonText: 'Voir l’annuaire'
  },
  matchedScholarships: {
    heading: 'Bourses associées',
    subheading:
      'Opportunités réelles de notre catalogue, en lien avec cet article.',
    catalogLinkLabel: 'Parcourir tout l’annuaire des bourses',
    catalogLinkSuffix: '— filtrez par date, catégorie, et plus.',
    viewScholarship: 'Voir la bourse →'
  },
  continueReading: {
    heading: 'À lire ensuite'
  },
  coverImageAlt: (title) => `Image de couverture : ${title}`,
  iqCta: {
    featuredTool: 'Outil recommandé',
    strategyBadge: 'Profil stratégique',
    title: 'Construisez une stratégie bourses plus efficace',
    body: 'Passez une évaluation cognitive pour voir si vos forces conviennent mieux aux essais, à la recherche, aux dates limites ou aux candidatures rapides.',
    chips: ['Logique', 'Vitesse', 'Modèles', 'Stratégie'],
    previewReport: 'Aperçu du rapport',
    iqLabel: 'QI',
    typeLabel: 'Type',
    startTest: 'Commencer le test QI'
  }
};

const BY_LOCALE: Record<LocalizedUiLocale, ResourceDetailUiCopy> = {
  en: EN,
  es: ES,
  fr: FR
};

export function getResourceDetailUiCopy(
  locale: LocalizedUiLocale | 'en'
): ResourceDetailUiCopy {
  return BY_LOCALE[locale === 'en' ? 'en' : locale];
}
