import type { IqLocale } from '@/lib/iq/i18n/iqLocales';

export type LandingDomainCopy = { title: string; description: string };
export type LandingTrustCopy = { title: string; text: string };

export type IqLandingCopy = {
  hero: {
    badge: string;
    title: string;
    subtitle: string;
    cta: string;
    trustChips: [string, string, string];
  };
  proofPoints: Array<{ value: string; label: string; detail: string }>;
  reportPreview: {
    badge: string;
    title: string;
    subtitle: string;
    statLabels: [string, string, string];
    sampleStats: [string, string, string];
    domainBreakdown: string;
    sampleDomains: Array<[string, string]>;
    insightTitles: [string, string];
    insightBodies: [string, string];
    sectionBadge: string;
    sectionTitle: string;
    sectionBody: string;
    sectionBullets: [string, string, string];
  };
  executive: {
    badge: string;
    eliteBand: string;
    quote: string;
    rows: Array<[string, string]>;
    domainPacingTitle: string;
    domainPacingHeading: string;
    domainPacingBody: string;
    matrixTitle: string;
    matrixHeading: string;
    matrixSignals: Array<[string, string]>;
    reportSignal: string;
  };
  domainsSection: {
    eyebrow: string;
    title: string;
    body: string;
    domains: LandingDomainCopy[];
  };
  resultExperience: {
    badge: string;
    title: string;
    body: string;
    features: string[];
  };
  trust: {
    eyebrow: string;
    title: string;
    body: string;
    standards: LandingTrustCopy[];
  };
  finalCta: {
    title: string;
    body: string;
    cta: string;
    chips: [string, string, string];
  };
};

