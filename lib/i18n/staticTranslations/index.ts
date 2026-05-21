import type { TranslationStatus } from '@/lib/i18n/types';
import { localizedPath, normalizeCanonicalPath } from '@/lib/i18n/paths';
import {
  STAGE2_PILOT_CANONICAL_PATHS,
  STAGE2_PILOT_LOCALES,
  type Stage2PilotCanonicalPath,
  type Stage2PilotLocale,
  isStage2PilotCanonicalPath,
  isStage2PilotLocale,
  pilotCanonicalPathFromSegments
} from '@/lib/i18n/pilotRoutes';
import { extendedEsPages, extendedFrPages } from '@/lib/i18n/staticTranslations/extendedPages';

export type LocalizedPilotPageBucket =
  | 'core'
  | 'essays'
  | 'compare'
  | 'resources';

export type LocalizedProseBlock =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'ul'; items: string[] };

export type LocalizedPilotPageKind =
  | 'home'
  | 'hub'
  | 'trust'
  | 'essay'
  | 'compare'
  | 'resource'
  | 'resourceShell'
  | 'legal'
  | 'marketing';

export type LocalizedEndReadingLink = {
  href: string;
  title: string;
  blurb: string;
};

export type LocalizedPilotSection = {
  title: string;
  body: string;
  bullets?: string[];
};

export type LocalizedPilotCard = {
  title: string;
  body: string;
  href?: string;
};

export type LocalizedPilotFaq = {
  question: string;
  answer: string;
};

export type LocalizedPilotTable = {
  columns: [string, string, string];
  rows: Array<{ factor: string; left: string; right: string }>;
};

export type LocalizedPilotPage = {
  locale: Stage2PilotLocale;
  canonicalPath: Stage2PilotCanonicalPath;
  localizedPath: string;
  bucket: LocalizedPilotPageBucket;
  kind: LocalizedPilotPageKind;
  status: Extract<TranslationStatus, 'published'>;
  qualityScore: number;
  title: string;
  metaDescription: string;
  h1: string;
  eyebrow: string;
  intro: string;
  oneSentence?: string;
  updatedAt: string;
  sections: LocalizedPilotSection[];
  cards?: LocalizedPilotCard[];
  checklist?: string[];
  doDont?: Array<{ do: string; dont: string }>;
  examples?: string[];
  table?: LocalizedPilotTable;
  chooseLeft?: string[];
  chooseRight?: string[];
  links: Array<{ href: string; label: string }>;
  faq: LocalizedPilotFaq[];
  disclaimer: string;
  /** ResourceGuideShell subtitle (resourceShell kind). */
  subtitle?: string;
  proseBlocks?: LocalizedProseBlock[];
  endReading?: LocalizedEndReadingLink[];
  /** Legal / help pages: last-updated line. */
  lastUpdatedLabel?: string;
};

export type PageDraft = Omit<
  LocalizedPilotPage,
  'locale' | 'canonicalPath' | 'localizedPath' | 'status' | 'qualityScore' | 'updatedAt'
>;

const UPDATED_AT = '2026-05-19T00:00:00.000Z';

const ES_COMMON = {
  disclaimer:
    'ScholarshipTop no concede becas directamente. Los requisitos, fechas y montos pueden cambiar; confirma siempre las reglas finales en la página oficial del proveedor.',
  links: {
    scholarships: { href: '/scholarships', label: 'Explorar becas' },
    essays: { href: '/essays', label: 'Guías de ensayos' },
    providers: { href: '/providers', label: 'Directorio de proveedores' },
    compare: { href: '/compare', label: 'Comparar opciones' },
    resources: { href: '/resources', label: 'Recursos' },
    methodology: {
      href: '/scholarship-verification-methodology',
      label: 'Metodología de verificación'
    },
    ranking: {
      href: '/how-we-rank-scholarships',
      label: 'Cómo ordenamos recomendaciones'
    },
    disclaimer: {
      href: '/financial-aid-disclaimer',
      label: 'Aviso sobre ayuda financiera'
    },
    corrections: { href: '/corrections', label: 'Reportar una corrección' },
    essayTool: { href: '/essay', label: 'Abrir Essay Mentor' }
  }
};

const FR_COMMON = {
  disclaimer:
    'ScholarshipTop n’attribue pas de bourses directement. Les critères, dates et montants peuvent changer; vérifiez toujours les règles finales sur la page officielle du fournisseur.',
  links: {
    scholarships: { href: '/scholarships', label: 'Explorer les bourses' },
    essays: { href: '/essays', label: 'Guides de rédaction' },
    providers: { href: '/providers', label: 'Annuaire des fournisseurs' },
    compare: { href: '/compare', label: 'Comparer les options' },
    resources: { href: '/resources', label: 'Ressources' },
    methodology: {
      href: '/scholarship-verification-methodology',
      label: 'Méthode de vérification'
    },
    ranking: {
      href: '/how-we-rank-scholarships',
      label: 'Comment nous classons les recommandations'
    },
    disclaimer: {
      href: '/financial-aid-disclaimer',
      label: 'Avertissement sur l’aide financière'
    },
    corrections: { href: '/corrections', label: 'Signaler une correction' },
    essayTool: { href: '/essay', label: 'Ouvrir Essay Mentor' }
  }
};

function makePage(
  locale: Stage2PilotLocale,
  canonicalPath: Stage2PilotCanonicalPath,
  draft: PageDraft
): LocalizedPilotPage {
  return {
    ...draft,
    locale,
    canonicalPath,
    localizedPath: localizedPath(locale, canonicalPath),
    status: 'published',
    qualityScore: 92,
    updatedAt: UPDATED_AT
  };
}

function trustPageEs(
  title: string,
  h1: string,
  intro: string,
  sectionOne: string,
  sectionTwo: string
): PageDraft {
  return {
    bucket: 'core',
    kind: 'trust',
    title,
    metaDescription: intro.slice(0, 155),
    h1,
    eyebrow: 'Confianza y transparencia',
    intro,
    sections: [
      {
        title: 'Qué significa para estudiantes',
        body: sectionOne,
        bullets: [
          'Usa ScholarshipTop como una capa de organización y verificación inicial.',
          'Revisa la fuente oficial antes de enviar documentos o datos personales.',
          'No asumas elegibilidad solo por el título de una beca.'
        ]
      },
      {
        title: 'Cómo mantenemos la calidad',
        body: sectionTwo,
        bullets: [
          'Indicamos cuando faltan datos importantes.',
          'Separamos hechos públicos de orientación editorial.',
          'Corregimos información cuando se reporta un error verificable.'
        ]
      }
    ],
    links: [ES_COMMON.links.methodology, ES_COMMON.links.corrections, ES_COMMON.links.scholarships],
    faq: [
      {
        question: '¿ScholarshipTop concede becas?',
        answer:
          'No. ScholarshipTop ayuda a encontrar, comparar y planificar solicitudes; la decisión y el pago dependen del proveedor oficial.'
      },
      {
        question: '¿Pueden cambiar los detalles de una beca?',
        answer:
          'Sí. Por eso señalamos qué datos deben confirmarse en la fuente oficial antes de aplicar.'
      }
    ],
    disclaimer: ES_COMMON.disclaimer
  };
}

function trustPageFr(
  title: string,
  h1: string,
  intro: string,
  sectionOne: string,
  sectionTwo: string
): PageDraft {
  return {
    bucket: 'core',
    kind: 'trust',
    title,
    metaDescription: intro.slice(0, 155),
    h1,
    eyebrow: 'Confiance et transparence',
    intro,
    sections: [
      {
        title: 'Ce que cela signifie pour les étudiants',
        body: sectionOne,
        bullets: [
          'Utilisez ScholarshipTop comme une couche d’organisation et de vérification initiale.',
          'Vérifiez la source officielle avant d’envoyer des documents ou des données personnelles.',
          'Ne présumez pas votre admissibilité à partir du seul titre d’une bourse.'
        ]
      },
      {
        title: 'Comment nous maintenons la qualité',
        body: sectionTwo,
        bullets: [
          'Nous signalons les données importantes manquantes.',
          'Nous séparons les faits publics des conseils éditoriaux.',
          'Nous corrigeons les informations lorsqu’une erreur vérifiable est signalée.'
        ]
      }
    ],
    links: [FR_COMMON.links.methodology, FR_COMMON.links.corrections, FR_COMMON.links.scholarships],
    faq: [
      {
        question: 'ScholarshipTop attribue-t-il des bourses?',
        answer:
          'Non. ScholarshipTop aide à trouver, comparer et planifier les candidatures; la décision et le paiement relèvent du fournisseur officiel.'
      },
      {
        question: 'Les détails d’une bourse peuvent-ils changer?',
        answer:
          'Oui. C’est pourquoi nous indiquons les éléments à confirmer sur la source officielle avant de postuler.'
      }
    ],
    disclaimer: FR_COMMON.disclaimer
  };
}

