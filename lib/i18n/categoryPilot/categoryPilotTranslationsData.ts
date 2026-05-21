import type { ScholarshipCategoryId } from '@/app/scholarships/scholarshipCategories';
import { getPromotedSeoCategorySlugs } from '@/lib/scholarships/categorySeoAllowlist';
import type { ContentTranslationLocale } from '@/lib/i18n/contentTranslationsTypes';
import { buildCategorySourceHash } from '@/lib/i18n/categoryPilot/buildCategorySourceHash';

export type CategoryPilotFaqItem = { question: string; answer: string };

export type CategoryPilotLocaleContent = {
  translated_title: string;
  translated_meta_title: string;
  translated_meta_description: string;
  translated_summary: string;
  translated_body: string;
  translated_faq_json: CategoryPilotFaqItem[];
  translated_extra_json: {
    listingExploreHeading: string;
    listingExploreIntro: string;
    howThisPageWorks: string;
    howToIncreaseChances: string[];
    faqSectionTitle: string;
    sectionHowPageWorksLabel: string;
    sectionHowPageWorksHeading: string;
    sectionIncreaseChancesLabel: string;
    sectionIncreaseChancesHeading: string;
    trustResourcesAria: string;
    trustCards: { href: string; label: string; body: string }[];
    medicalGuide?: { href: string; label: string; description: string };
  };
};

const DISCLAIMER_ES =
  'ScholarshipTop no concede becas ni garantiza resultados. Verifica siempre los requisitos y plazos en la página oficial del proveedor.';
const DISCLAIMER_FR =
  'ScholarshipTop n’accorde pas de bourses et ne garantit aucun résultat. Vérifiez toujours les critères et les dates sur la page officielle du financeur.';

const TRUST_ES = [
  {
    href: '/scholarship-verification-methodology',
    label: 'Metodología de verificación',
    body: 'Cómo revisamos la fuente, el plazo, la elegibilidad y la vía de solicitud.'
  },
  {
    href: '/financial-aid-disclaimer',
    label: 'Aviso sobre ayuda financiera',
    body: 'Por qué las reglas finales del proveedor determinan elegibilidad y pago.'
  },
  {
    href: '/scholarship-scam-warning',
    label: 'Señales de estafa',
    body: 'Qué comprobar antes de pagar tasas o compartir datos sensibles.'
  }
];

const TRUST_FR = [
  {
    href: '/scholarship-verification-methodology',
    label: 'Méthode de vérification',
    body: 'Comment nous contrôlons la source, les délais, l’éligibilité et la candidature.'
  },
  {
    href: '/financial-aid-disclaimer',
    label: 'Avertissement aide financière',
    body: 'Pourquoi les règles du financeur priment pour l’éligibilité et le versement.'
  },
  {
    href: '/scholarship-scam-warning',
    label: 'Signaux d’arnaque',
    body: 'Ce qu’il faut vérifier avant de payer des frais ou partager des données.'
  }
];

const PILOT_CONTENT: Partial<
  Record<ScholarshipCategoryId, Record<ContentTranslationLocale, CategoryPilotLocaleContent>>