const EN: IqLandingCopy = {
  hero: {
    badge: 'Online IQ-style cognitive assessment',
    title: 'A smarter IQ test for people who want to understand their mind.',
    subtitle:
      'Take a short, timed cognitive assessment inspired by modern online psychometrics and classic reasoning traditions. See your IQ-style score band, percentile context, five-domain profile, and Brain Archetype in one clean report.',
    cta: 'Start assessment',
    trustChips: ['Timed, mobile-friendly', 'Transparent claims', 'Private by design']
  },
  proofPoints: [
    {
      value: '30',
      label: 'focused items',
      detail: 'short enough to finish, structured enough to reveal a pattern'
    },
    {
      value: '5',
      label: 'cognitive domains',
      detail: 'reasoning, spatial, verbal, numerical, and decision speed'
    },
    {
      value: '1',
      label: 'personal profile',
      detail: 'an IQ-style result plus a cognitive archetype explanation'
    }
  ],
  reportPreview: {
    badge: 'Full report unlocked',
    title: 'Your IQ-style cognitive profile',
    subtitle:
      'A clear report with your score context, domain profile, Brain Archetype, and plain-English interpretation.',
    statLabels: ['IQ-style score', 'Percentile context', 'Brain Archetype'],
    sampleStats: ['118', 'Top 9%', 'Pattern Strategist'],
    domainBreakdown: 'Domain breakdown',
    sampleDomains: [
      ['Abstract Reasoning', '92%'],
      ['Spatial Intelligence', '84%'],
      ['Numerical Logic', '76%'],
      ['Verbal Reasoning', '68%'],
      ['Decision Speed', '61%']
    ],
    insightTitles: ['How to read this', 'Your strongest signal'],
    insightBodies: [
      'Accuracy, difficulty, and timing become a profile you can understand in minutes.',
      'The report highlights the domain that best explains your problem-solving style.'
    ],
    sectionBadge: 'Report preview',
    sectionTitle: 'See the full report before it ever reaches your inbox.',
    sectionBody:
      'This is the exact kind of outcome users unlock after the test: a premium, readable IQ-style profile that turns raw answers into a score band, percentile context, cognitive domains, and a clear explanation of how their mind attacks hard problems.',
    sectionBullets: [
      'A real report layout with score, percentile, archetype, and ranked domains',
      'Plain-English interpretation instead of a cold number with no context',
      'Private email access link so the result feels saved, personal, and premium'
    ]
  },
  executive: {
    badge: 'Executive IQ analysis',
    eliteBand: 'Elite band',
    quote: '“Strong pattern discovery with fast rule compression under timed pressure.”',
    rows: [
      ['Signal', 'Abstract reasoning and spatial mapping'],
      ['Risk', 'Speed dips on verbal-heavy items'],
      ['Next move', 'Use structured prompts and focused review']
    ],
    domainPacingTitle: 'Domain pacing',
    domainPacingHeading: 'Accuracy and speed become a readable pattern.',
    domainPacingBody:
      'The final report translates raw answers into score context, strongest domains, and the areas where timing changed the profile.',
    matrixTitle: 'Cognitive sync matrix',
    matrixHeading: 'Five signals, one clear profile.',
    matrixSignals: [
      ['Pattern strategy', '96%'],
      ['Spatial mapping', '91%'],
      ['Numerical logic', '88%'],
      ['Verbal clarity', '74%']
    ],
    reportSignal: 'report signal'
  },
  domainsSection: {
    eyebrow: 'What it measures',
    title: 'One number gets attention. The profile explains it.',
    body: 'The assessment is built around multiple cognitive task families, so the result can show whether your strength is visual reasoning, verbal logic, speed, symbolic patterning, or a mix of all five.',
    domains: [
      {
        title: 'Abstract reasoning',
        description:
          'Pattern discovery, rule induction, and visual matrix-style thinking.'
      },
      {
        title: 'Numerical logic',
        description:
          'Series, proportions, and symbolic relationships without heavy school math.'
      },
      {
        title: 'Spatial intelligence',
        description:
          'Mental rotation, visual structure, and shape-based problem solving.'
      },
      {
        title: 'Verbal reasoning',
        description:
          'Analogies, deductive logic, and conceptual relationships in language.'
      },
      {
        title: 'Decision speed',
        description:
          'Timed prioritization and how efficiently you choose under constraints.'
      }
    ]
  },
  resultExperience: {
    badge: 'Result experience',
    title: 'Built for curiosity first, then clarity.',
    body: 'Most people arrive because they are curious about IQ. The product keeps that curiosity, then turns the result into a structured explanation of how they solve problems.',
    features: [
      'Estimated IQ-style score band with plain-language interpretation',
      'Percentile-style context based on your performance pattern',
      'Five-domain cognitive profile instead of a single flat number',
      'Brain Archetype label based on relative strengths',
      'Question-by-question reasoning review in the full report',
      'Clear caveats on what the test does and does not claim'
    ]
  },
  trust: {
    eyebrow: 'Trust by design',
    title: 'Premium does not mean exaggerated.',
    body: 'The strongest version of this product is confident and honest: it can be fascinating, useful, and beautifully presented without claiming to replace a licensed psychological assessment.',
    standards: [
      {
        title: 'Inspired, not falsely certified',
        text: 'The page references established psychometric traditions without claiming to be WAIS, Raven, ICAR, or a clinical diagnostic instrument.'
      },
      {
        title: 'Mobile-first timing',
        text: 'Different item types use different time budgets because spatial and complex reasoning tasks often need more time than quick symbolic tasks.'
      },
      {
        title: 'Transparent limitations',
        text: 'Archetypes are interpretive profiles. Percentiles and IQ-style bands depend on reference samples and should be read as guidance, not diagnosis.'
      }
    ]
  },
  finalCta: {
    title: 'Take the test. See the pattern behind your score.',
    body: 'Start with a focused assessment, then unlock a report that explains your cognitive profile in a way that feels clear, modern, and useful.',
    cta: 'Start the IQ test',
    chips: [
      'Made for curious adults and students',
      'Five-domain cognitive profile',
      'Clear scientific caveats'
    ]
  }
};