const ES_PAGES = {
  '/': {
    bucket: 'core',
    kind: 'home',
    title: 'ScholarshipTop en español: busca, compara y planifica becas',
    metaDescription:
      'Busca becas con señales de elegibilidad, fechas, fuente oficial, esfuerzo de solicitud y guías prácticas para estudiantes.',
    h1: 'Busca becas con más contexto, no solo con una lista',
    eyebrow: 'Piloto en español',
    intro:
      'ScholarshipTop ayuda a estudiantes a encontrar becas relevantes, comparar requisitos, revisar fechas límite y confirmar la fuente oficial antes de aplicar.',
    oneSentence:
      'ScholarshipTop organiza becas por ajuste, fecha, requisitos, fuente y esfuerzo de solicitud para que puedas decidir mejor.',
    sections: [
      {
        title: 'Qué verificamos',
        body:
          'Mostramos señales de fuente oficial, claridad de fecha, requisitos, documentos y datos incompletos cuando están disponibles.',
        bullets: [
          'Estado de fuente oficial.',
          'Fecha límite y urgencia.',
          'Claridad de elegibilidad.',
          'Datos que debes confirmar antes de aplicar.'
        ]
      },
      {
        title: 'Cómo usar el piloto',
        body:
          'Empieza por el catálogo, revisa guías de ensayos si la solicitud requiere texto escrito y usa las comparaciones para entender tipos de ayuda.',
        bullets: [
          'Guarda opciones realistas.',
          'Compara esfuerzo frente a monto.',
          'Verifica la ruta oficial de solicitud.'
        ]
      }
    ],
    cards: [
      { title: 'Becas', body: 'Aprende a revisar becas por ajuste y fuente.', href: '/scholarships' },
      { title: 'Ensayos', body: 'Planifica respuestas claras y originales.', href: '/essays' },
      { title: 'Comparaciones', body: 'Entiende diferencias entre tipos de ayuda.', href: '/compare' }
    ],
    links: [ES_COMMON.links.scholarships, ES_COMMON.links.essays, ES_COMMON.links.methodology],
    faq: [
      {
        question: '¿Este piloto traduce todas las becas?',
        answer:
          'No. El piloto en español incluye páginas base y guías seleccionadas; las páginas largas se publicarán solo cuando pasen controles de calidad.'
      },
      {
        question: '¿Las recomendaciones garantizan una beca?',
        answer:
          'No. Las recomendaciones ayudan a priorizar, pero no garantizan elegibilidad, selección ni pago.'
      }
    ],
    disclaimer: ES_COMMON.disclaimer
  },
  '/scholarships': {
    bucket: 'core',
    kind: 'hub',
    title: 'Catálogo de becas: cómo elegir oportunidades reales',
    metaDescription:
      'Usa el catálogo de becas de ScholarshipTop con señales de fuente, fecha, elegibilidad y esfuerzo antes de aplicar.',
    h1: 'Catálogo de becas',
    eyebrow: 'Búsqueda de becas',
    intro:
      'Esta página explica cómo usar ScholarshipTop para reducir listas largas a opciones realistas según elegibilidad, fecha, monto, documentos y fuente.',
    sections: [
      {
        title: 'Empieza amplio, luego filtra',
        body:
          'No elijas una beca solo por el título. Primero confirma si cumples ciudadanía, nivel académico, campo de estudio, ubicación y documentos.',
        bullets: [
          'Revisa elegibilidad antes del monto.',
          'Prioriza fechas claras y fuentes oficiales.',
          'Evita solicitudes con datos críticos incompletos.'
        ]
      },
      {
        title: 'Señales de confianza',
        body:
          'Cuando una ficha tiene datos incompletos, ScholarshipTop debe mostrar qué falta en vez de tratarla como totalmente verificada.',
        bullets: ['Fuente oficial', 'Fecha límite', 'Documentos', 'Ruta de solicitud']
      }
    ],
    cards: [
      { title: 'Guías de ensayos', body: 'Prepárate si la beca exige una respuesta escrita.', href: '/essays' },
      { title: 'Proveedores', body: 'Consulta el contexto de organizaciones proveedoras.', href: '/providers' },
      { title: 'Aviso de fraude', body: 'Aprende señales de becas sospechosas.', href: '/scholarship-scam-warning' }
    ],
    links: [ES_COMMON.links.essays, ES_COMMON.links.providers, ES_COMMON.links.disclaimer],
    faq: [
      {
        question: '¿Qué debo revisar primero?',
        answer:
          'Empieza por elegibilidad y fecha límite. Después compara monto, esfuerzo, documentos y fuente oficial.'
      },
      {
        question: '¿Por qué algunos datos pueden estar incompletos?',
        answer:
          'Algunos proveedores publican información limitada o cambiante. ScholarshipTop debe marcar lo que aún requiere confirmación.'
      }
    ],
    disclaimer: ES_COMMON.disclaimer
  },
  '/essays': {
    bucket: 'essays',
    kind: 'hub',
    title: 'Guías de ensayos para becas',
    metaDescription:
      'Guías en español para ejemplos, checklist, necesidad financiera, metas profesionales y errores comunes en ensayos de becas.',
    h1: 'Centro de ensayos para becas',
    eyebrow: 'Ensayos',
    intro:
      'Organiza tu respuesta antes de escribir: entiende el prompt, elige evidencia real, revisa instrucciones y confirma la fecha oficial.',
    sections: [
      {
        title: 'Por dónde empezar',
        body:
          'Lee ejemplos para estudiar estructura, usa el checklist antes de enviar y evita textos genéricos que podrían pertenecer a cualquier estudiante.',
        bullets: ['Ejemplos', 'Checklist', 'Errores comunes', 'Necesidad financiera']
      }
    ],
    cards: [
      { title: 'Ejemplos de ensayos', body: 'Aprende estructura sin copiar frases.', href: '/essays/examples' },
      { title: 'Checklist final', body: 'Revisa prompt, evidencia y formato.', href: '/essays/checklist' },
      { title: 'Necesidad financiera', body: 'Explica una brecha real sin exagerar.', href: '/essays/financial-need' },
      { title: 'Metas profesionales', body: 'Conecta experiencia, estudio y siguiente paso.', href: '/essays/career-goals' },
      { title: 'Errores comunes', body: 'Evita afirmaciones vagas y falta de prueba.', href: '/essays/mistakes' }
    ],
    links: [ES_COMMON.links.essayTool, ES_COMMON.links.scholarships],
    faq: [
      {
        question: '¿Puedo copiar un ejemplo?',
        answer:
          'No. Usa ejemplos para estudiar estructura; tu ensayo final debe usar tus propios hechos y voz.'
      },
      {
        question: '¿Essay Mentor garantiza ganar?',
        answer:
          'No. Puede ayudar a estructurar ideas, pero la decisión depende del proveedor de la beca.'
      }
    ],
    disclaimer: ES_COMMON.disclaimer
  },
  '/providers': {
    bucket: 'core',
    kind: 'hub',
    title: 'Directorio de proveedores de becas',
    metaDescription:
      'Entiende perfiles de proveedores de becas con contexto de fuente, becas conectadas y datos que debes verificar.',
    h1: 'Directorio de proveedores de becas',
    eyebrow: 'Proveedores',
    intro:
      'Los perfiles de proveedores deben ayudar a entender quién aparece detrás de una oportunidad y qué datos conviene confirmar antes de aplicar.',
    sections: [
      {
        title: 'Cómo leer un perfil de proveedor',
        body:
          'Un perfil sólido debe mostrar becas relacionadas, estado de fuente, señales de datos incompletos y enlaces de corrección cuando algo parece incorrecto.',
        bullets: ['Becas conectadas', 'Fuente oficial disponible', 'Datos parciales', 'Correcciones']
      }
    ],
    cards: [
      { title: 'Metodología', body: 'Cómo marcamos fuentes y datos incompletos.', href: '/scholarship-verification-methodology' },
      { title: 'Correcciones', body: 'Reporta un proveedor o enlace incorrecto.', href: '/corrections' },
      { title: 'Aviso financiero', body: 'Confirma siempre en la fuente oficial.', href: '/financial-aid-disclaimer' }
    ],
    links: [ES_COMMON.links.methodology, ES_COMMON.links.corrections],
    faq: [
      {
        question: '¿ScholarshipTop representa a los proveedores?',
        answer:
          'No. Los perfiles se basan en datos disponibles dentro de ScholarshipTop y deben confirmarse con la fuente oficial.'
      },
      {
        question: '¿Por qué un perfil puede estar incompleto?',
        answer:
          'Puede faltar una URL oficial clara, una descripción completa o una lista suficiente de becas relacionadas.'
      }
    ],
    disclaimer: ES_COMMON.disclaimer
  },
  '/compare': {
    bucket: 'compare',
    kind: 'hub',
    title: 'Comparar becas, subvenciones y tipos de ayuda',
    metaDescription:
      'Compara becas, subvenciones, ayuda por mérito, ayuda por necesidad y opciones con o sin ensayo.',
    h1: 'Comparar becas y tipos de ayuda',
    eyebrow: 'Comparaciones',
    intro:
      'Las comparaciones ayudan a decidir dónde vale la pena invertir tiempo antes de abrir una solicitud oficial.',
    sections: [
      {
        title: 'Decisiones frecuentes',
        body:
          'Empieza con diferencias permanentes: beca frente a subvención, mérito frente a necesidad, sin ensayo frente a con ensayo, local frente a nacional.',
        bullets: ['Propósito', 'Elegibilidad', 'Esfuerzo', 'Documentos']
      }
    ],
    cards: [
      { title: 'Beca vs subvención', body: 'Entiende propósito y aplicación.', href: '/compare/scholarship-vs-grant' },
      { title: 'Mérito vs necesidad', body: 'Compara criterios académicos y financieros.', href: '/compare/merit-vs-need-based-scholarships' },
      { title: 'Sin ensayo vs con ensayo', body: 'Evalúa esfuerzo y competencia.', href: '/compare/no-essay-vs-essay-scholarships' },
      { title: 'Local vs nacional', body: 'Compara alcance y probabilidad de ajuste.', href: '/compare/local-vs-national-scholarships' }
    ],
    links: [ES_COMMON.links.scholarships, ES_COMMON.links.essays],
    faq: [
      {
        question: '¿Qué comparación debo leer primero?',
        answer:
          'Empieza por el tipo de ayuda que afecta tu decisión inmediata: requisitos financieros, ensayo, alcance local o tipo de premio.'
      },
      {
        question: '¿Una comparación reemplaza la página oficial?',
        answer:
          'No. Úsala para decidir y luego confirma reglas en la fuente oficial.'
      }
    ],
    disclaimer: ES_COMMON.disclaimer
  },
  '/resources': {
    bucket: 'resources',
    kind: 'hub',
    title: 'Recursos para buscar y solicitar becas',
    metaDescription:
      'Recursos en español para planificar búsqueda de becas, ensayos, comparaciones, seguridad y verificación.',
    h1: 'Recursos para estudiantes',
    eyebrow: 'Recursos',
    intro:
      'Usa estos recursos como una ruta de aprendizaje: buscar becas, escribir solicitudes, comparar opciones y evitar riesgos.',
    sections: [
      {
        title: 'Capas de apoyo',
        body:
          'El objetivo es convertir una lista larga en un plan de acción verificable y realista.',
        bullets: ['Búsqueda', 'Ensayos', 'Comparaciones', 'Seguridad']
      }
    ],
    cards: [
      { title: 'Ensayos', body: 'Guías para responder prompts de becas.', href: '/essays' },
      { title: 'Comparar', body: 'Diferencias entre tipos de ayuda.', href: '/compare' },
      { title: 'Fraudes', body: 'Señales de alerta antes de aplicar.', href: '/scholarship-scam-warning' }
    ],
    links: [ES_COMMON.links.essays, ES_COMMON.links.compare, ES_COMMON.links.methodology],
    faq: [
      {
        question: '¿Por qué usar recursos además del catálogo?',
        answer:
          'Porque muchas solicitudes fallan por estrategia, documentos o instrucciones, no solo por falta de opciones.'
      },
      {
        question: '¿Se traducirán más recursos?',
        answer:
          'Sí, solo cuando cada página tenga contenido revisado y útil para estudiantes.'
      }
    ],
    disclaimer: ES_COMMON.disclaimer
  },
  '/about': trustPageEs(
    'Acerca de ScholarshipTop',
    'Acerca de ScholarshipTop',
    'ScholarshipTop ayuda a estudiantes a buscar, comparar, guardar y actuar sobre oportunidades de becas con más contexto que una lista simple.',
    'El producto organiza oportunidades por ajuste, fecha, requisitos, valor, fuente y esfuerzo para que el estudiante pueda priorizar.',
    'La orientación editorial explica los datos disponibles sin inventar resultados, elegibilidad ni aprobación oficial.'
  ),
  '/editorial-policy': trustPageEs(
    'Política editorial de ScholarshipTop',
    'Política editorial',
    'Nuestra política editorial separa hechos públicos, análisis práctico y advertencias cuando la información de una beca está incompleta.',
    'Los resúmenes deben ser originales, claros y basados en hechos disponibles; nunca deben copiar textos oficiales ni inventar datos.',
    'Si una fuente cambia o se detecta un error, la página debe corregirse o marcarse como pendiente de verificación.'
  ),
  '/scholarship-verification-methodology': trustPageEs(
    'Metodología de verificación de becas',
    'Cómo verificamos becas',
    'ScholarshipTop revisa señales como fuente oficial, fecha, monto, elegibilidad, documentos, ruta de solicitud y datos faltantes.',
    'Una ficha puede mostrar fuente disponible, necesita confirmación, datos parciales, fuente poco clara o ciclo vencido.',
    'La transparencia es parte de la calidad: si algo falta, debe mostrarse como un dato a verificar.'
  ),
  '/how-we-rank-scholarships': trustPageEs(
    'Cómo ScholarshipTop ordena recomendaciones',
    'Cómo ordenamos recomendaciones',
    'Las recomendaciones se basan en ajuste de perfil, señales de elegibilidad, urgencia de fecha, esfuerzo y claridad de datos.',
    'El orden ayuda a priorizar oportunidades, pero no garantiza elegibilidad, selección ni pago.',
    'Las señales de guardado, descartado y coincidencia deben apoyar la planificación sin reemplazar reglas oficiales.'
  ),
  '/how-scholarshiptop-works': trustPageEs(
    'Cómo funciona ScholarshipTop',
    'Cómo funciona ScholarshipTop',
    'El flujo es simple: responde preguntas, recibe coincidencias, compara oportunidades, guarda fechas y aplica en la fuente oficial.',
    'ScholarshipTop debe ayudar a pasar de búsqueda dispersa a una lista corta con acciones claras.',
    'Cada paso debe recordar que los detalles finales pertenecen al proveedor oficial.'
  ),
  '/financial-aid-disclaimer': trustPageEs(
    'Aviso sobre ayuda financiera',
    'Aviso sobre ayuda financiera',
    'ScholarshipTop no es proveedor de becas, universidad ni agencia gubernamental. La información es orientación y organización.',
    'Los estudiantes deben confirmar reglas, fechas, pagos, renovaciones y documentos en la fuente oficial.',
    'Ninguna página debe prometer selección, elegibilidad final ni recepción de fondos.'
  ),
  '/contact': trustPageEs(
    'Contacto de ScholarshipTop',
    'Contacto',
    'Usa contacto para soporte, errores de fuente, fechas incorrectas, elegibilidad dudosa o preocupaciones de seguridad.',
    'Los reportes útiles incluyen URL, nombre de beca o proveedor, campo incorrecto y fuente que confirma el cambio.',
    'Cuando no hay datos suficientes, ScholarshipTop debe marcar la ficha para revisión en vez de inventar información.'
  ),
  '/corrections': trustPageEs(
    'Correcciones de ScholarshipTop',
    'Correcciones',
    'Los estudiantes y proveedores pueden reportar fechas incorrectas, enlaces rotos, elegibilidad errónea o posibles fraudes.',
    'Una corrección debe basarse en una fuente verificable, preferentemente la página oficial del proveedor.',
    'Si no se puede confirmar, la página debe señalar la incertidumbre de forma visible.'
  ),
  '/scholarship-scam-warning': trustPageEs(
    'Señales de fraude en becas',
    'Señales de fraude en becas',
    'Desconfía de cuotas obligatorias, cheques falsos, presión para actuar rápido, correos no oficiales y promesas garantizadas.',
    'Antes de compartir datos, confirma dominio oficial, contacto del proveedor, fecha, requisitos y ruta de solicitud.',
    'ScholarshipTop debe ayudar a detectar riesgos sin acusar a organizaciones sin evidencia.'
  ),
  '/how-we-make-money': trustPageEs(
    'Cómo gana dinero ScholarshipTop',
    'Cómo gana dinero ScholarshipTop',
    'ScholarshipTop puede ofrecer funciones gratuitas y de pago, pero pagar no garantiza una beca ni mejora decisiones de proveedores.',
    'El valor de pago debe estar ligado a herramientas, organización o soporte, no a promesas de adjudicación.',
    'Las recomendaciones no deben venderse como posiciones falsas ni reseñas inventadas.'
  ),
  '/essays/examples': {
    bucket: 'essays',
    kind: 'essay',
    title: 'Ejemplos de ensayos para becas y cómo usarlos',
    metaDescription:
      'Aprende a estudiar ejemplos de ensayos para becas sin copiarlos: estructura, evidencia, voz y revisión.',
    h1: 'Ejemplos de ensayos para becas',
    eyebrow: 'Guía de ensayo',
    intro:
      'Los ejemplos sirven para entender estructura, no para copiar una historia. Úsalos para ver cómo un prompt se conecta con evidencia concreta.',
    oneSentence:
      'Un buen ejemplo enseña estructura mientras tu respuesta final sigue siendo original.',
    sections: [
      {
        title: 'Cómo leer un ejemplo',
        body:
          'Identifica el prompt, la afirmación central, la evidencia y la conexión con el objetivo educativo.',
        bullets: ['Marca la idea principal.', 'Busca detalles concretos.', 'Observa cómo termina el ensayo.']
      },
      {
        title: 'Crea tu versión',
        body:
          'Sustituye cada detalle prestado por hechos reales de tu experiencia y revisa hasta que responda el prompt.',
        bullets: ['Usa tu propia línea de tiempo.', 'Evita copiar frases.', 'Confirma límite de palabras.']
      }
    ],
    checklist: ['Prompt claro', 'Historia propia', 'Evidencia concreta', 'Cierre conectado al premio'],
    doDont: [
      { do: 'Estudia estructura y ritmo.', dont: 'Copies frases o experiencias.' },
      { do: 'Usa evidencia real.', dont: 'Inventes logros o dificultades.' }
    ],
    examples: [
      'Débil: Siempre quise ayudar. Mejor: Después de tutorizar a seis compañeros en álgebra, aprendí a explicar ideas difíciles por pasos.',
      'Débil: Esta beca cambiará mi vida. Mejor: Esta ayuda cubriría la cuota del examen de certificación antes de mi práctica clínica.'
    ],
    links: [ES_COMMON.links.essayTool, { href: '/essays/checklist', label: 'Checklist de ensayo' }],
    faq: [
      { question: '¿Puedo reutilizar un ejemplo?', answer: 'Puedes estudiar la estructura, pero el texto final debe ser propio.' },
      { question: '¿Debe sonar dramático?', answer: 'No. Un ensayo específico y honesto suele ser más fuerte que uno exagerado.' }
    ],
    disclaimer: ES_COMMON.disclaimer
  },
  '/essays/checklist': {
    bucket: 'essays',
    kind: 'essay',
    title: 'Checklist para revisar un ensayo de beca',
    metaDescription:
      'Revisa prompt, evidencia, claridad, formato, documentos y fuente oficial antes de enviar un ensayo de beca.',
    h1: 'Checklist para ensayos de becas',
    eyebrow: 'Antes de enviar',
    intro:
      'Una revisión final debe comprobar más que gramática: confirma que el ensayo responde el prompt y sigue reglas del proveedor.',
    oneSentence:
      'Antes de enviar, revisa ajuste al prompt, evidencia, formato, documentos y ruta oficial.',
    sections: [
      {
        title: 'Revisión estratégica',
        body:
          'Lee como si fueras el comité. La idea principal debe entenderse sin mirar tu currículum.',
        bullets: ['La introducción responde rápido.', 'Cada afirmación tiene prueba.', 'El cierre explica por qué importa ahora.']
      },
      {
        title: 'Seguridad de envío',
        body:
          'Muchos errores ocurren por instrucciones omitidas: archivo, fecha, zona horaria o anonimato.',
        bullets: ['Revisa formato.', 'Confirma fecha oficial.', 'Comprueba documentos requeridos.']
      }
    ],
    checklist: ['Prompt respondido', 'Evidencia real', 'Límite de palabras', 'Formato correcto', 'Fuente oficial confirmada'],
    doDont: [
      { do: 'Lee el ensayo en voz alta.', dont: 'Envíes el primer borrador limpio.' },
      { do: 'Verifica instrucciones oficiales.', dont: 'Confíes solo en una fecha copiada.' }
    ],
    examples: ['Cambia “soy dedicado” por la acción que lo demuestra.', 'Si el proveedor exige PDF, no subas otro formato.'],
    links: [ES_COMMON.links.essayTool, { href: '/essays/mistakes', label: 'Errores comunes' }],
    faq: [
      { question: '¿Cuál es la revisión más importante?', answer: 'El ajuste al prompt. Un texto pulido que no responde la pregunta sigue siendo débil.' },
      { question: '¿ScholarshipTop garantiza ganar?', answer: 'No. Ofrecemos guía de escritura, no decisiones de selección.' }
    ],
    disclaimer: ES_COMMON.disclaimer
  },
  '/essays/financial-need': {
    bucket: 'essays',
    kind: 'essay',
    title: 'Cómo escribir un ensayo de necesidad financiera',
    metaDescription:
      'Explica necesidad financiera con claridad, honestidad y conexión a tu plan educativo.',
    h1: 'Ensayo de necesidad financiera',
    eyebrow: 'Guía de ensayo',
    intro:
      'Un ensayo de necesidad financiera debe explicar la brecha entre tus recursos y tu plan educativo sin convertir todo el texto en una lista de dificultades.',
    oneSentence:
      'Un ensayo fuerte conecta una brecha real de financiación con un siguiente paso académico concreto.',
    sections: [
      {
        title: 'Explica la brecha',
        body:
          'Usa lenguaje claro sobre qué costo es difícil cubrir y cómo la beca ayudaría.',
        bullets: ['Menciona costos educativos relevantes.', 'Evita detalles privados innecesarios.', 'Conecta la ayuda con matrícula, materiales o exámenes.']
      },
      {
        title: 'Equilibra necesidad y acción',
        body:
          'La necesidad importa, pero también debes mostrar qué estás haciendo con la oportunidad.',
        bullets: ['Incluye esfuerzo o planificación.', 'Evita exagerar.', 'Termina con un siguiente paso.']
      }
    ],
    checklist: ['Meta educativa', 'Brecha real', 'Tono honesto', 'Uso claro del premio', 'Documentos confirmados'],
    doDont: [
      { do: 'Sé específico sobre costos.', dont: 'Compartas información que el prompt no pide.' },
      { do: 'Conecta necesidad con plan.', dont: 'Hagas el ensayo solo de dificultad.' }
    ],
    examples: ['Esta ayuda cubriría el examen de certificación requerido para mi primer semestre.', 'Una ayuda para libros reduciría horas extra de trabajo durante exámenes.'],
    links: [ES_COMMON.links.essayTool, ES_COMMON.links.disclaimer],
    faq: [
      { question: '¿Debo incluir ingreso familiar exacto?', answer: 'Solo si la solicitud lo pide. Si no, explica la brecha de forma práctica.' },
      { question: '¿Puedo mencionar responsabilidades familiares?', answer: 'Sí, si ayudan a entender tu contexto educativo y financiero.' }
    ],
    disclaimer: ES_COMMON.disclaimer
  },
  '/essays/career-goals': {
    bucket: 'essays',
    kind: 'essay',
    title: 'Cómo escribir un ensayo de metas profesionales',
    metaDescription:
      'Planifica un ensayo de metas profesionales con motivación específica, evidencia y próximos pasos realistas.',
    h1: 'Ensayo de metas profesionales',
    eyebrow: 'Guía de ensayo',
    intro:
      'Un ensayo de metas profesionales debe mostrar por qué tu objetivo tiene sentido ahora, no solo qué cargo quieres en el futuro.',
    oneSentence:
      'Conecta evidencia pasada, plan de estudio actual y siguiente paso profesional.',
    sections: [
      {
        title: 'Haz creíble la meta',
        body:
          'No necesitas un plan perfecto a diez años; necesitas una dirección conectada a tus decisiones.',
        bullets: ['Nombra campo o rol.', 'Explica qué te acercó a ese trabajo.', 'Incluye cursos, proyectos o servicio.']
      },
      {
        title: 'Usa la beca como puente',
        body:
          'Explica qué paso práctico facilita la beca: matrícula, libros, certificación, viaje o equipo.',
        bullets: ['Sé concreto.', 'Evita prometer resultados garantizados.', 'Enfócate en preparación.']
      }
    ],
    checklist: ['Meta en una frase', 'Evidencia personal', 'Plan de estudio', 'Uso de la beca', 'Cierre realista'],
    doDont: [
      { do: 'Usa evidencia de tu camino.', dont: 'Escribas solo sueños futuros.' },
      { do: 'Sé específico y realista.', dont: 'Prometas impacto garantizado.' }
    ],
    examples: ['Mi meta es analizar salud pública con enfoque en acceso rural.', 'La beca ayudaría a cubrir un certificado de datos antes de una práctica de investigación.'],
    links: [ES_COMMON.links.essayTool, { href: '/essays/examples', label: 'Ejemplos de ensayos' }],
    faq: [
      { question: '¿Y si mi meta cambia?', answer: 'Puedes hablar de una dirección, campo o problema que quieres trabajar.' },
      { question: '¿Debo mencionar salario?', answer: 'Normalmente no; enfócate en preparación, servicio y educación.' }
    ],
    disclaimer: ES_COMMON.disclaimer
  },
  '/essays/mistakes': {
    bucket: 'essays',
    kind: 'essay',
    title: 'Errores comunes en ensayos de becas',
    metaDescription:
      'Evita errores comunes: introducciones genéricas, afirmaciones sin prueba, desviarse del prompt y omitir instrucciones.',
    h1: 'Errores comunes en ensayos de becas',
    eyebrow: 'Guía de revisión',
    intro:
      'Muchos ensayos débiles no fallan por falta de historia, sino porque la historia es demasiado general o no responde el prompt.',
    oneSentence:
      'El mayor error es escribir un ensayo pulido que podría pertenecer a cualquier estudiante.',
    sections: [
      {
        title: 'Afirmaciones genéricas',
        body:
          'Palabras como dedicado o apasionado no son prueba. Sustitúyelas por acciones y resultados.',
        bullets: ['Nombra proyecto o responsabilidad.', 'Muestra qué cambió.', 'Usa detalles defendibles.']
      },
      {
        title: 'Ignorar al proveedor',
        body:
          'No necesitas halagar a la organización, pero sí responder lo que pidió.',
        bullets: ['Identifica tema del prompt.', 'Adapta el texto.', 'Confirma ejemplos requeridos.']
      }
    ],
    checklist: ['Quitar frases genéricas', 'Agregar prueba', 'Revisar cada párrafo', 'Evitar repetir currículum', 'Confirmar fuente oficial'],
    doDont: [
      { do: 'Usa ejemplos concretos.', dont: 'Dependas de adjetivos.' },
      { do: 'Revisa para cada prompt.', dont: 'Envíes el mismo texto sin cambios.' }
    ],
    examples: ['Genérico: soy líder. Mejor: organicé una colecta cuando mi club perdió patrocinador.', 'Genérico: necesito la beca. Mejor: cubriría una cuota de laboratorio no incluida en mi ayuda actual.'],
    links: [ES_COMMON.links.essayTool, { href: '/essays/checklist', label: 'Checklist final' }],
    faq: [
      { question: '¿Está mal mencionar necesidad financiera?', answer: 'No, si es específica, honesta y conectada con tu plan educativo.' },
      { question: '¿Puedo reutilizar un ensayo?', answer: 'Puedes reutilizar partes, pero adapta el enfoque a cada prompt.' }
    ],
    disclaimer: ES_COMMON.disclaimer
  },
  '/compare/scholarship-vs-grant': {
    bucket: 'compare',
    kind: 'compare',
    title: 'Beca vs subvención: diferencias clave',
    metaDescription:
      'Compara becas y subvenciones por propósito, elegibilidad, fuente, solicitud y verificación.',
    h1: 'Beca vs subvención',
    eyebrow: 'Comparación',
    intro:
      'Ambas pueden reducir costos educativos, pero no siempre significan lo mismo en reglas, fuente y solicitud.',
    oneSentence:
      'Una beca suele enfocarse en mérito, perfil o propósito; una subvención suele estar más ligada a necesidad, programa o financiación institucional.',
    table: {
      columns: ['Factor', 'Beca', 'Subvención'],
      rows: [
        { factor: 'Uso común', left: 'Premio educativo competitivo.', right: 'Ayuda o financiación para un propósito definido.' },
        { factor: 'Elegibilidad', left: 'Puede depender de mérito, campo, identidad o necesidad.', right: 'Puede depender de necesidad, programa, institución o gobierno.' },
        { factor: 'Verificación', left: 'Confirma proveedor, fecha y documentos.', right: 'Confirma reglas, pago y condiciones del programa.' }
      ]
    },
    chooseLeft: ['El prompt pide logros, metas o perfil.', 'Puedes preparar documentos competitivos.'],
    chooseRight: ['La ayuda está ligada a necesidad o programa.', 'La institución o agencia define reglas específicas.'],
    sections: [{ title: 'Qué revisar', body: 'No te quedes con el nombre. Revisa quién paga, qué cubre y qué condiciones existen.', bullets: ['Fuente', 'Renovación', 'Pago', 'Documentos'] }],
    checklist: ['Leer reglas oficiales', 'Confirmar si se renueva', 'Verificar documentos', 'Comparar esfuerzo'],
    links: [ES_COMMON.links.scholarships, ES_COMMON.links.disclaimer],
    faq: [
      { question: '¿Una subvención se devuelve?', answer: 'Depende del programa. Confirma condiciones oficiales antes de aceptar fondos.' },
      { question: '¿Una beca siempre es por mérito?', answer: 'No. Muchas becas combinan mérito, necesidad, perfil o campo de estudio.' }
    ],
    disclaimer: ES_COMMON.disclaimer
  },
  '/compare/merit-vs-need-based-scholarships': {
    bucket: 'compare',
    kind: 'compare',
    title: 'Becas por mérito vs becas por necesidad',
    metaDescription:
      'Compara becas por mérito y por necesidad: criterios, documentos, estrategia y qué verificar.',
    h1: 'Mérito vs necesidad financiera',
    eyebrow: 'Comparación',
    intro:
      'La diferencia principal está en qué intenta medir el proveedor: rendimiento o brecha financiera.',
    oneSentence:
      'Las becas por mérito premian evidencia de rendimiento; las de necesidad se enfocan en una brecha económica documentada.',
    table: {
      columns: ['Factor', 'Mérito', 'Necesidad'],
      rows: [
        { factor: 'Base', left: 'Notas, liderazgo, talento, servicio o logros.', right: 'Costos educativos frente a recursos disponibles.' },
        { factor: 'Documentos', left: 'Transcripción, recomendaciones, portafolio o ensayo.', right: 'Formularios financieros, presupuesto o explicación de necesidad.' },
        { factor: 'Riesgo', left: 'Competencia alta.', right: 'Datos financieros incompletos o requisitos estrictos.' }
      ]
    },
    chooseLeft: ['Tienes evidencia fuerte de rendimiento.', 'Puedes demostrar logros con detalles.'],
    chooseRight: ['Tu brecha financiera es clara.', 'Puedes aportar documentos si se solicitan.'],
    sections: [{ title: 'Estrategia', body: 'Muchas solicitudes mezclan ambos criterios; prepara evidencia académica y contexto financiero sin exagerar.', bullets: ['Prueba', 'Claridad', 'Documentos'] }],
    checklist: ['Identificar criterio principal', 'Preparar evidencia', 'Confirmar documentos', 'Evitar promesas'],
    links: [{ href: '/essays/financial-need', label: 'Ensayo de necesidad financiera' }, ES_COMMON.links.scholarships],
    faq: [
      { question: '¿Puedo aplicar a ambos tipos?', answer: 'Sí, si cumples requisitos y puedes entregar documentos solicitados.' },
      { question: '¿Necesidad financiera significa contar toda mi vida?', answer: 'No. Explica la brecha relevante con claridad y privacidad.' }
    ],
    disclaimer: ES_COMMON.disclaimer
  },
  '/compare/no-essay-vs-essay-scholarships': {
    bucket: 'compare',
    kind: 'compare',
    title: 'Becas sin ensayo vs con ensayo',
    metaDescription:
      'Compara becas sin ensayo y con ensayo por esfuerzo, competencia, evidencia y estrategia.',
    h1: 'Becas sin ensayo vs becas con ensayo',
    eyebrow: 'Comparación',
    intro:
      'Las becas sin ensayo pueden ser rápidas, pero la facilidad no siempre significa mejor probabilidad.',
    oneSentence:
      'Sin ensayo reduce esfuerzo; con ensayo puede permitir diferenciarte si tu historia encaja con el prompt.',
    table: {
      columns: ['Factor', 'Sin ensayo', 'Con ensayo'],
      rows: [
        { factor: 'Tiempo', left: 'Más rápida.', right: 'Requiere planificación y revisión.' },
        { factor: 'Diferenciación', left: 'Menos espacio para explicar tu ajuste.', right: 'Más espacio para evidencia personal.' },
        { factor: 'Riesgo', left: 'Puede atraer más solicitantes.', right: 'Puede fallar por prompt mal respondido.' }
      ]
    },
    chooseLeft: ['Cumples reglas y tienes poco tiempo.', 'La solicitud es clara y gratuita.'],
    chooseRight: ['Tienes una historia fuerte.', 'El prompt encaja con tus metas o necesidad.'],
    sections: [{ title: 'Cómo decidir', body: 'Compara tiempo, probabilidad de ajuste y claridad de fuente antes de aplicar.', bullets: ['Fecha', 'Fuente', 'Esfuerzo', 'Historia'] }],
    checklist: ['Confirmar que no hay cuota', 'Revisar elegibilidad', 'Usar checklist si hay ensayo'],
    links: [{ href: '/essays/checklist', label: 'Checklist de ensayo' }, ES_COMMON.links.scholarships],
    faq: [
      { question: '¿Las becas sin ensayo son reales?', answer: 'Algunas sí, pero confirma fuente, reglas, privacidad y ruta oficial.' },
      { question: '¿Cuándo vale la pena escribir ensayo?', answer: 'Cuando el prompt te permite demostrar un ajuste fuerte con evidencia concreta.' }
    ],
    disclaimer: ES_COMMON.disclaimer
  },
  '/compare/local-vs-national-scholarships': {
    bucket: 'compare',
    kind: 'compare',
    title: 'Becas locales vs nacionales',
    metaDescription:
      'Compara becas locales y nacionales por competencia, elegibilidad, búsqueda, documentos y verificación.',
    h1: 'Becas locales vs becas nacionales',
    eyebrow: 'Comparación',
    intro:
      'Las becas locales pueden tener criterios más estrechos; las nacionales pueden ofrecer mayor visibilidad o montos más altos.',
    oneSentence:
      'La mejor opción depende de tu ajuste real, no solo del tamaño del premio.',
    table: {
      columns: ['Factor', 'Local', 'Nacional'],
      rows: [
        { factor: 'Alcance', left: 'Escuela, ciudad, condado, estado o comunidad.', right: 'País completo o grupo amplio.' },
        { factor: 'Competencia', left: 'Puede ser menor si el criterio es estrecho.', right: 'Suele ser más amplia.' },
        { factor: 'Verificación', left: 'Revisa escuela, fundación o grupo cívico.', right: 'Revisa proveedor nacional y reglas de privacidad.' }
      ]
    },
    chooseLeft: ['Cumples residencia o escuela específica.', 'Puedes conseguir documentos locales.'],
    chooseRight: ['Tu perfil encaja con criterios amplios.', 'Puedes competir con una solicitud fuerte.'],
    sections: [{ title: 'Estrategia combinada', body: 'No elijas solo una categoría. Construye una lista con oportunidades locales de buen ajuste y nacionales selectivas.', bullets: ['Ajuste', 'Fecha', 'Documentos'] }],
    checklist: ['Buscar reglas de residencia', 'Confirmar organización', 'Comparar esfuerzo y monto'],
    links: [ES_COMMON.links.scholarships, ES_COMMON.links.methodology],
    faq: [
      { question: '¿Las becas locales son mejores?', answer: 'No siempre, pero pueden ser fuertes si la elegibilidad coincide claramente.' },
      { question: '¿Cómo verifico una beca local?', answer: 'Busca la página oficial de escuela, fundación, grupo cívico o proveedor.' }
    ],
    disclaimer: ES_COMMON.disclaimer
  },
  ...extendedEsPages
} as Record<Stage2PilotCanonicalPath, PageDraft>;

