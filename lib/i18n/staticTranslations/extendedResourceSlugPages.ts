import type { PageDraft } from '@/lib/i18n/staticTranslations/types';
import {
  ES_DISCLAIMER,
  ES_RESOURCE_LINKS,
  FR_DISCLAIMER,
  FR_RESOURCE_LINKS
} from '@/lib/i18n/staticTranslations/common';

const ES_EYEBROW = 'Guía de recursos';
const FR_EYEBROW = 'Guide ressources';

function resourcePageEs(
  path: string,
  draft: Omit<PageDraft, 'bucket' | 'kind' | 'eyebrow' | 'disclaimer'>
): [string, PageDraft] {
  return [
    path,
    {
      bucket: 'resources',
      kind: 'resource',
      eyebrow: ES_EYEBROW,
      disclaimer: ES_DISCLAIMER,
      ...draft
    }
  ];
}

function resourcePageFr(
  path: string,
  draft: Omit<PageDraft, 'bucket' | 'kind' | 'eyebrow' | 'disclaimer'>
): [string, PageDraft] {
  return [
    path,
    {
      bucket: 'resources',
      kind: 'resource',
      eyebrow: FR_EYEBROW,
      disclaimer: FR_DISCLAIMER,
      ...draft
    }
  ];
}

export const extendedResourceSlugEsPages: Partial<Record<string, PageDraft>> =
  Object.fromEntries([
    resourcePageEs('/resources/how-to-find-scholarships', {
      title: 'Cómo encontrar becas que valgan tu tiempo',
      metaDescription:
        'Guía práctica para buscar becas realistas, revisar elegibilidad y armar una lista útil.',
      h1: 'Cómo encontrar becas',
      intro:
        'Una buena búsqueda no consiste en postular a todo. Empieza amplio, revisa elegibilidad pronto, compara esfuerzo con valor y guarda solo oportunidades con reglas oficiales claras.',
      sections: [
        {
          title: 'Empieza por el encaje, no por el volumen',
          body:
            'La forma más rápida de perder tiempo es postular solo por el título. Usa filtros de nivel, campo, país, ciudadanía, GPA e institución antes de leer el ensayo.',
          bullets: [
            'Haz una búsqueda amplia y luego estrecha por elegibilidad.',
            'Prioriza listados con fuente oficial y fecha clara.',
            'Guarda por separado pistas prometedoras pero incompletas.'
          ]
        },
        {
          title: 'Compara el esfuerzo antes de comprometerte',
          body:
            'Un premio grande con varios ensayos puede valer la pena, pero solo si tienes tiempo y encajas en las reglas principales.',
          bullets: [
            'Estima los documentos requeridos.',
            'Revisa si cartas o transcripciones necesitan tiempo extra.',
            'Empareja solicitudes de alto esfuerzo con tu evidencia más fuerte.'
          ]
        }
      ],
      checklist: [
        'Fuente oficial confirmada',
        'Elegibilidad confirmada',
        'Fecha y zona horaria confirmadas',
        'Documentos requeridos confirmados',
        'Opciones realistas guardadas',
        'Aplicar en el proveedor oficial'
      ],
      examples: [
        'Un estudiante STEM debe revisar campo, nivel, ciudadanía y ensayo antes de empezar.',
        'Un estudiante internacional debe confirmar si el proveedor acepta no ciudadanos.'
      ],
      links: [
        ES_RESOURCE_LINKS.scholarships,
        ES_RESOURCE_LINKS.howItWorks,
        ES_RESOURCE_LINKS.methodology
      ],
      faq: [
        {
          question: '¿A cuántas becas debo postular?',
          answer:
            'No hay un número universal. Una lista corta con reglas claras suele ser más fuerte que muchas postulaciones de bajo encaje.'
        },
        {
          question: '¿Debo postular si faltan datos?',
          answer:
            'Úsalo como pista, pero confirma fecha, elegibilidad, monto y ruta oficial antes de invertir tiempo.'
        }
      ]
    }),
    resourcePageEs('/resources/how-to-apply-for-scholarships-checklist', {
      title: 'Checklist de solicitud de becas',
      metaDescription:
        'Checklist paso a paso para preparar solicitudes sin perder documentos, fechas ni reglas.',
      h1: 'Checklist de solicitud de becas',
      intro:
        'Las solicitudes son más fáciles cuando separas elegibilidad, documentos, ensayo, revisión de fuente oficial y envío final.',
      sections: [
        {
          title: 'Antes de escribir',
          body:
            'No empieces el ensayo hasta saber que la beca está abierta, que tu perfil encaja y que entiendes los materiales requeridos.',
          bullets: [
            'Lee elegibilidad antes del formulario.',
            'Revisa zona horaria y método de envío.',
            'Lista cada documento y quién lo controla.'
          ]
        },
        {
          title: 'Antes de enviar',
          body:
            'La revisión final debe detectar campos vacíos, transcripciones viejas, nombres de archivo débiles y rutas no oficiales.',
          bullets: [
            'Usa la página oficial del proveedor para reglas finales.',
            'Revisa el ensayo contra el prompt.',
            'Guarda confirmaciones o correos.'
          ]
        }
      ],
      checklist: [
        'Elegibilidad confirmada',
        'Fecha confirmada',
        'Prompt copiado al plan',
        'Transcripción o matrícula solicitada',
        'Carta de recomendación en calendario',
        'Enlace oficial verificado',
        'Confirmación de envío guardada'
      ],
      examples: [
        'Si se pide recomendación, pide con tiempo e incluye el prompt oficial.',
        'Si la beca es renovable, revisa si debes volver a postular cada año.'
      ],
      links: [
        ES_RESOURCE_LINKS.scholarships,
        { href: '/resources/scholarship-documents-checklist', label: 'Checklist de documentos' },
        ES_RESOURCE_LINKS.disclaimer
      ],
      faq: [
        {
          question: '¿Qué hago primero?',
          answer: 'Confirma elegibilidad y fecha antes de escribir. Esas dos revisiones evitan la mayoría del tiempo perdido.'
        },
        {
          question: '¿ScholarshipTop envía mi solicitud?',
          answer:
            'No. ScholarshipTop ayuda a buscar y planificar. Las solicitudes deben enviarse por la ruta oficial del proveedor.'
        }
      ]
    }),
    resourcePageEs('/resources/no-essay-scholarships-guide', {
      title: 'Guía de becas sin ensayo',
      metaDescription:
        'Cómo evaluar becas sin ensayo, evitar pistas débiles y revisar elegibilidad antes de aplicar.',
      h1: 'Guía de becas sin ensayo',
      intro:
        'Las becas sin ensayo pueden ser útiles, pero las solicitudes fáciles suelen atraer mucha competencia. Trátalas como parte del plan, no como estrategia única.',
      sections: [
        {
          title: 'Por qué son diferentes',
          body:
            'Menor esfuerzo suele significar más postulantes. La tarea principal es confirmar que el listado es legítimo y que encajas en las reglas básicas.',
          bullets: [
            'Revisa el estado de la fuente antes de compartir datos.',
            'Confirma si es sorteo o mérito.',
            'No pagues para desbloquear una beca.'
          ]
        },
        {
          title: 'Cómo usarlas bien',
          body:
            'Úsalas como complementos rápidos después de completar solicitudes de mejor encaje.',
          bullets: [
            'Aplica solo cuando la fuente sea clara.',
            'Guarda fechas para no distraerte de postulaciones mayores.',
            'Equilibra entradas fáciles con becas dirigidas.'
          ]
        }
      ],
      checklist: [
        'Fuente oficial visible',
        'Sin cuota obligatoria',
        'Reglas de elegibilidad claras',
        'Fecha clara',
        'Expectativas de privacidad aceptables'
      ],
      examples: [
        'Una beca sin ensayo con proveedor poco claro debe verificarse, no aplicarse automáticamente.',
        'Una solicitud rápida de un proveedor conocido puede valer la pena si la fecha está cerca.'
      ],
      links: [
        { href: '/scholarships/no-essay', label: 'Explorar becas sin ensayo' },
        ES_RESOURCE_LINKS.scam,
        ES_RESOURCE_LINKS.methodology
      ],
      faq: [
        {
          question: '¿Son reales las becas sin ensayo?',
          answer:
            'Algunas sí. Verifica proveedor, ruta, privacidad, fecha y reglas del premio antes de aplicar.'
        },
        {
          question: '¿Son más fáciles de ganar?',
          answer:
            'Pueden ser más fáciles de enviar, pero la elegibilidad amplia suele implicar más competencia.'
        }
      ]
    }),
    resourcePageEs('/resources/easy-scholarships-guide', {
      title: 'Guía de becas fáciles',
      metaDescription:
        'Cómo decidir si las becas fáciles valen la pena y qué verificar antes de enviar.',
      h1: 'Guía de becas fáciles',
      intro:
        'Las becas fáciles sirven cuando ahorran tiempo sin ocultar riesgo. La clave es separar solicitudes legítimas de bajo esfuerzo de listados vagos.',
      sections: [
        {
          title: 'Qué debería significar fácil',
          body:
            'Fácil debería significar menos materiales, reglas claras y ruta directa. No debería significar fuente poco clara, premio garantizado o pago sospechoso.',
          bullets: [
            'Busca pocos materiales requeridos.',
            'Confirma la fuente oficial.',
            'Revisa privacidad y uso de datos.'
          ]
        },
        {
          title: 'Cuándo omitir',
          body:
            'Omite un listado cuando la elegibilidad es confusa, el proveedor es desconocido, falta la fecha o presionan a pagar o compartir datos sensibles.',
          bullets: ['Sin fuente oficial', 'Sin monto claro', 'Sin reglas de solicitud claras']
        }
      ],
      checklist: [
        'Nivel de esfuerzo revisado',
        'Documentos revisados',
        'Fecha revisada',
        'Fuente revisada',
        'Reglas del premio revisadas'
      ],
      examples: [
        'Un formulario corto de un proveedor oficial puede ser una buena solicitud fácil.',
        'Un premio garantizado de un sitio desconocido debe tratarse como inseguro.'
      ],
      links: [
        { href: '/scholarships/hub/easy-apply', label: 'Becas de solicitud fácil' },
        ES_RESOURCE_LINKS.ranking,
        ES_RESOURCE_LINKS.scam
      ],
      faq: [
        {
          question: '¿Qué hace fácil a una beca?',
          answer:
            'Pocos materiales, elegibilidad clara, formulario simple y ruta oficial de solicitud.'
        },
        {
          question: '¿Deben ser mi estrategia principal?',
          answer:
            'Por lo general no. Pueden complementar el plan, pero las becas dirigidas con fuerte encaje suelen merecer más atención.'
        }
      ]
    }),
    resourcePageEs('/resources/stem-scholarships-guide', {
      title: 'Guía de becas STEM',
      metaDescription:
        'Cómo estudiantes STEM evalúan elegibilidad, documentos, ensayos y requisitos de investigación o carrera.',
      h1: 'Guía de becas STEM',
      intro:
        'Las becas STEM suelen depender de campo, nivel, institución, interés en investigación, GPA, ciudadanía o metas profesionales. Lee elegibilidad con cuidado antes de redactar.',
      sections: [
        {
          title: 'Señales comunes de elegibilidad STEM',
          body:
            'Los proveedores pueden limitar por carrera, rama de ingeniería, informática, salud, ciencia de datos, investigación o grupos subrepresentados.',
          bullets: [
            'Revisa la redacción exacta del campo o carrera.',
            'Confirma nivel: secundaria, pregrado, posgrado o doctorado.',
            'Busca requisitos de GPA, investigación, prácticas o proyectos.'
          ]
        },
        {
          title: 'Cómo fortalecer una solicitud STEM',
          body:
            'Usa evidencia concreta: proyectos, investigación, prácticas, cursos, liderazgo o impacto comunitario alineado con la misión del proveedor.',
          bullets: [
            'Conecta tu historia con el enfoque del proveedor.',
            'Pide transcripciones con tiempo.',
            'Pide a recomendadores ejemplos específicos STEM.'
          ]
        }
      ],
      checklist: [
        'Carrera o campo coincide',
        'Nivel coincide',
        'Reglas de GPA revisadas',
        'Transcripción lista',
        'Recomendación en proceso',
        'Evidencia de proyecto o investigación lista'
      ],
      examples: [
        'Una beca de ingeniería puede no incluir todas las carreras STEM.',
        'Un premio de investigación puede valorar más la profundidad del proyecto que un ensayo genérico de liderazgo.'
      ],
      links: [
        { href: '/scholarships/category/stem', label: 'Becas STEM' },
        { href: '/scholarships/category/medical', label: 'Becas médicas' },
        { href: '/scholarships/engineering', label: 'Becas de ingeniería' }
      ],
      faq: [
        {
          question: '¿Siempre exigen GPA alto?',
          answer:
            'No. Algunas sí, pero otras enfatizan interés de campo, proyectos, identidad, necesidad o impacto comunitario.'
        },
        {
          question: '¿Puedo reutilizar el mismo ensayo STEM?',
          answer:
            'Reutiliza evidencia, no el texto completo. Cada proveedor puede valorar un campo, misión o perfil distinto.'
        }
      ]
    }),
    resourcePageEs('/resources/scholarships-in-usa-for-international-students', {
      title: 'Becas en EE. UU. para estudiantes internacionales',
      metaDescription:
        'Cómo buscar becas en EE. UU., revisar elegibilidad y verificar reglas del proveedor.',
      h1: 'Becas en EE. UU. para estudiantes internacionales',
      intro:
        'Las becas en EE. UU. para internacionales requieren revisar elegibilidad con cuidado. Algunas abren a no ciudadanos; otras exigen residencia, ciudadanía, FAFSA o matrícula en una institución específica.',
      sections: [
        {
          title: 'Revisiones de elegibilidad que importan',
          body:
            'Confirma ciudadanía, estatus de visa, institución, nivel, campo y si se exige FAFSA o residencia doméstica.',
          bullets: [
            'Revisa redacción para no ciudadanos.',
            'Confirma si estudiantes con visa F-1 pueden postular.',
            'Lee restricciones por escuela con atención.'
          ]
        },
        {
          title: 'Documentos a preparar',
          body:
            'Materiales comunes: transcripciones, prueba de matrícula, ensayos, documentación de necesidad, cartas y a veces detalles de visa.',
          bullets: [
            'No subas documentos sensibles a fuentes poco claras.',
            'Confirma el dominio oficial de solicitud.',
            'Revisa si aceptan documentos traducidos.'
          ]
        }
      ],
      checklist: [
        'Elegibilidad para no ciudadanos confirmada',
        'Reglas de matrícula escolar confirmadas',
        'Lenguaje de visa o residencia revisado',
        'Requisito FAFSA revisado',
        'Fuente oficial verificada'
      ],
      examples: [
        'Una beca puede decir internacional pero exigir matrícula en una universidad de EE. UU.',
        'Algunos premios privados abren a internacionales aunque la ayuda gubernamental no.'
      ],
      links: [
        { href: '/scholarships/hub/international-friendly', label: 'Becas amigables para internacionales' },
        { href: '/scholarships/study-in/united-states', label: 'Becas en Estados Unidos' },
        ES_RESOURCE_LINKS.disclaimer
      ],
      faq: [
        {
          question: '¿Pueden los internacionales obtener becas en EE. UU.?',
          answer:
            'Sí, pero la elegibilidad varía. Confirma ciudadanía, visa, matrícula y requisitos en la página oficial.'
        },
        {
          question: '¿Necesitan FAFSA?',
          answer:
            'Algunas becas en EE. UU. lo exigen, pero muchos premios privados o institucionales usan otros requisitos.'
        }
      ]
    }),
    resourcePageEs('/resources/scholarships-for-high-school-seniors', {
      title: 'Becas para estudiantes de último año de secundaria',
      metaDescription:
        'Cómo encontrar becas, priorizar fechas y preparar materiales comunes en el último año.',
      h1: 'Becas para último año de secundaria',
      intro:
        'Los estudiantes de último año deben armar un calendario temprano porque fechas, cartas, transcripciones, ensayos y prueba de matrícula pueden coincidir con solicitudes universitarias.',
      sections: [
        {
          title: 'Prioriza por fecha y encaje',
          body:
            'Empieza con becas donde el estatus de senior, año de graduación, universidad prevista, GPA, campo o ubicación coincidan claramente.',
          bullets: [
            'Separa premios locales, escolares, nacionales y universitarios.',
            'Observa grupos de fechas en otoño, invierno y primavera.',
            'Pide a consejeros tiempos para transcripciones y cartas.'
          ]
        },
        {
          title: 'Materiales comunes',
          body:
            'Suelen pedir ensayos, transcripciones, actividades, cartas, prueba de matrícula o evidencia de necesidad financiera.',
          bullets: [
            'Ten lista de actividades lista.',
            'Guarda evidencia reutilizable para ensayos.',
            'Registra confirmaciones de envío.'
          ]
        }
      ],
      checklist: [
        'Año de graduación coincide',
        'Reglas de matrícula universitaria revisadas',
        'Transcripción solicitada',
        'Recomendación solicitada',
        'Prompt de ensayo guardado',
        'Calendario de fechas actualizado'
      ],
      examples: [
        'Los premios locales pueden ser menos visibles pero con mejor encaje.',
        'Las becas universitarias pueden exigir admisión o matrícula.'
      ],
      links: [
        { href: '/scholarships/high-school', label: 'Becas de secundaria' },
        { href: '/resources/how-to-apply-for-scholarships-checklist', label: 'Checklist de solicitud' },
        { href: '/resources/scholarship-documents-checklist', label: 'Checklist de documentos' }
      ],
      faq: [
        {
          question: '¿Cuándo deben empezar a postular?',
          answer:
            'Lo antes posible en el último año, y seguir revisando fechas hasta la primavera porque los ciclos varían.'
        },
        {
          question: '¿Necesitan prueba de matrícula universitaria?',
          answer:
            'Algunas becas la exigen; otras aceptan matrícula prevista. Revisa las reglas oficiales.'
        }
      ]
    }),
    resourcePageEs('/resources/scholarship-eligibility-explained', {
      title: 'Elegibilidad para becas explicada',
      metaDescription:
        'Guía en lenguaje claro sobre reglas de elegibilidad: nivel, campo, ciudadanía, residencia, GPA y documentos.',
      h1: 'Elegibilidad para becas explicada',
      intro:
        'La elegibilidad es el primer filtro. Si no cumples las reglas principales, un ensayo fuerte por lo general no arregla la solicitud.',
      sections: [
        {
          title: 'Categorías comunes de elegibilidad',
          body:
            'Las becas pueden limitar por nivel académico, campo, institución, país, ciudadanía, residencia, GPA, necesidad, identidad, comunidad o plan de carrera.',
          bullets: [
            'Lee con cuidado el lenguaje de obligatorio.',
            'Separa requisitos preferidos de requisitos obligatorios.',
            'Revisa si aplican al momento de solicitar o al momento del premio.'
          ]
        },
        {
          title: 'Cuando la elegibilidad no está clara',
          body:
            'Si un listado no explica bien la elegibilidad, verifica la fuente oficial o contacta al proveedor antes de invertir mucho esfuerzo.',
          bullets: [
            'Busca FAQ oficial o PDF de reglas.',
            'Revisa términos del año en curso.',
            'No confíes solo en resúmenes de terceros.'
          ]
        }
      ],
      checklist: [
        'Nivel académico',
        'Campo o carrera',
        'Ciudadanía o residencia',
        'GPA',
        'Institución',
        'Necesidad financiera',
        'Documentos'
      ],
      examples: [
        'Estudiantes de EE. UU. puede significar ciudadanos, residentes o matriculados en EE. UU. Confirma la regla exacta.',
        'Una beca STEM puede incluir solo ciertas carreras.'
      ],
      links: [
        ES_RESOURCE_LINKS.scholarships,
        ES_RESOURCE_LINKS.methodology,
        ES_RESOURCE_LINKS.ranking
      ],
      faq: [
        {
          question: '¿Debo postular si casi cumplo elegibilidad?',
          answer:
            'Por lo general no, salvo que el proveedor permita excepciones. Confirma en la fuente oficial antes de invertir tiempo.'
        },
        {
          question: '¿Puede cambiar la elegibilidad?',
          answer: 'Sí. Los proveedores pueden cambiar reglas entre ciclos; revisa siempre los requisitos actuales.'
        }
      ]
    }),
    resourcePageEs('/resources/scholarship-documents-checklist', {
      title: 'Checklist de documentos para becas',
      metaDescription:
        'Documentos que conviene preparar antes de solicitar becas: ensayos, transcripciones, cartas y prueba de matrícula.',
      h1: 'Checklist de documentos para becas',
      intro:
        'Los documentos suelen decidir si una solicitud es posible antes de la fecha límite. Arma una carpeta reutilizable y registra lo que pide cada proveedor.',
      sections: [
        {
          title: 'Documentos comunes',
          body:
            'Muchas becas piden materiales académicos, de identidad, matrícula, necesidad financiera, ensayo, recomendación o portafolio.',
          bullets: [
            'Transcripción o historial académico',
            'Prueba de matrícula o admisión',
            'Ensayo o respuesta corta',
            'Carta de recomendación',
            'Currículum, lista de actividades o portafolio'
          ]
        },
        {
          title: 'Seguridad de documentos',
          body:
            'Sube documentos sensibles solo por rutas oficiales de confianza. Cuidado con formularios no oficiales, pagos inesperados o enlaces de correos desconocidos.',
          bullets: [
            'Revisa el dominio de solicitud.',
            'Evita enviar datos bancarios demasiado pronto.',
            'Guarda copias de archivos enviados.'
          ]
        }
      ],
      checklist: [
        'Transcripción',
        'Prueba de matrícula',
        'Borrador de ensayo',
        'Solicitud de recomendación',
        'Currículum o lista de actividades',
        'Evidencia de necesidad financiera',
        'Portafolio o archivo de proyecto si aplica'
      ],
      examples: [
        'Una carta de recomendación puede tardar más que el formulario.',
        'Una beca de portafolio puede exigir formatos o enlaces que debes probar antes de la fecha.'
      ],
      links: [
        { href: '/resources/how-to-apply-for-scholarships-checklist', label: 'Checklist de solicitud' },
        ES_RESOURCE_LINKS.scam,
        ES_RESOURCE_LINKS.scholarships
      ],
      faq: [
        {
          question: '¿Todas las becas piden ensayo?',
          answer:
            'No. Algunas no piden ensayo; otras piden respuestas cortas, ensayos completos, cartas o documentos especiales.'
        },
        {
          question: '¿Puedo reutilizar documentos?',
          answer:
            'Puedes reutilizar evidencia y materiales base, pero adapta ensayos y declaraciones al prompt de cada proveedor.'
        }
      ]
    })
  ]);