> = {
  stem: {
    es: {
      translated_title: 'Becas STEM',
      translated_meta_title: 'Becas STEM 2026 – Solicita en línea',
      translated_meta_description:
        'Explora becas STEM con plazos, importes, requisitos de GPA y elegibilidad. Encuentra becas que puedas solicitar hoy.',
      translated_summary:
        'Explora becas STEM en ciencia, tecnología, ingeniería, matemáticas, informática, datos e investigación. Compara plazos, importes, GPA y requisitos antes de solicitar.',
      translated_body:
        'Esta página reúne becas STEM activas del catálogo de ScholarshipTop. Usa los filtros para acotar por plazo, importe, elegibilidad y requisitos antes de abrir cada ficha del proveedor.',
      translated_faq_json: [
        {
          question: '¿Quién puede solicitar becas STEM?',
          answer:
            'Depende del proveedor. Algunas becas son abiertas a cualquier estudiante STEM; otras exigen una especialidad concreta, nivel académico, investigación, necesidad económica o participación en programas técnicos.'
        },
        {
          question: '¿Cómo fortalecer una solicitud STEM?',
          answer:
            'Conecta tus intereses con proyectos reales: investigación, prácticas, robótica, programación, tutorías o trabajo comunitario. En el ensayo, explica hacia qué camino técnico avanzas y por qué encaja la beca.'
        },
        {
          question: '¿Las becas STEM exigen un GPA muy alto?',
          answer:
            'No siempre. Algunas becas tienen mínimos de GPA, pero otras valoran ensayos, servicio, primera generación universitaria o experiencia práctica. Revisa los requisitos antes de descartar una oportunidad.'
        }
      ],
      translated_extra_json: {
        listingExploreHeading: 'Becas STEM disponibles',
        listingExploreIntro:
          'Explora las becas STEM disponibles o usa filtros por plazo, importe, GPA, elegibilidad y requisitos.',
        howThisPageWorks:
          'Esta página te ayuda a revisar becas STEM del catálogo de ScholarshipTop. Usa los filtros para comparar plazos, importes, GPA, elegibilidad y requisitos antes de abrir la página oficial del proveedor.',
        howToIncreaseChances: [
          'Prioriza becas alineadas con tu especialidad STEM y nivel académico.',
          'Prepara ejemplos de proyectos, investigación o experiencia técnica antes del ensayo.',
          'Compara plazos y materiales requeridos para no dejar solicitudes al último día.',
          'Confirma los requisitos oficiales del proveedor antes de enviar.'
        ],
        faqSectionTitle: 'Preguntas frecuentes sobre becas STEM',
        sectionHowPageWorksLabel: 'Cómo funciona esta página',
        sectionHowPageWorksHeading: 'Compara becas con las herramientas de arriba',
        sectionIncreaseChancesLabel: 'Cómo aumentar tus opciones',
        sectionIncreaseChancesHeading: 'Elige solicitudes con mejor encaje',
        trustResourcesAria: 'Recursos de confianza de ScholarshipTop',
        trustCards: TRUST_ES
      }
    },
    fr: {
      translated_title: 'Bourses STIM',
      translated_meta_title: 'Bourses STIM 2026 – Postuler en ligne',
      translated_meta_description:
        'Parcourez les bourses STIM avec dates limites, montants, GPA et critères d’éligibilité. Trouvez des bourses auxquelles postuler aujourd’hui.',
      translated_summary:
        'Explorez les bourses STIM en sciences, technologie, ingénierie, mathématiques, informatique, données et recherche. Comparez dates, montants, GPA et exigences avant de postuler.',
      translated_body:
        'Cette page regroupe les bourses STIM actives du catalogue ScholarshipTop. Utilisez les filtres pour affiner par date, montant, éligibilité et pièces requises avant d’ouvrir la fiche du financeur.',
      translated_faq_json: [
        {
          question: 'Qui peut postuler aux bourses STIM ?',
          answer:
            'Cela dépend du financeur. Certaines bourses visent tout profil STIM, d’autres une filière précise, un niveau d’études, la recherche, les besoins financiers ou l’engagement associatif.'
        },
        {
          question: 'Comment renforcer une candidature STIM ?',
          answer:
            'Reliez vos intérêts à des réalisations concrètes : recherche, stages, robotique, code, tutorat ou projets communautaires. Dans le texte, expliquez votre trajectoire et pourquoi la bourse vous correspond.'
        },
        {
          question: 'Faut-il un GPA très élevé ?',
          answer:
            'Pas toujours. Certains programmes imposent un GPA minimum, d’autres valorisent l’essai, le service, le statut première génération ou l’expérience pratique. Lisez les critères avant d’écarter une opportunité.'
        }
      ],
      translated_extra_json: {
        listingExploreHeading: 'Bourses STIM disponibles',
        listingExploreIntro:
          'Parcourez les bourses STIM ci-dessous ou affinez avec les filtres (date, montant, GPA, éligibilité, exigences).',
        howThisPageWorks:
          'Cette page vous aide à comparer les bourses STIM du catalogue ScholarshipTop. Utilisez les filtres avant d’ouvrir la page officielle du financeur.',
        howToIncreaseChances: [
          'Ciblez les bourses alignées sur votre filière STIM et votre niveau.',
          'Préparez des exemples de projets ou de recherche avant l’essai.',
          'Comparez les dates limites et les pièces à fournir.',
          'Vérifiez les exigences officielles du financeur avant envoi.'
        ],
        faqSectionTitle: 'Questions fréquentes sur les bourses STIM',
        sectionHowPageWorksLabel: 'Fonctionnement de cette page',
        sectionHowPageWorksHeading: 'Comparez les bourses avec les outils ci-dessus',
        sectionIncreaseChancesLabel: 'Augmenter vos chances',
        sectionIncreaseChancesHeading: 'Choisissez des candidatures mieux adaptées',
        trustResourcesAria: 'Ressources de confiance ScholarshipTop',
        trustCards: TRUST_FR
      }
    }
  },
  music: {
    es: {
      translated_title: 'Becas de música',
      translated_meta_title: 'Becas de música 2026 – Solicita en línea',
      translated_meta_description:
        'Explora becas de música con plazos, importes, GPA y elegibilidad. Encuentra becas para instrumentistas, composición y educación musical.',
      translated_summary:
        'Encuentra becas de música para instrumentistas, vocalistas, composición, producción y educación musical. Compara plazos, importes y requisitos antes de solicitar.',
      translated_body:
        'Consulta becas de música activas en ScholarshipTop y filtra por plazo, importe, elegibilidad y materiales (audición, ensayo, cartas).',
      translated_faq_json: [
        {
          question: '¿Quién puede solicitar becas de música?',
          answer:
            'Pueden aplicar instrumentistas, vocalistas, compositores, futuros educadores musicales y estudiantes con trayectoria en ensambles o comunidad. La elegibilidad varía según audición, nivel académico o necesidad económica.'
        },
        {
          question: '¿Suelen pedir audición?',
          answer:
            'Muchas becas musicales piden audición o grabación, pero no todas. Algunas se centran en ensayo, liderazgo o servicio comunitario. Revisa formato, repertorio y fecha con antelación.'
        },
        {
          question: '¿Cómo mejorar la solicitud?',
          answer:
            'Destaca ensambles, estudio privado, conciertos, composición o docencia. Explica cómo la beca apoya tu siguiente paso académico o artístico, no solo una lista de actividades.'
        }
      ],
      translated_extra_json: {
        listingExploreHeading: 'Becas de música disponibles',
        listingExploreIntro:
          'Explora becas de música o ajusta resultados con filtros de plazo, importe, GPA y requisitos.',
        howThisPageWorks:
          'Esta página lista becas de música del catálogo de ScholarshipTop. Compara requisitos y plazos antes de visitar la página oficial del proveedor.',
        howToIncreaseChances: [
          'Prioriza becas que coincidan con tu instrumento, voz o enfoque compositivo.',
          'Prepara audición o portafolio con la antelación que pida el proveedor.',
          'Solicita cartas y transcripciones antes de la semana final del plazo.',
          'Verifica instrucciones oficiales de envío.'
        ],
        faqSectionTitle: 'Preguntas frecuentes sobre becas de música',
        sectionHowPageWorksLabel: 'Cómo funciona esta página',
        sectionHowPageWorksHeading: 'Compara becas con las herramientas de arriba',
        sectionIncreaseChancesLabel: 'Cómo aumentar tus opciones',
        sectionIncreaseChancesHeading: 'Elige solicitudes con mejor encaje',
        trustResourcesAria: 'Recursos de confianza de ScholarshipTop',
        trustCards: TRUST_ES
      }
    },
    fr: {
      translated_title: 'Bourses musique',
      translated_meta_title: 'Bourses musique 2026 – Postuler en ligne',
      translated_meta_description:
        'Parcourez les bourses musique : dates, montants, GPA et éligibilité pour instrumentistes, composition et enseignement musical.',
      translated_summary:
        'Trouvez des bourses musique pour instrumentistes, chanteurs, composition, production et enseignement. Comparez dates, montants et exigences.',
      translated_body:
        'Consultez les bourses musique actives sur ScholarshipTop et filtrez par date, montant, éligibilité et pièces (audition, essai, lettres).',
      translated_faq_json: [
        {
          question: 'Qui peut postuler aux bourses musique ?',
          answer:
            'Instrumentistes, chanteurs, compositeurs, futurs enseignants et étudiants actifs en ensemble ou en communauté. Les critères varient (audition, niveau, besoin financier).'
        },
        {
          question: 'Une audition est-elle souvent requise ?',
          answer:
            'Souvent oui, mais pas toujours. Certaines bourses privilégient l’essai, le leadership ou le service. Vérifiez format, répertoire et date tôt.'
        },
        {
          question: 'Comment renforcer la candidature ?',
          answer:
            'Mettez en avant ensembles, cours privés, concerts, composition ou enseignement. Expliquez l’étape suivante que la bourse rend possible.'
        }
      ],
      translated_extra_json: {
        listingExploreHeading: 'Bourses musique disponibles',
        listingExploreIntro:
          'Parcourez les bourses musique ou affinez avec les filtres (date, montant, GPA, exigences).',
        howThisPageWorks:
          'Cette page liste les bourses musique du catalogue ScholarshipTop. Comparez avant d’ouvrir la page officielle du financeur.',
        howToIncreaseChances: [
          'Ciblez les bourses adaptées à votre instrument, voix ou composition.',
          'Préparez audition ou portfolio selon les consignes.',
          'Anticipez lettres et relevés de notes.',
          'Vérifiez les instructions officielles.'
        ],
        faqSectionTitle: 'Questions fréquentes sur les bourses musique',
        sectionHowPageWorksLabel: 'Fonctionnement de cette page',
        sectionHowPageWorksHeading: 'Comparez les bourses avec les outils ci-dessus',
        sectionIncreaseChancesLabel: 'Augmenter vos chances',
        sectionIncreaseChancesHeading: 'Choisissez des candidatures mieux adaptées',
        trustResourcesAria: 'Ressources de confiance ScholarshipTop',
        trustCards: TRUST_FR
      }
    }
  },
  safety: {
    es: {
      translated_title: 'Becas de seguridad',
      translated_meta_title: 'Becas de seguridad 2026 – Solicita en línea',
      translated_meta_description:
        'Explora becas en seguridad laboral, salud pública, emergencias, higiene industrial y gestión de riesgos. Compara plazos y elegibilidad.',
      translated_summary:
        'Explora becas en seguridad ocupacional, salud pública, emergencias, ciencias del fuego, higiene industrial y gestión de riesgos. Compara plazos, importes y requisitos.',
      translated_body:
        'Revisa becas de seguridad activas y filtra por especialidad, plazo, importe y materiales de solicitud.',
      translated_faq_json: [
        {
          question: '¿Quién puede solicitar becas de seguridad?',
          answer:
            'Estudiantes orientados a seguridad laboral, salud pública, emergencias, higiene industrial, ciberseguridad o gestión de riesgos, según el proveedor.'
        },
        {
          question: '¿Qué conviene destacar en la solicitud?',
          answer:
            'Formación en prevención, respuesta a emergencias, salud pública, proyectos técnicos o liderazgo con enfoque en reducir riesgos en el trabajo o la comunidad.'
        },
        {
          question: '¿Se exige experiencia profesional?',
          answer:
            'Algunas becas prefieren experiencia o certificaciones, pero otras aceptan estudiantes en formación con metas de carrera claras. Lee la elegibilidad de cada proveedor.'
        }
      ],
      translated_extra_json: {
        listingExploreHeading: 'Becas de seguridad disponibles',
        listingExploreIntro:
          'Explora becas de seguridad o refina con filtros de plazo, importe, GPA y requisitos.',
        howThisPageWorks:
          'Esta página agrupa becas de seguridad del catálogo de ScholarshipTop. Usa filtros antes de abrir cada proveedor.',
        howToIncreaseChances: [
          'Prioriza becas alineadas con tu trayectoria en seguridad o salud pública.',
          'Prepara ejemplos de formación, servicio o proyectos técnicos.',
          'Compara plazos y certificaciones requeridas.',
          'Confirma requisitos oficiales antes de enviar.'
        ],
        faqSectionTitle: 'Preguntas frecuentes sobre becas de seguridad',
        sectionHowPageWorksLabel: 'Cómo funciona esta página',
        sectionHowPageWorksHeading: 'Compara becas con las herramientas de arriba',
        sectionIncreaseChancesLabel: 'Cómo aumentar tus opciones',
        sectionIncreaseChancesHeading: 'Elige solicitudes con mejor encaje',
        trustResourcesAria: 'Recursos de confianza de ScholarshipTop',
        trustCards: TRUST_ES
      }
    },
    fr: {
      translated_title: 'Bourses sécurité',
      translated_meta_title: 'Bourses sécurité 2026 – Postuler en ligne',
      translated_meta_description:
        'Parcourez les bourses en sécurité au travail, santé publique, urgences, hygiène industrielle et gestion des risques.',
      translated_summary:
        'Explorez les bourses en sécurité au travail, santé publique, urgences, sciences du feu, hygiène industrielle et gestion des risques.',
      translated_body:
        'Consultez les bourses sécurité actives et filtrez par spécialité, date, montant et pièces requises.',
      translated_faq_json: [
        {
          question: 'Qui peut postuler aux bourses sécurité ?',
          answer:
            'Étudiants orientés vers la sécurité au travail, la santé publique, les urgences, l’hygiène industrielle, la cybersécurité ou la gestion des risques, selon le financeur.'
        },
        {
          question: 'Que mettre en avant ?',
          answer:
            'Formation en prévention, intervention d’urgence, santé publique, projets techniques ou leadership visant à réduire les risques.'
        },
        {
          question: 'L’expérience professionnelle est-elle obligatoire ?',
          answer:
            'Parfois, mais plusieurs bourses acceptent des étudiants en formation avec un projet de carrière clair. Lisez chaque critère.'
        }
      ],
      translated_extra_json: {
        listingExploreHeading: 'Bourses sécurité disponibles',
        listingExploreIntro:
          'Parcourez les bourses sécurité ou affinez avec les filtres.',
        howThisPageWorks:
          'Cette page regroupe les bourses sécurité du catalogue ScholarshipTop.',
        howToIncreaseChances: [
          'Ciblez les bourses alignées sur votre parcours sécurité / santé publique.',
          'Préparez exemples de formation, service ou projets.',
          'Comparez dates et certifications exigées.',
          'Vérifiez les exigences officielles.'
        ],
        faqSectionTitle: 'Questions fréquentes sur les bourses sécurité',
        sectionHowPageWorksLabel: 'Fonctionnement de cette page',
        sectionHowPageWorksHeading: 'Comparez les bourses avec les outils ci-dessus',
        sectionIncreaseChancesLabel: 'Augmenter vos chances',
        sectionIncreaseChancesHeading: 'Choisissez des candidatures mieux adaptées',
        trustResourcesAria: 'Ressources de confiance ScholarshipTop',
        trustCards: TRUST_FR
      }
    }
  }
};