const FR_PAGES: Record<Stage2PilotCanonicalPath, PageDraft> = {
  ...(Object.fromEntries(
    Object.entries(ES_PAGES).map(([path, page]) => [
      path,
      {
        ...page,
        title: page.title,
        metaDescription: page.metaDescription,
        h1: page.h1,
        eyebrow: page.eyebrow,
        intro: page.intro,
        disclaimer: FR_COMMON.disclaimer,
        links: []
      } satisfies PageDraft
    ])
  ) as unknown as Record<Stage2PilotCanonicalPath, PageDraft>),
  '/': {
    bucket: 'core',
    kind: 'home',
    title: 'ScholarshipTop en français: rechercher, comparer et planifier les bourses',
    metaDescription:
      'Recherchez des bourses avec des signaux d’admissibilité, de date limite, de source officielle et d’effort de candidature.',
    h1: 'Cherchez des bourses avec du contexte, pas seulement une liste',
    eyebrow: 'Pilote en français',
    intro:
      'ScholarshipTop aide les étudiants à trouver des bourses pertinentes, comparer les critères, vérifier les dates limites et confirmer la source officielle avant de postuler.',
    oneSentence:
      'ScholarshipTop organise les bourses par adéquation, date, exigences, source et effort de candidature pour faciliter la décision.',
    sections: [
      {
        title: 'Ce que nous vérifions',
        body:
          'Nous affichons les signaux de source officielle, de clarté de date, de critères, de documents et de données manquantes lorsque ces éléments sont disponibles.',
        bullets: ['Statut de source officielle', 'Date limite et urgence', 'Clarté de l’admissibilité', 'Éléments à confirmer']
      },
      {
        title: 'Comment utiliser le pilote',
        body:
          'Commencez par le catalogue, consultez les guides de rédaction si une réponse écrite est demandée, puis utilisez les comparaisons pour comprendre les types d’aide.',
        bullets: ['Sauvegarder des options réalistes', 'Comparer effort et montant', 'Vérifier le parcours officiel']
      }
    ],
    cards: [
      { title: 'Bourses', body: 'Apprendre à évaluer une bourse par adéquation et source.', href: '/scholarships' },
      { title: 'Rédaction', body: 'Préparer des réponses claires et originales.', href: '/essays' },
      { title: 'Comparaisons', body: 'Comprendre les différences entre types d’aide.', href: '/compare' }
    ],
    links: [FR_COMMON.links.scholarships, FR_COMMON.links.essays, FR_COMMON.links.methodology],
    faq: [
      {
        question: 'Ce pilote traduit-il toutes les bourses?',
        answer:
          'Non. Le pilote français couvre les pages de base et des guides sélectionnés; les pages longues ne seront publiées qu’après contrôle qualité.'
      },
      {
        question: 'Les recommandations garantissent-elles une bourse?',
        answer:
          'Non. Elles aident à prioriser, mais ne garantissent ni admissibilité, ni sélection, ni paiement.'
      }
    ],
    disclaimer: FR_COMMON.disclaimer
  },
  '/scholarships': {
    bucket: 'core',
    kind: 'hub',
    title: 'Catalogue de bourses: choisir des opportunités réalistes',
    metaDescription:
      'Utilisez le catalogue ScholarshipTop avec source, date, admissibilité et effort avant de postuler.',
    h1: 'Catalogue de bourses',
    eyebrow: 'Recherche de bourses',
    intro:
      'Cette page explique comment utiliser ScholarshipTop pour transformer une longue liste en options réalistes selon admissibilité, date, montant, documents et source.',
    sections: [
      {
        title: 'Commencez large, puis filtrez',
        body:
          'Ne choisissez pas une bourse seulement par son titre. Vérifiez d’abord citoyenneté, niveau d’études, domaine, lieu et documents.',
        bullets: ['Vérifier l’admissibilité avant le montant', 'Prioriser les dates claires', 'Éviter les données critiques manquantes']
      },
      {
        title: 'Signaux de confiance',
        body:
          'Lorsqu’une fiche est incomplète, ScholarshipTop doit indiquer ce qui manque au lieu de la présenter comme entièrement vérifiée.',
        bullets: ['Source officielle', 'Date limite', 'Documents', 'Parcours de candidature']
      }
    ],
    cards: [
      { title: 'Guides de rédaction', body: 'Préparez-vous si la bourse demande un texte.', href: '/essays' },
      { title: 'Fournisseurs', body: 'Consultez le contexte des organisations.', href: '/providers' },
      { title: 'Alerte aux arnaques', body: 'Repérez les signaux de risque.', href: '/scholarship-scam-warning' }
    ],
    links: [FR_COMMON.links.essays, FR_COMMON.links.providers, FR_COMMON.links.disclaimer],
    faq: [
      { question: 'Que vérifier en premier?', answer: 'Commencez par l’admissibilité et la date limite, puis comparez montant, effort, documents et source officielle.' },
      { question: 'Pourquoi certaines données sont-elles incomplètes?', answer: 'Certains fournisseurs publient des informations limitées ou changeantes; ScholarshipTop signale ce qui doit être confirmé.' }
    ],
    disclaimer: FR_COMMON.disclaimer
  },
  '/essays': {
    bucket: 'essays',
    kind: 'hub',
    title: 'Guides de rédaction pour les bourses',
    metaDescription:
      'Guides en français pour exemples, checklist, besoin financier, objectifs professionnels et erreurs courantes.',
    h1: 'Centre de rédaction pour les bourses',
    eyebrow: 'Rédaction',
    intro:
      'Organisez votre réponse avant d’écrire: comprenez la consigne, choisissez des preuves réelles, vérifiez les instructions et confirmez la date officielle.',
    sections: [{ title: 'Par où commencer', body: 'Étudiez les exemples pour la structure, utilisez la checklist et évitez les textes génériques.', bullets: ['Exemples', 'Checklist', 'Erreurs courantes', 'Besoin financier'] }],
    cards: [
      { title: 'Exemples de rédaction', body: 'Étudier la structure sans copier.', href: '/essays/examples' },
      { title: 'Checklist finale', body: 'Vérifier consigne, preuve et format.', href: '/essays/checklist' },
      { title: 'Besoin financier', body: 'Expliquer un écart réel sans exagérer.', href: '/essays/financial-need' },
      { title: 'Objectifs professionnels', body: 'Relier expérience, études et prochain pas.', href: '/essays/career-goals' },
      { title: 'Erreurs courantes', body: 'Éviter les affirmations vagues.', href: '/essays/mistakes' }
    ],
    links: [FR_COMMON.links.essayTool, FR_COMMON.links.scholarships],
    faq: [
      { question: 'Puis-je copier un exemple?', answer: 'Non. Utilisez les exemples pour comprendre la structure; votre texte final doit rester personnel.' },
      { question: 'Essay Mentor garantit-il un prix?', answer: 'Non. L’outil peut aider à structurer les idées, mais la décision appartient au fournisseur.' }
    ],
    disclaimer: FR_COMMON.disclaimer
  },
  '/providers': {
    bucket: 'core',
    kind: 'hub',
    title: 'Annuaire des fournisseurs de bourses',
    metaDescription:
      'Comprendre les profils de fournisseurs avec source, bourses liées et éléments à vérifier.',
    h1: 'Annuaire des fournisseurs de bourses',
    eyebrow: 'Fournisseurs',
    intro:
      'Les profils de fournisseurs doivent aider à comprendre l’organisation derrière une opportunité et les informations à confirmer avant de postuler.',
    sections: [{ title: 'Lire un profil', body: 'Un profil utile montre les bourses liées, le statut de source, les données incomplètes et le lien de correction.', bullets: ['Bourses liées', 'Source officielle', 'Données partielles', 'Corrections'] }],
    cards: [
      { title: 'Méthodologie', body: 'Comment nous signalons sources et données manquantes.', href: '/scholarship-verification-methodology' },
      { title: 'Corrections', body: 'Signaler un fournisseur ou un lien incorrect.', href: '/corrections' },
      { title: 'Avertissement', body: 'Vérifiez toujours la source officielle.', href: '/financial-aid-disclaimer' }
    ],
    links: [FR_COMMON.links.methodology, FR_COMMON.links.corrections],
    faq: [
      { question: 'ScholarshipTop représente-t-il les fournisseurs?', answer: 'Non. Les profils reposent sur les données disponibles dans ScholarshipTop et doivent être confirmés auprès de la source officielle.' },
      { question: 'Pourquoi un profil peut-il être incomplet?', answer: 'Il peut manquer une URL officielle claire, une description complète ou assez de bourses liées.' }
    ],
    disclaimer: FR_COMMON.disclaimer
  },
  '/compare': {
    bucket: 'compare',
    kind: 'hub',
    title: 'Comparer les bourses, subventions et types d’aide',
    metaDescription:
      'Comparez bourses, subventions, mérite, besoin financier et options avec ou sans rédaction.',
    h1: 'Comparer les bourses et types d’aide',
    eyebrow: 'Comparaisons',
    intro:
      'Les comparaisons aident à décider où investir du temps avant d’ouvrir une candidature officielle.',
    sections: [{ title: 'Décisions fréquentes', body: 'Commencez par les différences durables: bourse ou subvention, mérite ou besoin, sans rédaction ou avec rédaction, local ou national.', bullets: ['Objectif', 'Admissibilité', 'Effort', 'Documents'] }],
    cards: [
      { title: 'Bourse vs subvention', body: 'Comprendre objectif et candidature.', href: '/compare/scholarship-vs-grant' },
      { title: 'Mérite vs besoin', body: 'Comparer critères académiques et financiers.', href: '/compare/merit-vs-need-based-scholarships' },
      { title: 'Sans rédaction vs avec rédaction', body: 'Évaluer effort et concurrence.', href: '/compare/no-essay-vs-essay-scholarships' },
      { title: 'Local vs national', body: 'Comparer portée et adéquation.', href: '/compare/local-vs-national-scholarships' }
    ],
    links: [FR_COMMON.links.scholarships, FR_COMMON.links.essays],
    faq: [
      { question: 'Quelle comparaison lire d’abord?', answer: 'Commencez par le type d’aide qui influence votre décision immédiate: finances, rédaction, portée ou type de prix.' },
      { question: 'Une comparaison remplace-t-elle la page officielle?', answer: 'Non. Elle aide à décider; les règles finales doivent être confirmées à la source.' }
    ],
    disclaimer: FR_COMMON.disclaimer
  },
  '/resources': {
    bucket: 'resources',
    kind: 'hub',
    title: 'Ressources pour rechercher et demander des bourses',
    metaDescription:
      'Ressources en français pour recherche de bourses, rédaction, comparaisons, sécurité et vérification.',
    h1: 'Ressources pour étudiants',
    eyebrow: 'Ressources',
    intro:
      'Utilisez ces ressources comme parcours: chercher des bourses, écrire des candidatures, comparer les options et éviter les risques.',
    sections: [{ title: 'Couches d’aide', body: 'L’objectif est de transformer une longue liste en plan d’action vérifiable et réaliste.', bullets: ['Recherche', 'Rédaction', 'Comparaisons', 'Sécurité'] }],
    cards: [
      { title: 'Rédaction', body: 'Guides pour répondre aux consignes.', href: '/essays' },
      { title: 'Comparer', body: 'Différences entre types d’aide.', href: '/compare' },
      { title: 'Arnaques', body: 'Signaux d’alerte avant de postuler.', href: '/scholarship-scam-warning' }
    ],
    links: [FR_COMMON.links.essays, FR_COMMON.links.compare, FR_COMMON.links.methodology],
    faq: [
      { question: 'Pourquoi utiliser des ressources en plus du catalogue?', answer: 'Parce que de nombreuses candidatures échouent par stratégie, documents ou consignes, pas seulement par manque d’options.' },
      { question: 'D’autres ressources seront-elles traduites?', answer: 'Oui, uniquement lorsque chaque page aura un contenu revu et utile.' }
    ],
    disclaimer: FR_COMMON.disclaimer
  },
  '/about': trustPageFr('À propos de ScholarshipTop', 'À propos de ScholarshipTop', 'ScholarshipTop aide les étudiants à rechercher, comparer, sauvegarder et utiliser des opportunités de bourses avec plus de contexte qu’une simple liste.', 'Le produit organise les opportunités par adéquation, date, exigences, valeur, source et effort pour aider à prioriser.', 'Les conseils éditoriaux expliquent les données disponibles sans inventer résultats, admissibilité ou approbation officielle.'),
  '/editorial-policy': trustPageFr('Politique éditoriale de ScholarshipTop', 'Politique éditoriale', 'Notre politique éditoriale sépare faits publics, analyse pratique et avertissements lorsque les informations d’une bourse sont incomplètes.', 'Les résumés doivent être originaux, clairs et basés sur les faits disponibles; ils ne doivent pas copier les textes officiels ni inventer des données.', 'Si une source change ou qu’une erreur est détectée, la page doit être corrigée ou marquée comme à vérifier.'),
  '/scholarship-verification-methodology': trustPageFr('Méthode de vérification des bourses', 'Comment nous vérifions les bourses', 'ScholarshipTop examine des signaux comme source officielle, date, montant, admissibilité, documents, parcours de candidature et données manquantes.', 'Une fiche peut indiquer source disponible, confirmation nécessaire, données partielles, source peu claire ou cycle expiré.', 'La transparence fait partie de la qualité: si un élément manque, il doit être affiché comme à confirmer.'),
  '/how-we-rank-scholarships': trustPageFr('Comment ScholarshipTop classe les recommandations', 'Comment nous classons les recommandations', 'Les recommandations reposent sur l’adéquation au profil, les signaux d’admissibilité, l’urgence de date, l’effort et la clarté des données.', 'Le classement aide à prioriser, mais ne garantit ni admissibilité, ni sélection, ni paiement.', 'Les signaux de sauvegarde, rejet et correspondance doivent soutenir la planification sans remplacer les règles officielles.'),
  '/how-scholarshiptop-works': trustPageFr('Comment fonctionne ScholarshipTop', 'Comment fonctionne ScholarshipTop', 'Le parcours est simple: répondre à des questions, recevoir des correspondances, comparer les options, sauvegarder les dates et postuler à la source officielle.', 'ScholarshipTop aide à passer d’une recherche dispersée à une liste courte avec actions claires.', 'Chaque étape doit rappeler que les détails finaux appartiennent au fournisseur officiel.'),
  '/financial-aid-disclaimer': trustPageFr('Avertissement sur l’aide financière', 'Avertissement sur l’aide financière', 'ScholarshipTop n’est pas un fournisseur de bourses, une université ni une agence gouvernementale. L’information sert à guider et organiser.', 'Les étudiants doivent confirmer règles, dates, paiements, renouvellements et documents à la source officielle.', 'Aucune page ne doit promettre sélection, admissibilité finale ou réception de fonds.'),
  '/contact': trustPageFr('Contact ScholarshipTop', 'Contact', 'Utilisez le contact pour assistance, erreurs de source, dates incorrectes, admissibilité douteuse ou préoccupations de sécurité.', 'Les signalements utiles incluent l’URL, le nom de la bourse ou du fournisseur, le champ incorrect et la source confirmant le changement.', 'Quand les données sont insuffisantes, ScholarshipTop doit marquer la fiche pour vérification plutôt qu’inventer.'),
  '/corrections': trustPageFr('Corrections ScholarshipTop', 'Corrections', 'Les étudiants et fournisseurs peuvent signaler dates incorrectes, liens brisés, admissibilité erronée ou risque d’arnaque.', 'Une correction doit reposer sur une source vérifiable, idéalement la page officielle du fournisseur.', 'Si elle ne peut pas être confirmée, la page doit rendre l’incertitude visible.'),
  '/scholarship-scam-warning': trustPageFr('Signaux d’arnaque aux bourses', 'Signaux d’arnaque aux bourses', 'Méfiez-vous des frais obligatoires, faux chèques, pression urgente, courriels non officiels et promesses garanties.', 'Avant de partager des données, confirmez domaine officiel, contact, date, critères et parcours de candidature.', 'ScholarshipTop doit aider à repérer les risques sans accuser sans preuve.'),
  '/how-we-make-money': trustPageFr('Comment ScholarshipTop gagne de l’argent', 'Comment ScholarshipTop gagne de l’argent', 'ScholarshipTop peut proposer des fonctions gratuites et payantes, mais payer ne garantit pas une bourse ni n’influence les fournisseurs.', 'La valeur payante doit concerner les outils, l’organisation ou le support, pas une promesse d’attribution.', 'Les recommandations ne doivent pas être vendues comme placements fictifs ou faux avis.'),
  '/essays/examples': {
    bucket: 'essays',
    kind: 'essay',
    title: 'Exemples de rédaction de bourse et comment les utiliser',
    metaDescription: 'Étudiez des exemples de rédaction de bourse sans copier: structure, preuve, voix et révision.',
    h1: 'Exemples de rédaction pour bourses',
    eyebrow: 'Guide de rédaction',
    intro: 'Les exemples servent à comprendre la structure, pas à copier une histoire. Observez comment une consigne se relie à une preuve concrète.',
    oneSentence: 'Un bon exemple enseigne la structure tout en laissant votre réponse finale originale.',
    sections: [
      { title: 'Lire un exemple', body: 'Repérez la consigne, l’idée centrale, la preuve et le lien avec l’objectif éducatif.', bullets: ['Marquer l’idée principale', 'Chercher les détails concrets', 'Observer la conclusion'] },
      { title: 'Créer votre version', body: 'Remplacez chaque détail emprunté par des faits réels de votre parcours.', bullets: ['Utiliser votre chronologie', 'Éviter la copie', 'Confirmer la limite de mots'] }
    ],
    checklist: ['Consigne claire', 'Histoire personnelle', 'Preuve concrète', 'Conclusion liée au prix'],
    doDont: [
      { do: 'Étudier structure et rythme.', dont: 'Copier phrases ou expériences.' },
      { do: 'Utiliser des preuves réelles.', dont: 'Inventer réussites ou difficultés.' }
    ],
    examples: ['Faible: J’ai toujours voulu aider. Mieux: Après avoir aidé six camarades en algèbre, j’ai appris à expliquer par étapes.', 'Faible: Cette bourse changera ma vie. Mieux: Cette aide couvrirait les frais de certification avant mon premier stage clinique.'],
    links: [FR_COMMON.links.essayTool, { href: '/essays/checklist', label: 'Checklist de rédaction' }],
    faq: [
      { question: 'Puis-je réutiliser un exemple?', answer: 'Vous pouvez en étudier la structure, mais le texte final doit vous appartenir.' },
      { question: 'Le texte doit-il être dramatique?', answer: 'Non. Un texte précis et honnête est souvent plus fort qu’un texte exagéré.' }
    ],
    disclaimer: FR_COMMON.disclaimer
  },
  '/essays/checklist': {
    bucket: 'essays',
    kind: 'essay',
    title: 'Checklist pour relire une rédaction de bourse',
    metaDescription: 'Vérifiez consigne, preuve, clarté, format, documents et source officielle avant d’envoyer.',
    h1: 'Checklist pour rédaction de bourse',
    eyebrow: 'Avant l’envoi',
    intro: 'Une relecture finale doit vérifier plus que la grammaire: elle confirme que le texte répond à la consigne et suit les règles.',
    oneSentence: 'Avant d’envoyer, vérifiez consigne, preuve, format, documents et parcours officiel.',
    sections: [
      { title: 'Relecture stratégique', body: 'L’idée principale doit être claire sans votre CV à côté.', bullets: ['Introduction rapide', 'Preuve pour chaque affirmation', 'Conclusion utile'] },
      { title: 'Sécurité d’envoi', body: 'De nombreuses erreurs viennent du format, de la date, du fuseau horaire ou de l’anonymat.', bullets: ['Vérifier le format', 'Confirmer la date officielle', 'Contrôler les documents'] }
    ],
    checklist: ['Consigne respectée', 'Preuve réelle', 'Nombre de mots', 'Format correct', 'Source officielle confirmée'],
    doDont: [
      { do: 'Lire le texte à voix haute.', dont: 'Envoyer le premier brouillon propre.' },
      { do: 'Vérifier les instructions officielles.', dont: 'Se fier à une date copiée.' }
    ],
    examples: ['Remplacez “je suis motivé” par l’action qui le prouve.', 'Si le fournisseur exige PDF, n’envoyez pas un autre format.'],
    links: [FR_COMMON.links.essayTool, { href: '/essays/mistakes', label: 'Erreurs courantes' }],
    faq: [
      { question: 'Quelle vérification est la plus importante?', answer: 'L’adéquation à la consigne. Un texte poli qui ne répond pas reste faible.' },
      { question: 'ScholarshipTop garantit-il la sélection?', answer: 'Non. Nous offrons une aide rédactionnelle, pas une décision de sélection.' }
    ],
    disclaimer: FR_COMMON.disclaimer
  },
  '/essays/financial-need': {
    bucket: 'essays',
    kind: 'essay',
    title: 'Rédiger une lettre de besoin financier pour une bourse',
    metaDescription: 'Expliquez un besoin financier avec clarté, honnêteté et lien avec votre plan d’études.',
    h1: 'Rédaction sur le besoin financier',
    eyebrow: 'Guide de rédaction',
    intro: 'Ce type de texte doit expliquer l’écart entre vos ressources et votre plan éducatif sans devenir une liste de difficultés.',
    oneSentence: 'Un texte fort relie un écart financier réel à une prochaine étape académique concrète.',
    sections: [
      { title: 'Expliquer l’écart', body: 'Dites clairement quel coût est difficile à couvrir et comment la bourse aiderait.', bullets: ['Coûts éducatifs pertinents', 'Vie privée respectée', 'Lien avec frais, matériel ou examens'] },
      { title: 'Besoin et action', body: 'Le besoin compte, mais montrez aussi ce que vous faites de l’opportunité.', bullets: ['Effort ou planification', 'Pas d’exagération', 'Prochain pas clair'] }
    ],
    checklist: ['Objectif éducatif', 'Écart réel', 'Ton honnête', 'Usage du prix', 'Documents confirmés'],
    doDont: [
      { do: 'Être précis sur les coûts.', dont: 'Partager des détails non demandés.' },
      { do: 'Relier besoin et plan.', dont: 'Faire tout le texte sur la difficulté.' }
    ],
    examples: ['Cette aide couvrirait l’examen de certification requis pour mon premier semestre.', 'Une aide pour les livres réduirait mes heures de travail pendant les examens.'],
    links: [FR_COMMON.links.essayTool, FR_COMMON.links.disclaimer],
    faq: [
      { question: 'Dois-je inclure le revenu familial exact?', answer: 'Seulement si la candidature le demande; sinon, expliquez l’écart de façon pratique.' },
      { question: 'Puis-je mentionner des responsabilités familiales?', answer: 'Oui, si cela éclaire votre contexte éducatif et financier.' }
    ],
    disclaimer: FR_COMMON.disclaimer
  },
  '/essays/career-goals': {
    bucket: 'essays',
    kind: 'essay',
    title: 'Rédiger une rédaction sur les objectifs professionnels',
    metaDescription: 'Planifiez une rédaction avec motivation précise, preuve et prochaines étapes réalistes.',
    h1: 'Rédaction sur les objectifs professionnels',
    eyebrow: 'Guide de rédaction',
    intro: 'Ce texte doit montrer pourquoi votre objectif a du sens maintenant, pas seulement quel poste vous voulez plus tard.',
    oneSentence: 'Reliez preuves passées, plan d’études actuel et prochaine étape professionnelle.',
    sections: [
      { title: 'Rendre l’objectif crédible', body: 'Vous n’avez pas besoin d’un plan parfait sur dix ans; il faut une direction liée à vos choix.', bullets: ['Nommer le domaine', 'Expliquer l’origine', 'Inclure cours, projets ou service'] },
      { title: 'La bourse comme pont', body: 'Expliquez l’étape pratique que la bourse facilite: frais, livres, certification, déplacement ou équipement.', bullets: ['Être concret', 'Éviter les garanties', 'Se concentrer sur la préparation'] }
    ],
    checklist: ['Objectif en une phrase', 'Preuve personnelle', 'Plan d’études', 'Usage de la bourse', 'Conclusion réaliste'],
    doDont: [
      { do: 'Utiliser des preuves de votre parcours.', dont: 'Écrire seulement des rêves futurs.' },
      { do: 'Être précis et réaliste.', dont: 'Promettre un impact garanti.' }
    ],
    examples: ['Mon objectif est d’analyser la santé publique avec un focus sur l’accès rural.', 'La bourse aiderait à financer un certificat de données avant un stage de recherche.'],
    links: [FR_COMMON.links.essayTool, { href: '/essays/examples', label: 'Exemples de rédaction' }],
    faq: [
      { question: 'Et si mon objectif change?', answer: 'Vous pouvez parler d’une direction, d’un domaine ou d’un problème que vous voulez traiter.' },
      { question: 'Dois-je parler de salaire?', answer: 'En général non; concentrez-vous sur préparation, service et éducation.' }
    ],
    disclaimer: FR_COMMON.disclaimer
  },
  '/essays/mistakes': {
    bucket: 'essays',
    kind: 'essay',
    title: 'Erreurs courantes dans les rédactions de bourse',
    metaDescription: 'Évitez introductions génériques, affirmations sans preuve, hors-sujet et instructions oubliées.',
    h1: 'Erreurs courantes dans les rédactions de bourse',
    eyebrow: 'Guide de révision',
    intro: 'Beaucoup de textes faibles ne manquent pas d’histoire; ils sont trop généraux ou ne répondent pas à la consigne.',
    oneSentence: 'La plus grande erreur est d’écrire un texte poli qui pourrait appartenir à n’importe quel étudiant.',
    sections: [
      { title: 'Affirmations génériques', body: 'Des mots comme motivé ou passionné ne sont pas des preuves. Remplacez-les par des actions.', bullets: ['Nommer projet ou responsabilité', 'Montrer le changement', 'Utiliser des détails défendables'] },
      { title: 'Ignorer le fournisseur', body: 'Vous n’avez pas besoin de flatter l’organisation, mais vous devez répondre à ce qui est demandé.', bullets: ['Identifier le thème', 'Adapter le texte', 'Confirmer les exemples requis'] }
    ],
    checklist: ['Supprimer phrases génériques', 'Ajouter preuve', 'Vérifier chaque paragraphe', 'Éviter la répétition du CV', 'Confirmer la source'],
    doDont: [
      { do: 'Utiliser des exemples concrets.', dont: 'Dépendre des adjectifs.' },
      { do: 'Adapter à chaque consigne.', dont: 'Envoyer le même texte sans modification.' }
    ],
    examples: ['Générique: je suis leader. Mieux: j’ai organisé une collecte quand mon club a perdu son sponsor.', 'Générique: j’ai besoin de la bourse. Mieux: elle couvrirait des frais de laboratoire non inclus dans mon aide.'],
    links: [FR_COMMON.links.essayTool, { href: '/essays/checklist', label: 'Checklist finale' }],
    faq: [
      { question: 'Est-ce mauvais de parler de besoin financier?', answer: 'Non, si c’est précis, honnête et lié à votre plan éducatif.' },
      { question: 'Puis-je réutiliser un texte?', answer: 'Vous pouvez réutiliser des éléments, mais adaptez l’angle à chaque consigne.' }
    ],
    disclaimer: FR_COMMON.disclaimer
  },
  '/compare/scholarship-vs-grant': {
    bucket: 'compare',
    kind: 'compare',
    title: 'Bourse vs subvention: différences clés',
    metaDescription: 'Comparez bourses et subventions par objectif, admissibilité, source, candidature et vérification.',
    h1: 'Bourse vs subvention',
    eyebrow: 'Comparaison',
    intro: 'Les deux peuvent réduire les coûts d’études, mais leurs règles, sources et parcours ne sont pas toujours identiques.',
    oneSentence: 'Une bourse met souvent l’accent sur mérite, profil ou objectif; une subvention est souvent liée à un besoin, programme ou financement institutionnel.',
    table: {
      columns: ['Facteur', 'Bourse', 'Subvention'],
      rows: [
        { factor: 'Usage courant', left: 'Prix éducatif compétitif.', right: 'Aide ou financement pour un but défini.' },
        { factor: 'Admissibilité', left: 'Mérite, domaine, identité ou besoin.', right: 'Besoin, programme, institution ou gouvernement.' },
        { factor: 'Vérification', left: 'Confirmer fournisseur, date et documents.', right: 'Confirmer règles, paiement et conditions.' }
      ]
    },
    chooseLeft: ['La consigne demande réalisations, objectifs ou profil.', 'Vous pouvez préparer des documents compétitifs.'],
    chooseRight: ['L’aide est liée au besoin ou au programme.', 'Une institution ou agence fixe les règles.'],
    sections: [{ title: 'À vérifier', body: 'Ne vous arrêtez pas au nom. Vérifiez qui paie, ce qui est couvert et les conditions.', bullets: ['Source', 'Renouvellement', 'Paiement', 'Documents'] }],
    checklist: ['Lire les règles officielles', 'Confirmer le renouvellement', 'Vérifier les documents', 'Comparer l’effort'],
    links: [FR_COMMON.links.scholarships, FR_COMMON.links.disclaimer],
    faq: [
      { question: 'Une subvention doit-elle être remboursée?', answer: 'Cela dépend du programme. Vérifiez les conditions officielles avant d’accepter des fonds.' },
      { question: 'Une bourse est-elle toujours au mérite?', answer: 'Non. Beaucoup combinent mérite, besoin, profil ou domaine d’études.' }
    ],
    disclaimer: FR_COMMON.disclaimer
  },
  '/compare/merit-vs-need-based-scholarships': {
    bucket: 'compare',
    kind: 'compare',
    title: 'Bourses au mérite vs bourses selon le besoin',
    metaDescription: 'Comparez critères, documents, stratégie et vérifications pour mérite et besoin financier.',
    h1: 'Mérite vs besoin financier',
    eyebrow: 'Comparaison',
    intro: 'La différence principale est ce que le fournisseur cherche à mesurer: performance ou écart financier.',
    oneSentence: 'Les bourses au mérite récompensent des preuves de performance; celles selon le besoin ciblent un écart économique documenté.',
    table: {
      columns: ['Facteur', 'Mérite', 'Besoin'],
      rows: [
        { factor: 'Base', left: 'Notes, leadership, talent, service ou réussites.', right: 'Coûts éducatifs face aux ressources.' },
        { factor: 'Documents', left: 'Relevé, recommandations, portfolio ou rédaction.', right: 'Formulaires financiers, budget ou explication.' },
        { factor: 'Risque', left: 'Concurrence élevée.', right: 'Données financières incomplètes ou règles strictes.' }
      ]
    },
    chooseLeft: ['Vous avez une preuve forte de performance.', 'Vous pouvez démontrer vos réussites.'],
    chooseRight: ['Votre écart financier est clair.', 'Vous pouvez fournir les documents demandés.'],
    sections: [{ title: 'Stratégie', body: 'De nombreuses candidatures mélangent les deux critères; préparez preuves académiques et contexte financier sans exagérer.', bullets: ['Preuve', 'Clarté', 'Documents'] }],
    checklist: ['Identifier le critère principal', 'Préparer preuve', 'Confirmer documents', 'Éviter les promesses'],
    links: [{ href: '/essays/financial-need', label: 'Guide besoin financier' }, FR_COMMON.links.scholarships],
    faq: [
      { question: 'Puis-je postuler aux deux types?', answer: 'Oui, si vous répondez aux critères et pouvez fournir les documents.' },
      { question: 'Le besoin financier exige-t-il de tout raconter?', answer: 'Non. Expliquez l’écart pertinent avec clarté et respect de votre vie privée.' }
    ],
    disclaimer: FR_COMMON.disclaimer
  },
  '/compare/no-essay-vs-essay-scholarships': {
    bucket: 'compare',
    kind: 'compare',
    title: 'Bourses sans rédaction vs avec rédaction',
    metaDescription: 'Comparez effort, concurrence, preuve et stratégie pour les bourses avec ou sans rédaction.',
    h1: 'Bourses sans rédaction vs avec rédaction',
    eyebrow: 'Comparaison',
    intro: 'Les bourses sans rédaction peuvent être rapides, mais la facilité ne signifie pas toujours meilleure probabilité.',
    oneSentence: 'Sans rédaction réduit l’effort; avec rédaction permet de se distinguer si votre histoire correspond à la consigne.',
    table: {
      columns: ['Facteur', 'Sans rédaction', 'Avec rédaction'],
      rows: [
        { factor: 'Temps', left: 'Plus rapide.', right: 'Demande planification et relecture.' },
        { factor: 'Différenciation', left: 'Moins d’espace pour expliquer votre adéquation.', right: 'Plus d’espace pour des preuves personnelles.' },
        { factor: 'Risque', left: 'Peut attirer plus de candidats.', right: 'Peut échouer si la consigne est mal traitée.' }
      ]
    },
    chooseLeft: ['Vous remplissez les règles et manquez de temps.', 'La candidature est claire et gratuite.'],
    chooseRight: ['Vous avez une histoire forte.', 'La consigne correspond à vos objectifs ou besoins.'],
    sections: [{ title: 'Décider', body: 'Comparez temps, adéquation et clarté de source avant de postuler.', bullets: ['Date', 'Source', 'Effort', 'Histoire'] }],
    checklist: ['Confirmer absence de frais', 'Vérifier admissibilité', 'Utiliser la checklist si rédaction'],
    links: [{ href: '/essays/checklist', label: 'Checklist de rédaction' }, FR_COMMON.links.scholarships],
    faq: [
      { question: 'Les bourses sans rédaction sont-elles réelles?', answer: 'Certaines oui, mais vérifiez source, règles, confidentialité et parcours officiel.' },
      { question: 'Quand écrire vaut-il la peine?', answer: 'Quand la consigne vous permet de montrer une adéquation forte avec preuve concrète.' }
    ],
    disclaimer: FR_COMMON.disclaimer
  },
  '/compare/local-vs-national-scholarships': {
    bucket: 'compare',
    kind: 'compare',
    title: 'Bourses locales vs nationales',
    metaDescription: 'Comparez bourses locales et nationales par concurrence, admissibilité, recherche, documents et vérification.',
    h1: 'Bourses locales vs bourses nationales',
    eyebrow: 'Comparaison',
    intro: 'Les bourses locales peuvent avoir des critères plus étroits; les nationales peuvent offrir plus de visibilité ou des montants plus élevés.',
    oneSentence: 'La meilleure option dépend de votre adéquation réelle, pas seulement du montant.',
    table: {
      columns: ['Facteur', 'Locale', 'Nationale'],
      rows: [
        { factor: 'Portée', left: 'École, ville, comté, État ou communauté.', right: 'Pays entier ou groupe large.' },
        { factor: 'Concurrence', left: 'Peut être plus faible si le critère est étroit.', right: 'Souvent plus large.' },
        { factor: 'Vérification', left: 'École, fondation ou groupe civique.', right: 'Fournisseur national et règles de confidentialité.' }
      ]
    },
    chooseLeft: ['Vous remplissez une résidence ou école spécifique.', 'Vous pouvez obtenir des documents locaux.'],
    chooseRight: ['Votre profil correspond à des critères larges.', 'Vous pouvez produire une candidature forte.'],
    sections: [{ title: 'Stratégie combinée', body: 'Ne choisissez pas une seule catégorie: créez une liste avec options locales pertinentes et nationales sélectives.', bullets: ['Adéquation', 'Date', 'Documents'] }],
    checklist: ['Vérifier résidence', 'Confirmer organisation', 'Comparer effort et montant'],
    links: [FR_COMMON.links.scholarships, FR_COMMON.links.methodology],
    faq: [
      { question: 'Les bourses locales sont-elles meilleures?', answer: 'Pas toujours, mais elles peuvent être fortes si l’admissibilité correspond clairement.' },
      { question: 'Comment vérifier une bourse locale?', answer: 'Cherchez la page officielle de l’école, fondation, groupe civique ou fournisseur.' }
    ],
    disclaimer: FR_COMMON.disclaimer
  },
  ...extendedFrPages
};