export const extendedResourceSlugFrPages: Partial<Record<string, PageDraft>> =
  Object.fromEntries([
    resourcePageFr('/resources/how-to-find-scholarships', {
      title: 'Comment trouver des bourses qui valent votre temps',
      metaDescription:
        'Guide pratique pour trouver des bourses réalistes, vérifier l’admissibilité et construire une shortlist utile.',
      h1: 'Comment trouver des bourses',
      intro:
        'Une bonne recherche ne consiste pas à tout postuler. Commencez large, vérifiez l’admissibilité tôt, comparez l’effort à la valeur et gardez seulement les opportunités avec des règles officielles claires.',
      sections: [
        {
          title: 'Commencez par l’adéquation, pas le volume',
          body:
            'La perte de temps la plus rapide est de postuler sur le titre seul. Utilisez les filtres de niveau, domaine, pays, citoyenneté, GPA et établissement avant de lire la rédaction.',
          bullets: [
            'Faites une recherche large puis affinez par admissibilité.',
            'Priorisez les fiches avec source officielle et date claire.',
            'Gardez à part les pistes prometteuses mais incomplètes.'
          ]
        },
        {
          title: 'Comparez l’effort avant de vous engager',
          body:
            'Un gros prix avec plusieurs textes peut valoir le coup, mais seulement si vous avez le temps et correspondez aux règles principales.',
          bullets: [
            'Estimez les documents requis.',
            'Vérifiez si relevés ou lettres demandent du délai.',
            'Associez les candidatures exigeantes à vos preuves les plus fortes.'
          ]
        }
      ],
      checklist: [
        'Source officielle confirmée',
        'Admissibilité confirmée',
        'Date et fuseau confirmés',
        'Documents requis confirmés',
        'Options réalistes enregistrées',
        'Postuler via le fournisseur officiel'
      ],
      examples: [
        'Un étudiant STEM doit vérifier domaine, niveau, citoyenneté et rédaction avant de commencer.',
        'Un étudiant international doit confirmer si le fournisseur accepte les non-citoyens.'
      ],
      links: [
        FR_RESOURCE_LINKS.scholarships,
        FR_RESOURCE_LINKS.howItWorks,
        FR_RESOURCE_LINKS.methodology
      ],
      faq: [
        {
          question: 'À combien de bourses postuler ?',
          answer:
            'Il n’y a pas de nombre universel. Une courte liste avec des règles claires est souvent plus forte que de nombreuses candidatures peu adaptées.'
        },
        {
          question: 'Postuler si des infos manquent ?',
          answer:
            'Utilisez-la comme piste, mais confirmez date, admissibilité, montant et voie officielle avant d’investir du temps.'
        }
      ]
    }),
    resourcePageFr('/resources/how-to-apply-for-scholarships-checklist', {
      title: 'Checklist de candidature aux bourses',
      metaDescription:
        'Checklist étape par étape pour préparer des candidatures sans oublier documents, dates ni règles.',
      h1: 'Checklist de candidature aux bourses',
      intro:
        'Les candidatures sont plus simples quand vous séparez admissibilité, documents, rédaction, revue de la source officielle et envoi final.',
      sections: [
        {
          title: 'Avant d’écrire',
          body:
            'Ne commencez pas la rédaction tant que la bourse est ouverte, que votre profil correspond et que vous connaissez les pièces requises.',
          bullets: [
            'Lisez l’admissibilité avant le formulaire.',
            'Vérifiez fuseau horaire et mode d’envoi.',
            'Listez chaque document et qui le contrôle.'
          ]
        },
        {
          title: 'Avant d’envoyer',
          body:
            'La relecture finale doit repérer champs vides, relevés obsolètes, noms de fichiers faibles et voies non officielles.',
          bullets: [
            'Utilisez la page officielle du fournisseur pour les règles finales.',
            'Relisez le texte face au prompt.',
            'Enregistrez confirmations ou e-mails.'
          ]
        }
      ],
      checklist: [
        'Admissibilité confirmée',
        'Date confirmée',
        'Prompt copié dans le plan',
        'Relevé ou inscription demandé',
        'Lettre de recommandation planifiée',
        'Lien officiel vérifié',
        'Confirmation d’envoi enregistrée'
      ],
      examples: [
        'Si une recommandation est requise, demandez tôt et incluez le prompt officiel.',
        'Si la bourse est renouvelable, vérifiez si vous devez repostuler chaque année.'
      ],
      links: [
        FR_RESOURCE_LINKS.scholarships,
        { href: '/resources/scholarship-documents-checklist', label: 'Checklist documents' },
        FR_RESOURCE_LINKS.disclaimer
      ],
      faq: [
        {
          question: 'Par quoi commencer ?',
          answer:
            'Confirmez admissibilité et date avant d’écrire. Ces deux vérifications évitent la plupart du temps perdu.'
        },
        {
          question: 'ScholarshipTop envoie-t-il ma candidature ?',
          answer:
            'Non. ScholarshipTop aide à chercher et planifier. Les candidatures doivent passer par la voie officielle du fournisseur.'
        }
      ]
    }),
    resourcePageFr('/resources/no-essay-scholarships-guide', {
      title: 'Guide des bourses sans rédaction',
      metaDescription:
        'Comment évaluer les bourses sans rédaction, éviter les pistes faibles et vérifier l’admissibilité.',
      h1: 'Guide des bourses sans rédaction',
      intro:
        'Les bourses sans rédaction peuvent être utiles, mais les candidatures faciles attirent souvent beaucoup de monde. Traitez-les comme partie du plan, pas comme stratégie unique.',
      sections: [
        {
          title: 'Pourquoi elles sont différentes',
          body:
            'Moins d’effort signifie souvent plus de candidats. La tâche principale est de confirmer que la fiche est légitime et que vous correspondez aux règles de base.',
          bullets: [
            'Vérifiez le statut de la source avant de partager des données.',
            'Confirmez s’il s’agit de tirage ou de mérite.',
            'Ne payez pas pour débloquer une bourse.'
          ]
        },
        {
          title: 'Comment bien les utiliser',
          body:
            'Utilisez-les comme compléments rapides après les candidatures mieux adaptées.',
          bullets: [
            'Postulez seulement si la source est claire.',
            'Enregistrez les dates pour ne pas distraire des grosses candidatures.',
            'Équilibrez entrées faciles et bourses ciblées.'
          ]
        }
      ],
      checklist: [
        'Source officielle visible',
        'Aucun frais obligatoire',
        'Règles d’admissibilité claires',
        'Date claire',
        'Attentes de confidentialité acceptables'
      ],
      examples: [
        'Une bourse sans rédaction au fournisseur flou doit être vérifiée, pas postulée automatiquement.',
        'Un formulaire rapide d’un fournisseur connu peut valoir le coup si la date est proche.'
      ],
      links: [
        { href: '/scholarships/no-essay', label: 'Bourses sans rédaction' },
        FR_RESOURCE_LINKS.scam,
        FR_RESOURCE_LINKS.methodology
      ],
      faq: [
        {
          question: 'Les bourses sans rédaction sont-elles réelles ?',
          answer:
            'Certaines oui. Vérifiez fournisseur, voie, confidentialité, date et règles du prix avant de postuler.'
        },
        {
          question: 'Sont-elles plus faciles à gagner ?',
          answer:
            'Elles peuvent être plus faciles à soumettre, mais une admissibilité large implique souvent plus de concurrence.'
        }
      ]
    }),
    resourcePageFr('/resources/easy-scholarships-guide', {
      title: 'Guide des bourses faciles',
      metaDescription:
        'Comment décider si les bourses faciles valent le coup et quoi vérifier avant d’envoyer.',
      h1: 'Guide des bourses faciles',
      intro:
        'Les bourses faciles aident quand elles font gagner du temps sans cacher le risque. Séparez les candidatures légitimes à faible effort des fiches vagues.',
      sections: [
        {
          title: 'Ce que facile devrait signifier',
          body:
            'Facile devrait signifier moins de pièces, règles claires et voie directe. Pas source floue, prix garanti ou paiement suspect.',
          bullets: [
            'Cherchez peu de pièces requises.',
            'Confirmez la source officielle.',
            'Vérifiez confidentialité et données.'
          ]
        },
        {
          title: 'Quand passer',
          body:
            'Passez si l’admissibilité est confuse, le fournisseur inconnu, la date absente ou s’ils demandent paiement ou données sensibles.',
          bullets: ['Pas de source officielle', 'Pas de montant clair', 'Pas de règles claires']
        }
      ],
      checklist: [
        'Effort vérifié',
        'Documents vérifiés',
        'Date vérifiée',
        'Source vérifiée',
        'Règles du prix vérifiées'
      ],
      examples: [
        'Un court formulaire officiel peut être une bonne candidature facile.',
        'Un prix garanti d’un site inconnu doit être traité comme dangereux.'
      ],
      links: [
        { href: '/scholarships/hub/easy-apply', label: 'Bourses à candidature facile' },
        FR_RESOURCE_LINKS.ranking,
        FR_RESOURCE_LINKS.scam
      ],
      faq: [
        {
          question: 'Qu’est-ce qui rend une bourse facile ?',
          answer:
            'Peu de pièces, admissibilité claire, formulaire simple et voie officielle.'
        },
        {
          question: 'Doivent-elles être ma stratégie principale ?',
          answer:
            'En général non. Elles complètent le plan, mais les bourses ciblées avec fort adéquation méritent souvent plus d’attention.'
        }
      ]
    }),
    resourcePageFr('/resources/stem-scholarships-guide', {
      title: 'Guide des bourses STEM',
      metaDescription:
        'Comment les étudiants STEM évaluent admissibilité, documents, rédactions et exigences de recherche.',
      h1: 'Guide des bourses STEM',
      intro:
        'Les bourses STEM dépendent souvent du domaine, du niveau, de l’établissement, de la recherche, du GPA, de la citoyenneté ou des objectifs professionnels. Lisez l’admissibilité avant de rédiger.',
      sections: [
        {
          title: 'Signaux d’admissibilité STEM courants',
          body:
            'Les fournisseurs peuvent limiter par filière, branche d’ingénierie, informatique, santé, data science, recherche ou groupes sous-représentés.',
          bullets: [
            'Vérifiez la formulation exacte du domaine.',
            'Confirmez le niveau : lycée, licence, master ou doctorat.',
            'Cherchez GPA, recherche, stage ou projet requis.'
          ]
        },
        {
          title: 'Renforcer une candidature STEM',
          body:
            'Utilisez des preuves concrètes : projets, recherche, stages, cours, leadership ou impact communautaire aligné sur la mission.',
          bullets: [
            'Reliez votre histoire au focus du fournisseur.',
            'Préparez les relevés tôt.',
            'Demandez aux recommandeurs des exemples STEM précis.'
          ]
        }
      ],
      checklist: [
        'Filière ou domaine correspond',
        'Niveau correspond',
        'Règles GPA vérifiées',
        'Relevé prêt',
        'Recommandation en cours',
        'Preuve de projet ou recherche prête'
      ],
      examples: [
        'Une bourse ingénierie peut exclure d’autres filières STEM.',
        'Un prix recherche peut valoriser la profondeur du projet plus qu’un texte leadership générique.'
      ],
      links: [
        { href: '/scholarships/category/stem', label: 'Bourses STEM' },
        { href: '/scholarships/category/medical', label: 'Bourses médicales' },
        { href: '/scholarships/engineering', label: 'Bourses ingénierie' }
      ],
      faq: [
        {
          question: 'Faut-il toujours un GPA élevé ?',
          answer:
            'Non. Certaines oui, d’autres valorisent intérêt, projets, identité, besoin ou impact communautaire.'
        },
        {
          question: 'Puis-je réutiliser le même texte STEM ?',
          answer:
            'Réutilisez les preuves, pas le texte entier. Chaque fournisseur peut valoriser un domaine ou une mission différente.'
        }
      ]
    }),
    resourcePageFr('/resources/scholarships-in-usa-for-international-students', {
      title: 'Bourses aux États-Unis pour étudiants internationaux',
      metaDescription:
        'Comment chercher des bourses aux États-Unis, vérifier l’admissibilité et les règles du fournisseur.',
      h1: 'Bourses aux États-Unis pour étudiants internationaux',
      intro:
        'Les bourses américaines pour internationaux exigent une vérification attentive. Certaines ouvrent aux non-citoyens ; d’autres exigent résidence, citoyenneté, FAFSA ou inscription dans un établissement précis.',
      sections: [
        {
          title: 'Vérifications d’admissibilité importantes',
          body:
            'Confirmez citoyenneté, statut de visa, établissement, niveau, domaine et si FAFSA ou résidence domestique est exigé.',
          bullets: [
            'Lisez la formulation pour non-citoyens.',
            'Confirmez si les titulaires F-1 peuvent postuler.',
            'Lisez attentivement les restrictions par école.'
          ]
        },
        {
          title: 'Documents à préparer',
          body:
            'Pièces courantes : relevés, preuve d’inscription, rédactions, besoin financier, lettres et parfois détails de visa.',
          bullets: [
            'Ne téléversez pas de documents sensibles sur des sources floues.',
            'Confirmez le domaine officiel de candidature.',
            'Vérifiez si les documents traduits sont acceptés.'
          ]
        }
      ],
      checklist: [
        'Admissibilité non-citoyens confirmée',
        'Règles d’inscription scolaire confirmées',
        'Langage visa ou résidence vérifié',
        'Exigence FAFSA vérifiée',
        'Source officielle vérifiée'
      ],
      examples: [
        'Une bourse peut dire international mais exiger inscription dans une université américaine.',
        'Certains prix privés ouvrent aux internationaux même si l’aide publique ne le fait pas.'
      ],
      links: [
        { href: '/scholarships/hub/international-friendly', label: 'Bourses international-friendly' },
        { href: '/scholarships/study-in/united-states', label: 'Bourses aux États-Unis' },
        FR_RESOURCE_LINKS.disclaimer
      ],
      faq: [
        {
          question: 'Les internationaux peuvent-ils obtenir des bourses aux États-Unis ?',
          answer:
            'Oui, mais l’admissibilité varie. Confirmez citoyenneté, visa, inscription et exigences sur la page officielle.'
        },
        {
          question: 'Faut-il le FAFSA ?',
          answer:
            'Certaines bourses américaines l’exigent, mais beaucoup de prix privés ou institutionnels utilisent d’autres critères.'
        }
      ]
    }),
    resourcePageFr('/resources/scholarships-for-high-school-seniors', {
      title: 'Bourses pour lycéens en terminale',
      metaDescription:
        'Comment trouver des bourses, prioriser les dates et préparer les pièces courantes en terminale.',
      h1: 'Bourses pour lycéens en terminale',
      intro:
        'Les terminaux doivent construire un calendrier tôt car dates, lettres, relevés, rédactions et preuve d’inscription peuvent chevaucher les candidatures universitaires.',
      sections: [
        {
          title: 'Prioriser par date et adéquation',
          body:
            'Commencez par les bourses où statut de terminale, année de diplôme, université visée, GPA, domaine ou lieu correspondent clairement.',
          bullets: [
            'Séparez prix locaux, scolaires, nationaux et universitaires.',
            'Surveillez les groupes de dates automne, hiver et printemps.',
            'Demandez tôt aux conseillers pour relevés et lettres.'
          ]
        },
        {
          title: 'Pièces courantes',
          body:
            'On demande souvent rédactions, relevés, activités, lettres, preuve d’inscription ou besoin financier.',
          bullets: [
            'Gardez une liste d’activités prête.',
            'Conservez des preuves réutilisables pour les textes.',
            'Enregistrez les confirmations d’envoi.'
          ]
        }
      ],
      checklist: [
        'Année de diplôme correspond',
        'Règles d’inscription universitaire vérifiées',
        'Relevé demandé',
        'Recommandation demandée',
        'Prompt de rédaction enregistré',
        'Calendrier des dates à jour'
      ],
      examples: [
        'Les prix locaux peuvent être moins visibles mais mieux adaptés.',
        'Les bourses universitaires peuvent exiger admission ou inscription.'
      ],
      links: [
        { href: '/scholarships/high-school', label: 'Bourses lycée' },
        { href: '/resources/how-to-apply-for-scholarships-checklist', label: 'Checklist candidature' },
        { href: '/resources/scholarship-documents-checklist', label: 'Checklist documents' }
      ],
      faq: [
        {
          question: 'Quand commencer à postuler ?',
          answer:
            'Le plus tôt possible en terminale, et continuez jusqu’au printemps car les cycles varient.'
        },
        {
          question: 'Faut-il une preuve d’inscription universitaire ?',
          answer:
            'Certaines bourses l’exigent ; d’autres acceptent une inscription prévue. Vérifiez les règles officielles.'
        }
      ]
    }),
    resourcePageFr('/resources/scholarship-eligibility-explained', {
      title: 'Admissibilité aux bourses expliquée',
      metaDescription:
        'Guide clair sur les règles d’admissibilité : niveau, domaine, citoyenneté, résidence, GPA et documents.',
      h1: 'Admissibilité aux bourses expliquée',
      intro:
        'L’admissibilité est le premier filtre. Si vous ne correspondez pas aux règles principales, un bon texte ne rattrape généralement pas la candidature.',
      sections: [
        {
          title: 'Catégories d’admissibilité courantes',
          body:
            'Les bourses peuvent limiter par niveau, domaine, établissement, pays, citoyenneté, résidence, GPA, besoin, identité, communauté ou projet professionnel.',
          bullets: [
            'Lisez attentivement le langage obligatoire.',
            'Séparez critères souhaités et obligatoires.',
            'Vérifiez s’ils s’appliquent à la candidature ou à l’attribution.'
          ]
        },
        {
          title: 'Quand l’admissibilité est floue',
          body:
            'Si une fiche n’explique pas bien l’admissibilité, vérifiez la source officielle ou contactez le fournisseur avant un gros investissement.',
          bullets: [
            'Cherchez FAQ officielle ou PDF de règles.',
            'Vérifiez les termes de l’année en cours.',
            'Ne vous fiez pas seulement aux résumés tiers.'
          ]
        }
      ],
      checklist: [
        'Niveau académique',
        'Domaine ou filière',
        'Citoyenneté ou résidence',
        'GPA',
        'Établissement',
        'Besoin financier',
        'Documents'
      ],
      examples: [
        'Étudiants américains peut signifier citoyens, résidents ou inscrits aux États-Unis. Confirmez la règle exacte.',
        'Une bourse STEM peut n’inclure que certaines filières.'
      ],
      links: [
        FR_RESOURCE_LINKS.scholarships,
        FR_RESOURCE_LINKS.methodology,
        FR_RESOURCE_LINKS.ranking
      ],
      faq: [
        {
          question: 'Postuler si j’y corresponds presque ?',
          answer:
            'En général non, sauf exceptions autorisées. Confirmez sur la source officielle avant d’investir du temps.'
        },
        {
          question: 'L’admissibilité peut-elle changer ?',
          answer:
            'Oui. Les fournisseurs peuvent changer les règles entre cycles ; vérifiez toujours les exigences actuelles.'
        }
      ]
    }),
    resourcePageFr('/resources/scholarship-documents-checklist', {
      title: 'Checklist des documents pour bourses',
      metaDescription:
        'Documents à préparer avant de postuler : rédactions, relevés, lettres et preuve d’inscription.',
      h1: 'Checklist des documents pour bourses',
      intro:
        'Les documents décident souvent si une candidature est possible avant la date limite. Créez un dossier réutilisable et suivez ce que demande chaque fournisseur.',
      sections: [
        {
          title: 'Documents courants',
          body:
            'Beaucoup de bourses demandent pièces académiques, identité, inscription, besoin financier, rédaction, recommandation ou portfolio.',
          bullets: [
            'Relevé ou dossier académique',
            'Preuve d’inscription ou d’admission',
            'Rédaction ou courte réponse',
            'Lettre de recommandation',
            'CV, liste d’activités ou portfolio'
          ]
        },
        {
          title: 'Sécurité des documents',
          body:
            'Téléversez les pièces sensibles uniquement via des voies officielles de confiance. Méfiez-vous des formulaires non officiels, paiements inattendus ou liens d’e-mails inconnus.',
          bullets: [
            'Vérifiez le domaine de candidature.',
            'Évitez d’envoyer des données bancaires trop tôt.',
            'Conservez des copies des fichiers envoyés.'
          ]
        }
      ],
      checklist: [
        'Relevé',
        'Preuve d’inscription',
        'Brouillon de rédaction',
        'Demande de recommandation',
        'CV ou liste d’activités',
        'Preuve de besoin financier',
        'Portfolio ou fichier projet si requis'
      ],
      examples: [
        'Une lettre de recommandation peut prendre plus de temps que le formulaire.',
        'Une bourse portfolio peut exiger des formats ou liens à tester avant la date.'
      ],
      links: [
        { href: '/resources/how-to-apply-for-scholarships-checklist', label: 'Checklist candidature' },
        FR_RESOURCE_LINKS.scam,
        FR_RESOURCE_LINKS.scholarships
      ],
      faq: [
        {
          question: 'Toutes les bourses exigent-elles une rédaction ?',
          answer:
            'Non. Certaines n’en demandent pas ; d’autres demandent courtes réponses, textes complets, lettres ou pièces spéciales.'
        },
        {
          question: 'Puis-je réutiliser des documents ?',
          answer:
            'Vous pouvez réutiliser preuves et bases, mais adaptez textes et déclarations au prompt de chaque fournisseur.'
        }
      ]
    })
  ]);
