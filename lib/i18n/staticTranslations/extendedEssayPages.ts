import type { PageDraft } from '@/lib/i18n/staticTranslations/types';
import {
  ES_DISCLAIMER,
  ES_ESSAY_LINKS,
  FR_DISCLAIMER,
  FR_ESSAY_LINKS
} from '@/lib/i18n/staticTranslations/common';

const ES_EYEBROW = 'Guía de ensayo';
const FR_EYEBROW = 'Guide de rédaction';

const essayCommonLinksEs = [
  ES_ESSAY_LINKS.essayTool,
  ES_ESSAY_LINKS.scholarships,
  ES_ESSAY_LINKS.disclaimer
];

const essayCommonLinksFr = [
  FR_ESSAY_LINKS.essayTool,
  FR_ESSAY_LINKS.scholarships,
  FR_ESSAY_LINKS.disclaimer
];

export const extendedEssayEsPages: Partial<Record<string, PageDraft>> = {
  '/essays/outline': {
    bucket: 'essays',
    kind: 'essay',
    title: 'Esquema de ensayo para becas: una estructura simple que funciona',
    metaDescription:
      'Planifica un ensayo para beca con gancho, evidencia, reflexión y siguiente paso antes de redactar.',
    h1: 'Esquema de ensayo para becas',
    eyebrow: ES_EYEBROW,
    intro:
      'Un esquema evita que tu respuesta se convierta en una lista de logros. El objetivo es sostener un argumento claro sobre tu encaje con la beca.',
    oneSentence:
      'Un buen esquema asigna a cada párrafo una función: responder el prompt, probarlo con evidencia y conectarlo con el premio.',
    sections: [
      {
        title: 'Esquema de cinco partes',
        body:
          'La mayoría de ensayos para becas se planifican con cinco partes: gancho, contexto, evidencia, reflexión y uso futuro del premio.',
        bullets: [
          'Gancho: un momento, decisión o problema concreto.',
          'Contexto: por qué importa ese momento.',
          'Evidencia: qué hiciste, aprendiste, construiste o cambiaste.',
          'Reflexión: qué demuestra la evidencia sobre ti.',
          'Siguiente paso: cómo la beca apoya un plan real.'
        ]
      },
      {
        title: 'Mantén el prompt visible',
        body:
          'Antes de redactar, reescribe el prompt como checklist. Cada párrafo debe cumplir una parte de esa lista.',
        bullets: [
          'Marca temas obligatorios como necesidad, liderazgo, servicio o metas.',
          'Anota límite de palabras o formato.',
          'Reserva el último párrafo para un siguiente paso concreto.'
        ]
      }
    ],
    checklist: [
      'Escribe el prompt en palabras simples.',
      'Elige una afirmación central.',
      'Selecciona la evidencia más fuerte.',
      'Planifica una frase de reflexión por párrafo del cuerpo.',
      'Cierra con cómo el premio apoya tu siguiente paso.'
    ],
    doDont: [
      { do: 'Esquematiza antes de redactar.', dont: 'Empieces con una historia de vida genérica.' },
      { do: 'Usa una historia principal con evidencia clara.', dont: 'Listes toda tu hoja de actividades.' }
    ],
    examples: [
      'Prompt: explica tus metas profesionales. Esquema: voluntariado clínico, interés en salud, cursos, siguiente paso formativo, impacto de la beca.',
      'Prompt: describe liderazgo. Esquema: problema en un club, acción, resultado, lección, cómo cambia tus planes universitarios.'
    ],
    links: [
      ...essayCommonLinksEs,
      { href: '/essays/career-goals', label: 'Ensayo de metas profesionales' },
      { href: '/essays/leadership', label: 'Ensayo de liderazgo' }
    ],
    faq: [
      {
        question: '¿Cuántos párrafos debe tener un ensayo para beca?',
        answer:
          'Muchos funcionan bien con cuatro o cinco párrafos, pero el prompt y el límite de palabras importan más que un número fijo.'
      },
      {
        question: '¿Debo esquematizar ensayos cortos también?',
        answer:
          'Sí. Un esquema breve evita repetición y te ayuda a usar palabras limitadas en la evidencia más fuerte.'
      }
    ],
    disclaimer: ES_DISCLAIMER
  },
  '/essays/leadership': {
    bucket: 'essays',
    kind: 'essay',
    title: 'Cómo escribir un ensayo de liderazgo para becas',
    metaDescription:
      'Escribe un ensayo de liderazgo con un problema real, acción, resultado y lección en lugar de afirmaciones genéricas.',
    h1: 'Guía de ensayo de liderazgo para becas',
    eyebrow: ES_EYEBROW,
    intro:
      'Los ensayos de liderazgo son más fuertes cuando describen un problema concreto y lo que hiciste cuando otras personas dependían de tu criterio.',
    oneSentence:
      'Un ensayo de liderazgo debe mostrar acción, responsabilidad, resultado y reflexión.',
    sections: [
      {
        title: 'Elige un momento real de liderazgo',
        body:
          'Liderazgo no siempre significa presidente de un club. Puede ser organizar, mediar, tutorizar, cuidar a la familia, iniciar un proyecto o asumir responsabilidad.',
        bullets: [
          'Empieza con un problema, no con un título.',
          'Explica qué hiciste personalmente.',
          'Nombra el resultado o la lección.'
        ]
      },
      {
        title: 'Muestra crecimiento',
        body:
          'Los comités suelen querer ver cómo piensas bajo presión. Incluye lo que aprendiste y cómo cambió tu siguiente acción.',
        bullets: [
          'Evita decir que lo resolviste todo solo.',
          'Reconoce al equipo o la comunidad cuando corresponda.',
          'Conecta la lección con tu plan educativo.'
        ]
      }
    ],
    checklist: [
      'Identifica el problema.',
      'Explica tu rol.',
      'Describe la acción que tomaste.',
      'Muestra un resultado o cambio.',
      'Reflexiona sobre la lección.',
      'Conecta el liderazgo con el prompt de la beca.'
    ],
    doDont: [
      { do: 'Escribe sobre responsabilidad.', dont: 'Te bases solo en títulos.' },
      { do: 'Muestra colaboración.', dont: 'Te presentes como el único héroe.' }
    ],
    examples: [
      'Cuando nuestro equipo de robótica perdió el espacio de reunión, coordiné un horario rotativo con la biblioteca y dos padres para terminar el proyecto.',
      'Tutorizar a mi primo cada noche me enseñó a dividir tareas en pasos repetibles, lo que ahora uso para liderar grupos de estudio.'
    ],
    links: [
      ...essayCommonLinksEs,
      { href: '/essays/examples', label: 'Ejemplos de ensayos' },
      ES_ESSAY_LINKS.scholarships
    ],
    faq: [
      {
        question: '¿Puede contar la responsabilidad familiar como liderazgo?',
        answer:
          'Sí, si el prompt permite una definición amplia. Explica la responsabilidad, las decisiones y las habilidades sin exagerar la situación.'
      },
      {
        question: '¿Necesito un cargo de liderazgo?',
        answer:
          'No. Un ejemplo claro de iniciativa y responsabilidad puede ser más fuerte que un título sin evidencia.'
      }
    ],
    disclaimer: ES_DISCLAIMER
  },
  '/essays/why-do-you-deserve-this-scholarship': {
    bucket: 'essays',
    kind: 'essay',
    title: 'Cómo responder: ¿por qué mereces esta beca?',
    metaDescription:
      'Responde el prompt común sin sonar arrogante. Conecta encaje, evidencia, necesidad y siguientes pasos.',
    h1: '¿Por qué mereces esta beca?',
    eyebrow: ES_EYEBROW,
    intro:
      'Este prompt no pide que declares ser mejor que todos los demás. Pide explicar por qué tu perfil encaja con el propósito del premio.',
    oneSentence:
      'Responde este prompt demostrando encaje con evidencia, no reclamando derecho.',
    sections: [
      {
        title: 'Traduce merecer en encaje',
        body:
          'Usa los criterios del proveedor como marco. Si la beca valora el servicio, habla de servicio. Si valora el campo, habla de tu preparación.',
        bullets: [
          'Nombra el encaje entre tu perfil y el premio.',
          'Apóyalo con uno o dos hechos.',
          'Explica cómo el premio ayuda al siguiente paso.'
        ]
      },
      {
        title: 'Mantén un tono seguro y realista',
        body:
          'El tono debe ser claro y agradecido, no disculpatorio ni arrogante.',
        bullets: [
          'Evita decir que lo mereces más que otros.',
          'Evita gratitud genérica sin evidencia.',
          'Cierra con algo práctico.'
        ]
      }
    ],
    checklist: [
      'Identifica el propósito de la beca.',
      'Declara tu encaje.',
      'Aporta evidencia.',
      'Menciona necesidad solo si es relevante.',
      'Conecta el premio con un siguiente paso concreto.'
    ],
    doDont: [
      { do: 'Usa evidencia para mostrar encaje.', dont: 'Te compares con postulantes desconocidos.' },
      { do: 'Mantén un tono respetuoso.', dont: 'Suenes garantizado o con derecho.' }
    ],
    examples: [
      'Encajo con esta beca porque mi tutoría voluntaria y mi carrera en educación coinciden con su enfoque en futuros docentes.',
      'El premio cubriría los materiales de laboratorio del semestre en el que empiezo investigación supervisada.'
    ],
    links: [
      ...essayCommonLinksEs,
      { href: '/essays/checklist', label: 'Antes de enviar' },
      { href: '/how-we-rank-scholarships', label: 'Cómo funcionan las recomendaciones' }
    ],
    faq: [
      {
        question: '¿Debo decir que merezco la beca?',
        answer:
          'Puedes usar el lenguaje del prompt, pero debes respaldarlo con encaje, evidencia y un siguiente paso realista.'
      },
      {
        question: '¿Debo mencionar a otros postulantes?',
        answer:
          'Por lo general no. Enfócate en tu encaje en lugar de especular sobre otros estudiantes.'
      }
    ],
    disclaimer: ES_DISCLAIMER
  },
  '/essays/personal-statement': {
    bucket: 'essays',
    kind: 'essay',
    title: 'Guía de declaración personal para becas',
    metaDescription:
      'Escribe una declaración personal que conecte trasfondo, motivación, evidencia y dirección futura.',
    h1: 'Declaración personal para becas',
    eyebrow: ES_EYEBROW,
    intro:
      'Una declaración personal ofrece al comité una imagen coherente de quién eres, qué moldeó tu dirección y por qué el premio encaja con tu siguiente paso.',
    oneSentence:
      'Una declaración personal debe hacer que tu trasfondo, motivación y plan se sientan conectados.',
    sections: [
      {
        title: 'Encuentra el hilo conductor',
        body:
          'Las mejores declaraciones no son autobiografías completas. Eligen los detalles que explican tu dirección actual.',
        bullets: [
          'Elige dos o tres momentos que se conecten.',
          'Explica decisiones, no solo eventos.',
          'Cierra con la trayectoria educativa que sigues.'
        ]
      },
      {
        title: 'Evita repetir el currículum',
        body:
          'Puedes mencionar logros, pero debes revelar significado y motivación que un currículum no muestra.',
        bullets: [
          'Reflexiona después de cada ejemplo.',
          'Muestra cómo cambió tu forma de pensar.',
          'Mantén un tono específico y directo.'
        ]
      }
    ],
    checklist: [
      'Elige un tema central.',
      'Usa ejemplos específicos.',
      'Explica por qué importan los ejemplos.',
      'Conecta con dirección académica o profesional.',
      'Elimina detalles que no apoyan el prompt.'
    ],
    doDont: [
      { do: 'Haz la declaración coherente.', dont: 'Intentes incluir toda tu vida.' },
      { do: 'Reflexiona sobre los ejemplos.', dont: 'Repitas el currículum línea por línea.' }
    ],
    examples: [
      'Un estudiante de primera generación puede conectar traducción familiar con interés en política pública o acceso a salud.',
      'Un estudiante transferido puede explicar cómo la universidad comunitaria aclaró el campo que ahora quiere seguir.'
    ],
    links: [
      ...essayCommonLinksEs,
      { href: '/essays/financial-need', label: 'Ensayo de necesidad financiera' },
      { href: '/essays/career-goals', label: 'Ensayo de metas profesionales' }
    ],
    faq: [
      {
        question: '¿Es lo mismo que un ensayo para beca?',
        answer:
          'A veces. La declaración personal es amplia; muchos ensayos responden un prompt más estrecho.'
      },
      {
        question: '¿Qué tan personal debe ser?',
        answer:
          'Lo suficiente para explicar tu camino, pero sin detalles tan privados que distraigan del prompt.'
      }
    ],
    disclaimer: ES_DISCLAIMER
  },
  '/essays/stem': {
    bucket: 'essays',
    kind: 'essay',
    title: 'Cómo escribir un ensayo STEM para becas',
    metaDescription:
      'Planifica un ensayo STEM en torno a proyectos, cursos, investigación, servicio y una dirección técnica clara.',
    h1: 'Guía de ensayo STEM para becas',
    eyebrow: ES_EYEBROW,
    intro:
      'Un ensayo STEM debe mostrar cómo piensas, construyes, pruebas, investigas o resuelves problemas. Evita decir solo que te gusta la ciencia o la tecnología.',
    oneSentence:
      'Un buen ensayo STEM usa evidencia técnica y explica por qué el trabajo importa.',
    sections: [
      {
        title: 'Usa evidencia técnica',
        body:
          'Proyectos, laboratorios, código, prácticas, robótica, tutorías, investigación y cursos pueden ser evidencia si explicas tu rol con claridad.',
        bullets: [
          'Describe el problema en el que trabajaste.',
          'Nombra tu contribución.',
          'Explica qué aprendiste o qué cambió.'
        ]
      },
      {
        title: 'Conecta STEM con impacto',
        body:
          'El ensayo debe conectar el interés técnico con una persona, comunidad, industria, pregunta de investigación o dirección profesional.',
        bullets: [
          'Evita jerga que no sirva a la historia.',
          'Define términos técnicos cuando haga falta.',
          'Muestra curiosidad y persistencia.'
        ]
      }
    ],
    checklist: [
      'Nombra tu campo o dirección STEM.',
      'Usa un proyecto o momento de aprendizaje concreto.',
      'Explica tu rol.',
      'Conecta habilidades con estudios futuros.',
      'Confirma si el proveedor pide carrera, GPA o plan de investigación.'
    ],
    doDont: [
      { do: 'Muestra cómo resuelves problemas.', dont: 'Listes palabras de moda STEM.' },
      { do: 'Explica tu contribución.', dont: 'Hagas parecer que otro hizo el trabajo.' }
    ],
    examples: [
      'En lugar de «me encanta la ingeniería», explica cómo probar un modelo de puente te enseñó a revisar tras un fallo.',
      'En lugar de «la IA es el futuro», describe un conjunto de datos, herramienta o pregunta ética que exploraste de verdad.'
    ],
    links: [
      ...essayCommonLinksEs,
      { href: '/scholarships/stem', label: 'Becas STEM' },
      { href: '/scholarships/engineering', label: 'Becas de ingeniería' }
    ],
    faq: [
      {
        question: '¿Debe incluir detalles técnicos?',
        answer:
          'Sí, pero solo lo necesario para mostrar tu rol y tu pensamiento. Debe seguir siendo legible para revisores no especialistas.'
      },
      {
        question: '¿Puedo escribir sobre un proyecto de clase?',
        answer:
          'Sí, si explicas el problema, tu contribución y qué demuestra sobre tu dirección.'
      }
    ],
    disclaimer: ES_DISCLAIMER
  },
  '/essays/no-essay-scholarships': {
    bucket: 'essays',
    kind: 'essay',
    title: 'Becas sin ensayo: qué son y cómo usarlas',
    metaDescription:
      'Entiende las becas sin ensayo, en qué se diferencian y qué verificar antes de aplicar.',
    h1: 'Becas sin ensayo',
    eyebrow: ES_EYEBROW,
    intro:
      'Las becas sin ensayo ahorran tiempo, pero no siempre son más fáciles de ganar. Muchas son amplias y con mucho volumen; verifica la fuente y equilíbralas con premios de mejor encaje.',
    oneSentence:
      'Las becas sin ensayo reducen la escritura, pero aún debes revisar elegibilidad, fuente, fecha y reglas de selección.',
    sections: [
      {
        title: 'Qué suele significar sin ensayo',
        body:
          'Significa que el proveedor no pide un ensayo tradicional. La solicitud puede incluir formularios, respuestas de elegibilidad, prueba de matrícula o creación de cuenta.',
        bullets: [
          'Comprueba si existe una pregunta corta.',
          'Confirma elegibilidad antes de compartir datos personales.',
          'Lee cómo se elige al ganador.'
        ]
      },
      {
        title: 'Cómo usarlas con criterio',
        body:
          'Úsalas como parte de un plan equilibrado, no como plan completo.',
        bullets: [
          'Guarda opciones de bajo esfuerzo con fuente oficial clara.',
          'Prioriza premios de mejor encaje cuando el tiempo es limitado.',
          'Desconfía de cuotas o datos de contacto poco claros.'
        ]
      }
    ],
    checklist: [
      'Confirma que realmente no se pide ensayo.',
      'Revisa reglas de elegibilidad.',
      'Confirma fecha y método de selección.',
      'Evita cuotas salvo que el proveedor sea claramente legítimo.',
      'Equilibra becas sin ensayo con becas por encaje.'
    ],
    doDont: [
      { do: 'Úsalas como complementos rápidos.', dont: 'Dependas solo de sorteos amplios.' },
      { do: 'Confirma la fuente oficial.', dont: 'Envíes datos sensibles a sitios poco claros.' }
    ],
    examples: [
      'Una beca sin ensayo con proveedor, fecha y reglas claras puede valer la pena como solicitud rápida.',
      'Un listado sin fuente oficial o reglas de selección debe tratarse como pista a verificar, no como aplicación automática.'
    ],
    links: [
      ...essayCommonLinksEs,
      { href: '/scholarships/no-essay', label: 'Becas sin ensayo' },
      { href: '/compare/no-essay-vs-essay-scholarships', label: 'Sin ensayo vs con ensayo' },
      { href: '/scholarship-scam-warning', label: 'Señales de fraude' }
    ],
    faq: [
      {
        question: '¿Son legítimas las becas sin ensayo?',
        answer:
          'Algunas sí y otras requieren más cautela. Revisa fuente oficial, elegibilidad, fecha, método de selección y privacidad antes de aplicar.'
      },
      {
        question: '¿Son más fáciles de ganar?',
        answer:
          'Pueden ser más fáciles de enviar, pero la elegibilidad amplia suele implicar más competencia. Una beca con ensayo y mejor encaje puede ser mejor opción.'
      }
    ],
    disclaimer: ES_DISCLAIMER
  }
};