const LOCALIZED_PAGES: LocalizedPilotPage[] = STAGE2_PILOT_LOCALES.flatMap(
  (locale) => {
    const pages = locale === 'es' ? ES_PAGES : FR_PAGES;
    return STAGE2_PILOT_CANONICAL_PATHS.map((canonicalPath) =>
      makePage(locale, canonicalPath, pages[canonicalPath])
    );
  }
);

export function listLocalizedPilotPages({
  locale,
  bucket
}: {
  locale?: Stage2PilotLocale;
  bucket?: LocalizedPilotPageBucket;
} = {}): LocalizedPilotPage[] {
  return LOCALIZED_PAGES.filter((page) => {
    if (locale && page.locale !== locale) return false;
    if (bucket && page.bucket !== bucket) return false;
    return true;
  });
}

export function getLocalizedPilotPage(
  locale: string | null | undefined,
  canonicalPath: string | null | undefined
): LocalizedPilotPage | null {
  if (!isStage2PilotLocale(locale)) return null;
  const normalized = normalizeCanonicalPath(canonicalPath ?? '/');
  if (!isStage2PilotCanonicalPath(normalized)) return null;
  return (
    LOCALIZED_PAGES.find(
      (page) => page.locale === locale && page.canonicalPath === normalized
    ) ?? null
  );
}

export function getLocalizedPilotPageBySegments(
  locale: string | null | undefined,
  segments: readonly string[] | undefined
): LocalizedPilotPage | null {
  return getLocalizedPilotPage(locale, pilotCanonicalPathFromSegments(segments));
}

export function availableLocalesForPilotPath(
  canonicalPath: string | null | undefined
): Array<'en' | Stage2PilotLocale> {
  const normalized = normalizeCanonicalPath(canonicalPath ?? '/');
  if (!isStage2PilotCanonicalPath(normalized)) return ['en'];
  const locales = STAGE2_PILOT_LOCALES.filter((locale) =>
    Boolean(getLocalizedPilotPage(locale, normalized))
  );
  return ['en', ...locales];
}