const ES: IqLandingCopy = {
  hero: {
    badge: 'Evaluación cognitiva tipo CI online',
    title: 'Un test de CI más inteligente para quien quiere entender su mente.',
    subtitle:
      'Haz una evaluación cognitiva breve y cronometrada inspirada en psicometría online y tradiciones clásicas de razonamiento. Ve tu banda de puntuación tipo CI, contexto de percentil, perfil en cinco dominios y arquetipo cerebral en un informe claro.',
    cta: 'Iniciar evaluación',
    trustChips: ['Cronometrado y móvil', 'Afirmaciones transparentes', 'Privado por diseño']
  },
  proofPoints: [
    {
      value: '30',
      label: 'ítems enfocados',
      detail: 'lo bastante corto para terminar, lo bastante estructurado para revelar un patrón'
    },
    {
      value: '5',
      label: 'dominios cognitivos',
      detail: 'razonamiento, espacial, verbal, numérico y velocidad de decisión'
    },
    {
      value: '1',
      label: 'perfil personal',
      detail: 'resultado tipo CI más explicación de arquetipo cognitivo'
    }
  ],
  reportPreview: {
    badge: 'Informe completo desbloqueado',
    title: 'Tu perfil cognitivo tipo CI',
    subtitle:
      'Un informe claro con contexto de puntuación, perfil por dominios, arquetipo cerebral e interpretación en lenguaje llano.',
    statLabels: ['Puntuación tipo CI', 'Contexto de percentil', 'Arquetipo cerebral'],
    sampleStats: ['118', 'Top 9%', 'Estratega de patrones'],
    domainBreakdown: 'Desglose por dominios',
    sampleDomains: [
      ['Razonamiento abstracto', '92%'],
      ['Inteligencia espacial', '84%'],
      ['Lógica numérica', '76%'],
      ['Lógica verbal', '68%'],
      ['Velocidad de decisión', '61%']
    ],
    insightTitles: ['Cómo leer esto', 'Tu señal más fuerte'],
    insightBodies: [
      'Precisión, dificultad y tiempo se convierten en un perfil comprensible en minutos.',
      'El informe destaca el dominio que mejor explica tu estilo de resolución de problemas.'
    ],
    sectionBadge: 'Vista previa del informe',
    sectionTitle: 'Ve el informe completo antes de que llegue a tu bandeja.',
    sectionBody:
      'Este es el tipo de resultado que desbloqueas tras el test: un perfil tipo CI legible que convierte respuestas en banda de puntuación, percentil, dominios cognitivos y una explicación clara de cómo abordas problemas difíciles.',
    sectionBullets: [
      'Diseño real con puntuación, percentil, arquetipo y dominios ordenados',
      'Interpretación en lenguaje llano, no solo un número frío',
      'Enlace privado por correo para que el resultado se sienta personal y premium'
    ]
  },
  executive: {
    badge: 'Análisis ejecutivo de CI',
    eliteBand: 'Banda alta',
    quote: '«Fuerte descubrimiento de patrones con compresión rápida de reglas bajo presión.»',
    rows: [
      ['Señal', 'Razonamiento abstracto y mapeo espacial'],
      ['Riesgo', 'Caídas de velocidad en ítems verbales'],
      ['Siguiente paso', 'Usar indicaciones estructuradas y repaso enfocado']
    ],
    domainPacingTitle: 'Ritmo por dominios',
    domainPacingHeading: 'Precisión y velocidad forman un patrón legible.',
    domainPacingBody:
      'El informe final traduce respuestas en contexto de puntuación, dominios más fuertes y áreas donde el tiempo cambió el perfil.',
    matrixTitle: 'Matriz de sincronía cognitiva',
    matrixHeading: 'Cinco señales, un perfil claro.',
    matrixSignals: [
      ['Estrategia de patrones', '96%'],
      ['Mapeo espacial', '91%'],
      ['Lógica numérica', '88%'],
      ['Claridad verbal', '74%']
    ],
    reportSignal: 'señal del informe'
  },
  domainsSection: {
    eyebrow: 'Qué mide',
    title: 'Un número llama la atención. El perfil lo explica.',
    body: 'La evaluación cubre varias familias de tareas cognitivas para mostrar si tu fortaleza es razonamiento visual, lógica verbal, velocidad, patrones simbólicos o una mezcla de los cinco.',
    domains: [
      {
        title: 'Razonamiento abstracto',
        description:
          'Descubrimiento de patrones, inducción de reglas y pensamiento tipo matriz visual.'
      },
      {
        title: 'Lógica numérica',
        description:
          'Series, proporciones y relaciones simbólicas sin matemáticas escolares pesadas.'
      },
      {
        title: 'Inteligencia espacial',
        description:
          'Rotación mental, estructura visual y resolución de problemas con formas.'
      },
      {
        title: 'Lógica verbal',
        description:
          'Analogías, lógica deductiva y relaciones conceptuales en lenguaje.'
      },
      {
        title: 'Velocidad de decisión',
        description:
          'Priorización cronometrada y eficiencia al elegir bajo restricciones.'
      }
    ]
  },
  resultExperience: {
    badge: 'Experiencia de resultado',
    title: 'Hecho para la curiosidad primero, luego la claridad.',
    body: 'La mayoría llega por curiosidad sobre el CI. El producto mantiene esa curiosidad y convierte el resultado en una explicación estructurada de cómo resuelves problemas.',
    features: [
      'Banda de puntuación tipo CI estimada con interpretación clara',
      'Contexto tipo percentil según tu patrón de rendimiento',
      'Perfil en cinco dominios en lugar de un solo número',
      'Etiqueta de arquetipo cerebral según fortalezas relativas',
      'Repaso pregunta a pregunta en el informe completo',
      'Advertencias claras sobre lo que el test afirma y no afirma'
    ]
  },
  trust: {
    eyebrow: 'Confianza por diseño',
    title: 'Premium no significa exagerado.',
    body: 'La mejor versión es segura y honesta: puede fascinar y ser útil sin sustituir una evaluación psicológica con licencia.',
    standards: [
      {
        title: 'Inspirado, no falsamente certificado',
        text: 'La página cita tradiciones psicométricas sin afirmar ser WAIS, Raven, ICAR ni un instrumento clínico.'
      },
      {
        title: 'Cronometraje pensado para móvil',
        text: 'Distintos tipos de ítem usan distintos tiempos porque el razonamiento espacial complejo suele necesitar más que tareas simbólicas rápidas.'
      },
      {
        title: 'Limitaciones transparentes',
        text: 'Los arquetipos son perfiles interpretativos. Percentiles y bandas tipo CI dependen de muestras de referencia; son orientación, no diagnóstico.'
      }
    ]
  },
  finalCta: {
    title: 'Haz el test. Ve el patrón detrás de tu puntuación.',
    body: 'Empieza con una evaluación enfocada y desbloquea un informe que explica tu perfil cognitivo de forma clara y moderna.',
    cta: 'Iniciar el test de CI',
    chips: [
      'Para adultos y estudiantes curiosos',
      'Perfil cognitivo en cinco dominios',
      'Advertencias científicas claras'
    ]
  }
};