export const extendedEssayFrPages: Partial<Record<string, PageDraft>> = {
  '/essays/outline': {
    bucket: 'essays',
    kind: 'essay',
    title: 'Plan de rédaction pour bourses : une structure simple qui fonctionne',
    metaDescription:
      'Planifiez une rédaction de bourse avec accroche, preuves, réflexion et prochaine étape avant de rédiger.',
    h1: 'Plan de rédaction pour bourses',
    eyebrow: FR_EYEBROW,
    intro:
      'Un plan évite que votre réponse devienne une liste de réussites. L’objectif est de soutenir un argument clair sur votre adéquation avec la bourse.',
    oneSentence:
      'Un bon plan assigne à chaque paragraphe une fonction : répondre au prompt, le prouver et le relier au prix.',
    sections: [
      {
        title: 'Plan en cinq parties',
        body:
          'La plupart des rédactions se planifient en cinq parties : accroche, contexte, preuves, réflexion et usage futur du prix.',
        bullets: [
          'Accroche : un moment, une décision ou un problème concret.',
          'Contexte : pourquoi ce moment compte.',
          'Preuves : ce que vous avez fait, appris, construit ou changé.',
          'Réflexion : ce que les preuves montrent sur vous.',
          'Prochaine étape : comment la bourse soutient un plan réel.'
        ]
      },
      {
        title: 'Gardez le prompt visible',
        body:
          'Avant de rédiger, réécrivez le prompt en checklist. Chaque paragraphe doit en couvrir une partie.',
        bullets: [
          'Repérez les thèmes obligatoires : besoin, leadership, service ou objectifs.',
          'Notez la limite de mots ou le format.',
          'Réservez le dernier paragraphe à une prochaine étape concrète.'
        ]
      }
    ],
    checklist: [
      'Écrivez le prompt en langage simple.',
      'Choisissez une affirmation centrale.',
      'Sélectionnez les preuves les plus fortes.',
      'Prévoyez une phrase de réflexion par paragraphe.',
      'Concluez sur l’impact du prix sur votre prochaine étape.'
    ],
    doDont: [
      { do: 'Planifiez avant de rédiger.', dont: 'Commencez par une histoire de vie générique.' },
      { do: 'Utilisez une histoire principale avec preuves claires.', dont: 'Listiez tout votre CV.' }
    ],
    examples: [
      'Prompt : objectifs de carrière. Plan : bénévolat clinique, intérêt santé, cours, prochaine formation, impact de la bourse.',
      'Prompt : leadership. Plan : problème en club, action, résultat, leçon, lien avec vos études.'
    ],
    links: [
      ...essayCommonLinksFr,
      { href: '/essays/career-goals', label: 'Rédaction objectifs de carrière' },
      { href: '/essays/leadership', label: 'Rédaction leadership' }
    ],
    faq: [
      {
        question: 'Combien de paragraphes pour une bourse ?',
        answer:
          'Quatre ou cinq fonctionnent souvent, mais le prompt et la limite de mots comptent plus qu’un nombre fixe.'
      },
      {
        question: 'Faut-il planifier les textes courts ?',
        answer:
          'Oui. Un plan bref évite les répétitions et concentre les mots sur les preuves les plus fortes.'
      }
    ],
    disclaimer: FR_DISCLAIMER
  },
  '/essays/leadership': {
    bucket: 'essays',
    kind: 'essay',
    title: 'Comment rédiger une bourse sur le leadership',
    metaDescription:
      'Rédigez un texte de leadership avec un problème réel, une action, un résultat et une leçon plutôt que des affirmations vagues.',
    h1: 'Guide de rédaction leadership pour bourses',
    eyebrow: FR_EYEBROW,
    intro:
      'Les textes sur le leadership sont plus forts quand ils décrivent un problème concret et ce que vous avez fait quand d’autres comptaient sur votre jugement.',
    oneSentence:
      'Un texte leadership doit montrer action, responsabilité, résultat et réflexion.',
    sections: [
      {
        title: 'Choisissez un vrai moment de leadership',
        body:
          'Le leadership ne signifie pas toujours président de club. Il peut être organiser, médier, tutoriser, assumer des responsabilités familiales ou lancer un projet.',
        bullets: [
          'Commencez par un problème, pas un titre.',
          'Expliquez ce que vous avez fait personnellement.',
          'Nommez le résultat ou la leçon.'
        ]
      },
      {
        title: 'Montrez votre progression',
        body:
          'Les comités veulent souvent voir comment vous réfléchissez sous pression. Incluez ce que vous avez appris et comment cela a changé votre action suivante.',
        bullets: [
          'Évitez de prétendre avoir tout résolu seul.',
          'Reconnaissez l’équipe ou la communauté si pertinent.',
          'Reliez la leçon à votre parcours éducatif.'
        ]
      }
    ],
    checklist: [
      'Identifiez le problème.',
      'Expliquez votre rôle.',
      'Décrivez l’action prise.',
      'Montrez un résultat ou un changement.',
      'Réfléchissez à la leçon.',
      'Reliez le leadership au prompt de la bourse.'
    ],
    doDont: [
      { do: 'Écrivez sur la responsabilité.', dont: 'Vous appuyez uniquement sur des titres.' },
      { do: 'Montrez la collaboration.', dont: 'Faites de vous le seul héros.' }
    ],
    examples: [
      'Quand notre équipe de robotique a perdu son local, j’ai coordonné un planning avec la bibliothèque pour finir le projet.',
      'Tutoriser mon cousin chaque soir m’a appris à découper les tâches, ce qui guide maintenant mes groupes d’étude.'
    ],
    links: [
      ...essayCommonLinksFr,
      { href: '/essays/examples', label: 'Exemples de rédaction' },
      FR_ESSAY_LINKS.scholarships
    ],
    faq: [
      {
        question: 'La responsabilité familiale compte-t-elle comme leadership ?',
        answer:
          'Oui, si le prompt l’autorise. Expliquez la responsabilité, les choix et les compétences sans exagérer la situation.'
      },
      {
        question: 'Faut-il un titre officiel ?',
        answer:
          'Non. Un exemple clair d’initiative peut être plus fort qu’un titre sans preuve.'
      }
    ],
    disclaimer: FR_DISCLAIMER
  },
  '/essays/why-do-you-deserve-this-scholarship': {
    bucket: 'essays',
    kind: 'essay',
    title: 'Comment répondre : pourquoi méritez-vous cette bourse ?',
    metaDescription:
      'Répondez au prompt courant sans paraître arrogant. Reliez adéquation, preuves, besoin et prochaines étapes.',
    h1: 'Pourquoi méritez-vous cette bourse ?',
    eyebrow: FR_EYEBROW,
    intro:
      'Ce prompt ne demande pas de vous déclarer meilleur que tous les autres. Il demande d’expliquer pourquoi votre profil correspond au but du prix.',
    oneSentence:
      'Répondez en prouvant l’adéquation avec des faits, pas en revendiquant un droit.',
    sections: [
      {
        title: 'Traduisez mériter en adéquation',
        body:
          'Utilisez les critères du fournisseur comme cadre. Si la bourse valorise le service, parlez de service. Si elle valorise le domaine, parlez de votre préparation.',
        bullets: [
          'Nommez l’adéquation entre votre profil et le prix.',
          'Appuyez-la sur un ou deux faits.',
          'Expliquez comment le prix aide la prochaine étape.'
        ]
      },
      {
        title: 'Restez confiant et ancré',
        body:
          'Le ton doit être clair et reconnaissant, ni apologétique ni arrogant.',
        bullets: [
          'Évitez de dire que vous méritez plus que les autres.',
          'Évitez une gratitude générique sans preuve.',
          'Concluez sur un point pratique.'
        ]
      }
    ],
    checklist: [
      'Identifiez le but de la bourse.',
      'Énoncez votre adéquation.',
      'Apportez des preuves.',
      'Mentionnez le besoin seulement si pertinent.',
      'Reliez le prix à une prochaine étape concrète.'
    ],
    doDont: [
      { do: 'Utilisez des preuves d’adéquation.', dont: 'Comparez-vous à des candidats inconnus.' },
      { do: 'Gardez un ton respectueux.', dont: 'Paraissez garanti ou entitled.' }
    ],
    examples: [
      'Je correspond à cette bourse car mon tutorat bénévole et ma filière éducation correspondent à son focus sur les futurs enseignants.',
      'Le prix couvrirait les fournitures de laboratoire du semestre où je commence la recherche supervisée.'
    ],
    links: [
      ...essayCommonLinksFr,
      { href: '/essays/checklist', label: 'Avant de soumettre' },
      { href: '/how-we-rank-scholarships', label: 'Comment fonctionnent les recommandations' }
    ],
    faq: [
      {
        question: 'Dois-je dire que je mérite la bourse ?',
        answer:
          'Vous pouvez reprendre le langage du prompt, mais il faut le soutenir par adéquation, preuves et prochaine étape réaliste.'
      },
      {
        question: 'Dois-je mentionner d’autres candidats ?',
        answer:
          'En général non. Concentrez-vous sur votre adéquation plutôt que sur des suppositions sur les autres.'
      }
    ],
    disclaimer: FR_DISCLAIMER
  },
  '/essays/personal-statement': {
    bucket: 'essays',
    kind: 'essay',
    title: 'Guide de déclaration personnelle pour bourses',
    metaDescription:
      'Rédigez une déclaration personnelle qui relie parcours, motivation, preuves et direction future.',
    h1: 'Déclaration personnelle pour bourses',
    eyebrow: FR_EYEBROW,
    intro:
      'Une déclaration personnelle donne au comité une image cohérente de qui vous êtes, de ce qui a orienté votre parcours et de pourquoi le prix correspond à votre prochaine étape.',
    oneSentence:
      'Une déclaration personnelle doit rendre parcours, motivation et plan cohérents.',
    sections: [
      {
        title: 'Trouvez le fil conducteur',
        body:
          'Les meilleures déclarations ne sont pas des autobiographies complètes. Elles choisissent les détails qui expliquent votre direction actuelle.',
        bullets: [
          'Choisissez deux ou trois moments liés.',
          'Expliquez des choix, pas seulement des événements.',
          'Concluez sur la voie éducative que vous suivez.'
        ]
      },
      {
        title: 'Évitez de répéter le CV',
        body:
          'Vous pouvez mentionner des réussites, mais il faut révéler sens et motivation que le CV ne montre pas.',
        bullets: [
          'Réfléchissez après chaque exemple.',
          'Montrez comment votre pensée a évolué.',
          'Gardez un ton précis et direct.'
        ]
      }
    ],
    checklist: [
      'Choisissez un thème central.',
      'Utilisez des exemples précis.',
      'Expliquez pourquoi les exemples comptent.',
      'Reliez à une direction académique ou professionnelle.',
      'Coupez les détails hors sujet.'
    ],
    doDont: [
      { do: 'Rendez la déclaration cohérente.', dont: 'Tentiez d’inclure toute votre vie.' },
      { do: 'Réfléchissez sur les exemples.', dont: 'Répétiez le CV ligne par ligne.' }
    ],
    examples: [
      'Un étudiant de première génération peut relier la traduction familiale à l’intérêt pour la politique publique ou l’accès aux soins.',
      'Un étudiant en transfert peut expliquer comment le collège communautaire a clarifié le domaine visé.'
    ],
    links: [
      ...essayCommonLinksFr,
      { href: '/essays/financial-need', label: 'Rédaction besoin financier' },
      { href: '/essays/career-goals', label: 'Rédaction objectifs de carrière' }
    ],
    faq: [
      {
        question: 'Est-ce la même chose qu’une rédaction de bourse ?',
        answer:
          'Parfois. La déclaration personnelle est large ; beaucoup de bourses posent un prompt plus étroit.'
      },
      {
        question: 'Quel niveau d’intimité ?',
        answer:
          'Assez pour expliquer votre parcours, sans détails si privés qu’ils détournent du prompt.'
      }
    ],
    disclaimer: FR_DISCLAIMER
  },
  '/essays/stem': {
    bucket: 'essays',
    kind: 'essay',
    title: 'Comment rédiger une bourse STEM',
    metaDescription:
      'Planifiez une rédaction STEM autour de projets, cours, recherche, service et direction technique claire.',
    h1: 'Guide de rédaction STEM pour bourses',
    eyebrow: FR_EYEBROW,
    intro:
      'Une rédaction STEM doit montrer comment vous pensez, construisez, testez, recherchez ou résolvez des problèmes. Évitez de dire seulement que vous aimez la science ou la technologie.',
    oneSentence:
      'Une bonne rédaction STEM utilise des preuves techniques et explique pourquoi le travail compte.',
    sections: [
      {
        title: 'Utilisez des preuves techniques',
        body:
          'Projets, labos, code, stages, robotique, tutorat, recherche et cours peuvent servir de preuves si vous expliquez clairement votre rôle.',
        bullets: [
          'Décrivez le problème traité.',
          'Nommez votre contribution.',
          'Expliquez ce que vous avez appris ou ce qui a changé.'
        ]
      },
      {
        title: 'Reliez STEM à l’impact',
        body:
          'Le texte doit relier l’intérêt technique à une personne, une communauté, une industrie, une question de recherche ou une direction professionnelle.',
        bullets: [
          'Évitez le jargon inutile.',
          'Définissez les termes techniques si besoin.',
          'Montrez curiosité et persistance.'
        ]
      }
    ],
    checklist: [
      'Nommez votre domaine ou direction STEM.',
      'Utilisez un projet ou moment d’apprentissage concret.',
      'Expliquez votre rôle.',
      'Reliez les compétences aux études futures.',
      'Vérifiez si le fournisseur exige filière, GPA ou plan de recherche.'
    ],
    doDont: [
      { do: 'Montrez comment vous résolvez des problèmes.', dont: 'Listiez des mots-clés STEM vides.' },
      { do: 'Expliquez votre contribution.', dont: 'Faites croire qu’un autre a fait le travail.' }
    ],
    examples: [
      'Au lieu de « j’aime l’ingénierie », expliquez comment tester un modèle de pont vous a appris à réviser après un échec.',
      'Au lieu de « l’IA est l’avenir », décrivez un jeu de données, un outil ou une question éthique que vous avez réellement explorés.'
    ],
    links: [
      ...essayCommonLinksFr,
      { href: '/scholarships/stem', label: 'Bourses STEM' },
      { href: '/scholarships/engineering', label: 'Bourses ingénierie' }
    ],
    faq: [
      {
        question: 'Faut-il des détails techniques ?',
        answer:
          'Oui, mais seulement ce qu’il faut pour montrer votre rôle et votre réflexion. Le texte doit rester lisible pour des non-spécialistes.'
      },
      {
        question: 'Puis-je parler d’un projet de cours ?',
        answer:
          'Oui, si vous expliquez le problème, votre contribution et ce que cela montre sur votre direction.'
      }
    ],
    disclaimer: FR_DISCLAIMER
  },
  '/essays/no-essay-scholarships': {
    bucket: 'essays',
    kind: 'essay',
    title: 'Bourses sans rédaction : ce qu’elles sont et comment les utiliser',
    metaDescription:
      'Comprenez les bourses sans rédaction, leurs différences et ce qu’il faut vérifier avant de postuler.',
    h1: 'Bourses sans rédaction',
    eyebrow: FR_EYEBROW,
    intro:
      'Les bourses sans rédaction font gagner du temps, mais ne sont pas automatiquement plus faciles à obtenir. Beaucoup sont larges et très demandées ; vérifiez la source et équilibrez-les avec des prix mieux adaptés.',
    oneSentence:
      'Les bourses sans rédaction réduisent l’écriture, mais il faut toujours vérifier admissibilité, source, date et règles de sélection.',
    sections: [
      {
        title: 'Ce que signifie généralement sans rédaction',
        body:
          'Le fournisseur ne demande pas de texte traditionnel. La candidature peut inclure formulaires, réponses d’admissibilité, preuve d’inscription ou création de compte.',
        bullets: [
          'Vérifiez s’il existe une courte réponse.',
          'Confirmez l’admissibilité avant de partager des données personnelles.',
          'Lisez comment le gagnant est choisi.'
        ]
      },
      {
        title: 'Comment les utiliser intelligemment',
        body:
          'Utilisez-les dans un plan équilibré, pas comme plan unique.',
        bullets: [
          'Gardez les options à faible effort avec source officielle claire.',
          'Priorisez les prix mieux adaptés quand le temps est limité.',
          'Méfiez-vous des frais ou coordonnées floues.'
        ]
      }
    ],
    checklist: [
      'Confirmez qu’aucune rédaction n’est requise.',
      'Vérifiez les règles d’admissibilité.',
      'Confirmez date et méthode de sélection.',
      'Évitez les frais sauf fournisseur clairement légitime.',
      'Équilibrez sans-rédaction et bourses ciblées.'
    ],
    doDont: [
      { do: 'Utilisez-les comme compléments rapides.', dont: 'Ne comptez que sur de larges tirages.' },
      { do: 'Confirmez la source officielle.', dont: 'Envoyez des données sensibles à des sites flous.' }
    ],
    examples: [
      'Une bourse sans rédaction avec fournisseur, date et règles clairs peut valoir une candidature rapide.',
      'Une fiche sans source officielle doit être traitée comme piste à vérifier, pas candidature automatique.'
    ],
    links: [
      ...essayCommonLinksFr,
      { href: '/scholarships/no-essay', label: 'Bourses sans rédaction' },
      { href: '/compare/no-essay-vs-essay-scholarships', label: 'Sans rédaction vs avec rédaction' },
      { href: '/scholarship-scam-warning', label: 'Signaux d’arnaque' }
    ],
    faq: [
      {
        question: 'Les bourses sans rédaction sont-elles légitimes ?',
        answer:
          'Certaines oui, d’autres demandent plus de prudence. Vérifiez source officielle, admissibilité, date, sélection et confidentialité avant de postuler.'
      },
      {
        question: 'Sont-elles plus faciles à gagner ?',
        answer:
          'Elles peuvent être plus faciles à soumettre, mais une admissibilité large implique souvent plus de concurrence. Une bourse ciblée avec rédaction peut mieux convenir.'
      }
    ],
    disclaimer: FR_DISCLAIMER
  }
};