function genericPilotContent(
  locale: ContentTranslationLocale,
  categoryId: ScholarshipCategoryId,
  headingEs: string,
  headingFr: string,
  browseEs: string,
  browseFr: string
): CategoryPilotLocaleContent {
  const isEs = locale === 'es';
  const heading = isEs ? headingEs : headingFr;
  const browse = isEs ? browseEs : browseFr;
  const suffix = isEs ? 'Becas' : 'Bourses';
  const title = isEs ? `${suffix} ${heading}` : `${suffix} ${heading}`;
  const year = 2026;
  return {
    translated_title: title,
    translated_meta_title: isEs
      ? `${title} ${year} – Solicita en línea`
      : `${title} ${year} – Postuler en ligne`,
    translated_meta_description: isEs
      ? `Explora becas de ${browse} con plazos, importes, GPA y elegibilidad. Encuentra becas que puedas solicitar hoy.`
      : `Parcourez les bourses ${browse} : dates, montants, GPA et éligibilité.`,
    translated_summary: isEs
      ? `Encuentra becas de ${browse} y compara plazos, importes, GPA y requisitos antes de solicitar. ${DISCLAIMER_ES}`
      : `Trouvez des bourses ${browse} et comparez dates, montants, GPA et exigences. ${DISCLAIMER_FR}`,
    translated_body: isEs
      ? `Esta página lista becas de ${browse} activas en ScholarshipTop. Usa filtros para acotar resultados antes de abrir la página oficial del proveedor.`
      : `Cette page liste les bourses ${browse} actives sur ScholarshipTop. Utilisez les filtres avant la page officielle du financeur.`,
    translated_faq_json: isEs
      ? [
          {
            question: `¿Cómo encontrar becas de ${browse}?`,
            answer:
              'Usa esta página para comparar plazos, importes, elegibilidad y requisitos de cada beca.'
          },
          {
            question: `¿Quién puede solicitar becas de ${browse}?`,
            answer:
              'La elegibilidad depende de cada proveedor: campo de estudio, nivel, GPA, ubicación o necesidad económica.'
          },
          {
            question: `¿Conviene solicitar a varias becas de ${browse}?`,
            answer:
              'Sí, si cumples los requisitos y puedes gestionar los plazos. Diversificar solicitudes puede mejorar tus opciones.'
          }
        ]
      : [
          {
            question: `Comment trouver des bourses ${browse} ?`,
            answer:
              'Utilisez cette page pour comparer dates, montants, éligibilité et exigences.'
          },
          {
            question: `Qui peut postuler aux bourses ${browse} ?`,
            answer:
              'Les critères varient selon le financeur : filière, niveau, GPA, lieu ou besoin financier.'
          },
          {
            question: `Faut-il postuler à plusieurs bourses ${browse} ?`,
            answer:
              'Oui, si vous respectez les critères et les délais. Diversifier peut augmenter vos chances.'
          }
        ],
    translated_extra_json: isEs
      ? {
          listingExploreHeading: `${suffix} de ${heading} disponibles`,
          listingExploreIntro: `Explora becas de ${browse} o usa filtros para refinar resultados.`,
          howThisPageWorks: `Esta página muestra becas de ${browse} del catálogo de ScholarshipTop. Compara antes de abrir cada proveedor.`,
          howToIncreaseChances: [
            `Prioriza becas de ${browse} donde cumplas la mayoría de requisitos.`,
            'Compara plazos y materiales antes de decidir a cuáles aplicar.',
            'Prepara ensayos y cartas con antelación.',
            'Confirma requisitos oficiales del proveedor.'
          ],
          faqSectionTitle: `Preguntas frecuentes sobre becas de ${browse}`,
          sectionHowPageWorksLabel: 'Cómo funciona esta página',
          sectionHowPageWorksHeading: 'Compara becas con las herramientas de arriba',
          sectionIncreaseChancesLabel: 'Cómo aumentar tus opciones',
          sectionIncreaseChancesHeading: 'Elige solicitudes con mejor encaje',
          trustResourcesAria: 'Recursos de confianza de ScholarshipTop',
          trustCards: TRUST_ES
        }
      : {
          listingExploreHeading: `${suffix} ${heading} disponibles`,
          listingExploreIntro: `Parcourez les bourses ${browse} ou affinez avec les filtres.`,
          howThisPageWorks: `Cette page présente les bourses ${browse} du catalogue ScholarshipTop.`,
          howToIncreaseChances: [
            `Ciblez les bourses ${browse} où vous correspondez le mieux aux critères.`,
            'Comparez dates et pièces requises.',
            'Préparez essais et lettres à l’avance.',
            'Vérifiez les exigences officielles.'
          ],
          faqSectionTitle: `Questions fréquentes sur les bourses ${browse}`,
          sectionHowPageWorksLabel: 'Fonctionnement de cette page',
          sectionHowPageWorksHeading: 'Comparez les bourses avec les outils ci-dessus',
          sectionIncreaseChancesLabel: 'Augmenter vos chances',
          sectionIncreaseChancesHeading: 'Choisissez des candidatures mieux adaptées',
          trustResourcesAria: 'Ressources de confiance ScholarshipTop',
          trustCards: TRUST_FR
        }
  };
}