const FR: IqLandingCopy = {
  hero: {
    badge: 'Évaluation cognitive type QI en ligne',
    title: 'Un test de QI plus intelligent pour comprendre son esprit.',
    subtitle:
      'Passez une évaluation cognitive courte et chronométrée inspirée de la psychométrie en ligne et des traditions de raisonnement classiques. Score type QI, percentile, profil en cinq domaines et archétype cérébral dans un rapport clair.',
    cta: 'Commencer l’évaluation',
    trustChips: ['Chronométré et mobile', 'Affirmations transparentes', 'Privé par conception']
  },
  proofPoints: [
    {
      value: '30',
      label: 'questions ciblées',
      detail: 'assez court pour finir, assez structuré pour révéler un motif'
    },
    {
      value: '5',
      label: 'domaines cognitifs',
      detail: 'raisonnement, spatial, verbal, numérique et vitesse de décision'
    },
    {
      value: '1',
      label: 'profil personnel',
      detail: 'résultat type QI plus explication d’archétype cognitif'
    }
  ],
  reportPreview: {
    badge: 'Rapport complet débloqué',
    title: 'Votre profil cognitif type QI',
    subtitle:
      'Un rapport clair avec contexte de score, profil par domaine, archétype cérébral et interprétation en langage simple.',
    statLabels: ['Score type QI', 'Contexte de percentile', 'Archétype cérébral'],
    sampleStats: ['118', 'Top 9%', 'Stratège de motifs'],
    domainBreakdown: 'Répartition par domaines',
    sampleDomains: [
      ['Raisonnement abstrait', '92%'],
      ['Intelligence spatiale', '84%'],
      ['Logique numérique', '76%'],
      ['Logique verbale', '68%'],
      ['Vitesse de décision', '61%']
    ],
    insightTitles: ['Comment lire ce rapport', 'Votre signal le plus fort'],
    insightBodies: [
      'Précision, difficulté et temps deviennent un profil compréhensible en quelques minutes.',
      'Le rapport met en avant le domaine qui explique le mieux votre style de résolution.'
    ],
    sectionBadge: 'Aperçu du rapport',
    sectionTitle: 'Voyez le rapport complet avant qu’il n’arrive dans votre boîte mail.',
    sectionBody:
      'C’est le type de résultat débloqué après le test : un profil type QI lisible qui transforme les réponses en bande de score, percentile, domaines cognitifs et explication claire de votre façon d’aborder les problèmes difficiles.',
    sectionBullets: [
      'Mise en page réelle avec score, percentile, archétype et domaines classés',
      'Interprétation en langage simple plutôt qu’un chiffre froid',
      'Lien privé par e-mail pour un résultat personnel et premium'
    ]
  },
  executive: {
    badge: 'Analyse exécutive de QI',
    eliteBand: 'Bande élite',
    quote: '« Forte découverte de motifs et compression rapide des règles sous pression. »',
    rows: [
      ['Signal', 'Raisonnement abstrait et cartographie spatiale'],
      ['Risque', 'Baisse de vitesse sur les items verbaux'],
      ['Prochain pas', 'Utiliser des consignes structurées et une relecture ciblée']
    ],
    domainPacingTitle: 'Rythme par domaine',
    domainPacingHeading: 'Précision et vitesse forment un motif lisible.',
    domainPacingBody:
      'Le rapport final traduit les réponses en contexte de score, domaines les plus forts et zones où le temps a changé le profil.',
    matrixTitle: 'Matrice de synchro cognitive',
    matrixHeading: 'Cinq signaux, un profil clair.',
    matrixSignals: [
      ['Stratégie de motifs', '96%'],
      ['Cartographie spatiale', '91%'],
      ['Logique numérique', '88%'],
      ['Clarté verbale', '74%']
    ],
    reportSignal: 'signal du rapport'
  },
  domainsSection: {
    eyebrow: 'Ce que cela mesure',
    title: 'Un chiffre attire l’attention. Le profil l’explique.',
    body: 'L’évaluation couvre plusieurs familles de tâches cognitives pour montrer si votre force est le raisonnement visuel, la logique verbale, la vitesse, les motifs symboliques ou un mélange des cinq.',
    domains: [
      {
        title: 'Raisonnement abstrait',
        description:
          'Découverte de motifs, induction de règles et pensée de type matrice visuelle.'
      },
      {
        title: 'Logique numérique',
        description:
          'Séries, proportions et relations symboliques sans lourdes mathématiques scolaires.'
      },
      {
        title: 'Intelligence spatiale',
        description:
          'Rotation mentale, structure visuelle et résolution de problèmes par formes.'
      },
      {
        title: 'Logique verbale',
        description:
          'Analogies, logique déductive et relations conceptuelles dans le langage.'
      },
      {
        title: 'Vitesse de décision',
        description:
          'Priorisation chronométrée et efficacité des choix sous contraintes.'
      }
    ]
  },
  resultExperience: {
    badge: 'Expérience de résultat',
    title: 'Conçu pour la curiosité d’abord, puis la clarté.',
    body: 'La plupart arrivent par curiosité sur le QI. Le produit garde cette curiosité et transforme le résultat en explication structurée de votre façon de résoudre les problèmes.',
    features: [
      'Bande de score type QI estimée avec interprétation claire',
      'Contexte de type percentile selon votre performance',
      'Profil en cinq domaines plutôt qu’un seul chiffre',
      'Libellé d’archétype cérébral selon les forces relatives',
      'Revue question par question dans le rapport complet',
      'Mises en garde claires sur ce que le test affirme ou non'
    ]
  },
  trust: {
    eyebrow: 'Confiance par conception',
    title: 'Premium ne veut pas dire exagéré.',
    body: 'La meilleure version est confiante et honnête : fascinante et utile sans remplacer une évaluation psychologique agréée.',
    standards: [
      {
        title: 'Inspiré, pas faussement certifié',
        text: 'La page cite des traditions psychométriques sans prétendre être WAIS, Raven, ICAR ou un instrument clinique.'
      },
      {
        title: 'Chronométrage mobile d’abord',
        text: 'Les types d’items ont des budgets de temps différents : le raisonnement spatial complexe demande souvent plus que les tâches symboliques rapides.'
      },
      {
        title: 'Limites transparentes',
        text: 'Les archétypes sont des profils interprétatifs. Percentiles et bandes type QI dépendent d’échantillons de référence ; ce sont des repères, pas un diagnostic.'
      }
    ]
  },
  finalCta: {
    title: 'Passez le test. Voyez le motif derrière votre score.',
    body: 'Commencez par une évaluation ciblée, puis débloquez un rapport qui explique votre profil cognitif de façon claire et moderne.',
    cta: 'Commencer le test de QI',
    chips: [
      'Pour adultes et étudiants curieux',
      'Profil cognitif en cinq domaines',
      'Mises en garde scientifiques claires'
    ]
  }
};

const COPY: Record<IqLocale, IqLandingCopy> = { en: EN, es: ES, fr: FR };

export function getIqLandingCopy(locale: IqLocale): IqLandingCopy {
  return COPY[locale];
}