const GENERIC_LABELS: Record<
  Exclude<ScholarshipCategoryId, 'stem' | 'music' | 'safety'>,
  { es: [string, string]; fr: [string, string] }
> = {
  arts: { es: ['Artes', 'artes'], fr: ['Arts', 'arts'] },
  education: { es: ['Educación', 'educación'], fr: ['Éducation', 'éducation'] },
  humanities: {
    es: ['Humanidades', 'humanidades'],
    fr: ['Humanités', 'humanités']
  },
  medical: { es: ['Medicina', 'medicina y salud'], fr: ['Médecine', 'médecine et santé'] },
  law: { es: ['Derecho', 'derecho'], fr: ['Droit', 'droit'] },
  community: { es: ['Comunidad', 'comunidad'], fr: ['Communauté', 'communauté'] },
  biology: { es: ['Biología', 'biología'], fr: ['Biologie', 'biologie'] },
  disability: {
    es: ['Discapacidad', 'discapacidad'],
    fr: ['Handicap', 'handicap']
  },
  hobbies: { es: ['Pasatiempos', 'pasatiempos'], fr: ['Loisirs', 'loisirs'] },
  miscellaneous: { es: ['Varios', 'varios'], fr: ['Divers', 'divers'] }
};

function fillGenericCategories(): void {
  for (const id of getPromotedSeoCategorySlugs()) {
    if (id === 'stem' || id === 'music' || id === 'safety') continue;
    const labels = GENERIC_LABELS[id as keyof typeof GENERIC_LABELS];
    if (!labels) continue;
    (PILOT_CONTENT as Record<string, unknown>)[id] = {
      es: genericPilotContent('es', id, labels.es[0], labels.fr[0], labels.es[1], labels.fr[1]),
      fr: genericPilotContent('fr', id, labels.es[0], labels.fr[0], labels.es[1], labels.fr[1])
    };
  }
  const medical = PILOT_CONTENT.medical;
  if (medical?.es) {
    medical.es.translated_extra_json.medicalGuide = {
      href: '/resources/medical-scholarships-guide',
      label: 'Guía de becas médicas',
      description:
        'Consejos sobre elegibilidad, ensayos y documentos para becas de salud.'
    };
  }
  if (medical?.fr) {
    medical.fr.translated_extra_json.medicalGuide = {
      href: '/resources/medical-scholarships-guide',
      label: 'Guide des bourses médicales',
      description:
        'Conseils sur l’éligibilité, les essais et les documents pour les bourses santé.'
    };
  }
}

fillGenericCategories();

export function getCategoryPilotContent(
  categoryId: ScholarshipCategoryId,
  locale: ContentTranslationLocale
): CategoryPilotLocaleContent | null {
  const bucket = PILOT_CONTENT[categoryId];
  return bucket?.[locale] ?? null;
}

export type CategoryPilotSeedRow = {
  source_type: 'scholarship_category';
  source_id: string;
  locale: ContentTranslationLocale;
  status: 'published';
  source_hash: string;
  quality_score: number;
  published_at: string;
  translated_slug: null;
  translated_title: string;
  translated_meta_title: string;
  translated_meta_description: string;
  translated_summary: string;
  translated_body: string;
  translated_faq_json: CategoryPilotFaqItem[];
  translated_extra_json: CategoryPilotLocaleContent['translated_extra_json'];
};

export function buildCategoryPilotSeedRows(): CategoryPilotSeedRow[] {
  const publishedAt = new Date().toISOString();
  const rows: CategoryPilotSeedRow[] = [];
  for (const categoryId of getPromotedSeoCategorySlugs()) {
    const sourceHash = buildCategorySourceHash(categoryId);
    for (const locale of ['es', 'fr'] as const) {
      const content = getCategoryPilotContent(categoryId, locale);
      if (!content) continue;
      rows.push({
        source_type: 'scholarship_category',
        source_id: categoryId,
        locale,
        status: 'published',
        source_hash: sourceHash,
        quality_score: 90,
        published_at: publishedAt,
        translated_slug: null,
        translated_title: content.translated_title,
        translated_meta_title: content.translated_meta_title,
        translated_meta_description: content.translated_meta_description,
        translated_summary: content.translated_summary,
        translated_body: content.translated_body,
        translated_faq_json: content.translated_faq_json,
        translated_extra_json: content.translated_extra_json
      });
    }
  }
  return rows;
}

export const CATEGORY_PILOT_SOURCE_IDS = getPromotedSeoCategorySlugs();
