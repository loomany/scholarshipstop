import type { PageDraft } from '@/lib/i18n/staticTranslations/types';
import { ES_DISCLAIMER, FR_DISCLAIMER } from '@/lib/i18n/staticTranslations/common';

const shellEs = (
  path: string,
  draft: Omit<PageDraft, 'bucket' | 'kind' | 'disclaimer' | 'sections'>
): [string, PageDraft] => [
  path,
  { ...draft, bucket: 'resources', kind: 'resourceShell', disclaimer: ES_DISCLAIMER, sections: [] }
];

const shellFr = (
  path: string,
  draft: Omit<PageDraft, 'bucket' | 'kind' | 'disclaimer' | 'sections'>
): [string, PageDraft] => [
  path,
  { ...draft, bucket: 'resources', kind: 'resourceShell', disclaimer: FR_DISCLAIMER, sections: [] }
];

export const extendedResourceShellEsPages: Partial<Record<string, PageDraft>> =
  Object.fromEntries([
    shellEs('/resources/how-to-apply-for-scholarships', {
      title: 'Cómo solicitar becas en 2026',
      metaDescription:
        'Guía paso a paso: dónde buscar, qué preparar, errores a evitar y cómo enviar solicitudes más sólidas.',
      h1: 'Cómo solicitar becas',
      eyebrow: 'Guía de recursos',
      intro:
        'Las becas premian la preparación más que la suerte. Esta guía explica dónde buscar, qué reunir y cómo enviar solicitudes que realmente se lean.',
      subtitle:
        'Las becas premian la preparación más que la suerte. Esta guía te lleva por dónde buscar, qué reunir y cómo enviar solicitudes que realmente se lean, sin agotarte.',
      proseBlocks: [
        {
          type: 'p',
          text:
            'La mayoría de estudiantes pierde becas en la parte aburrida del medio: campos vacíos, ensayos copiados de otras apps o envíos de último minuto. Trata la solicitud como un proyecto con calendario, carpeta y checklist, y tus probabilidades suben rápido.'
        },
        { type: 'h2', text: 'Dónde encontrar becas' },
        {
          type: 'p',
          text:
            'Empieza con la oficina de ayuda financiera de tu escuela y los portales que recomiende tu consejero. Luego añade bases nacionales y explora becas por materia y estado para no perseguir solo los mismos premios enormes.'
        },
        {
          type: 'ul',
          items: [
            'Revisa elegibilidad antes de invertir tiempo en el ensayo.',
            'Guarda enlaces y fechas en un solo lugar.',
            'Mezcla becas ambiciosas, de encaje y de respaldo.'
          ]
        },
        { type: 'h2', text: 'Prepara tus documentos' },
        {
          type: 'p',
          text:
            'La mayoría pide los mismos bloques: transcripción, currículum o lista de actividades, prueba de matrícula y a veces información financiera. Arma una carpeta maestra en PDF con nombres claros.'
        },
        {
          type: 'p',
          text:
            'Pide cartas de recomendación con tiempo: dos semanas es lo mínimo educado. Comparte tus metas y las becas que buscas para que la carta encaje con el prompt.'
        },
        { type: 'h2', text: 'Cómo escribir un ensayo sólido' },
        {
          type: 'p',
          text:
            'Lee el prompt dos veces. Responde la pregunta exacta. Abre con un momento concreto y conéctalo con tus metas. Evita clichés sin evidencia inmediata.'
        },
        { type: 'h2', text: 'Errores comunes' },
        {
          type: 'ul',
          items: [
            'Ignorar límites de palabras o archivos adjuntos.',
            'Usar el nombre equivocado de escuela o beca por copiar y pegar.',
            'Confundir fecha de envío online con fecha de matasellos.',
            'Presionar a tu recomendador a medianoche en lugar de recordar con cortesía.'
          ]
        },
        { type: 'h2', text: 'Consejos para mejorar tus probabilidades' },
        {
          type: 'p',
          text:
            'Reutiliza un ensayo núcleo fuerte, pero adapta el primer y último párrafo a cada programa. Lleva un registro simple de fecha, portal y confirmación después de cada envío.'
        }
      ],
      links: [
        { href: '/scholarships', label: 'Explorar becas' },
        { href: '/resources/scholarship-deadlines-explained', label: 'Fechas de becas explicadas' }
      ],
      faq: [
        {
          question: '¿Necesito notas perfectas?',
          answer:
            'No. Muchas becas valoran encaje, historia, necesidad o actividades, no solo un 4.0. Postula donde cumples los requisitos con honestidad.'
        },
        {
          question: '¿A cuántas becas debo postular?',
          answer:
            'Empieza con un conjunto pequeño que puedas hacer bien. La calidad y el seguimiento de fechas importan más que el volumen bruto.'
        }
      ],
      endReading: [
        {
          href: '/resources/scholarship-deadlines-explained',
          title: 'Fechas de becas explicadas',
          blurb: 'formas simples de gestionar fechas y no perder oportunidades'
        },
        {
          href: '/resources/combine-multiple-scholarships',
          title: '¿Puedes combinar varias becas?',
          blurb: 'cómo funciona acumular becas en la práctica'
        }
      ]
    }),
    shellEs('/resources/scholarship-deadlines-explained', {
      title: 'Fechas de becas explicadas: no pierdas tu oportunidad',
      metaDescription:
        'Cómo funcionan fechas fijas vs continuas, cuándo empezar, cómo hacer seguimiento y hábitos para no perder becas.',
      h1: 'Fechas de becas explicadas',
      eyebrow: 'Guía de recursos',
      intro:
        'Las fechas parecen simples hasta que mezclas matasellos, zonas horarias y revisiones continuas. Aquí va una lectura directa de qué significa vencimiento y cómo adelantarte.',
      subtitle:
        'Las fechas parecen simples hasta que mezclas matasellos, zonas horarias y revisiones continuas. Aquí va qué significa realmente «vencer» y cómo mantenerte adelante sin vivir en el correo.',
      proseBlocks: [
        {
          type: 'p',
          text:
            'Las fechas de becas no son todas iguales. Algunas cierran a medianoche. Otras son continuas y leen solicitudes hasta agotar fondos. Saber cuál enfrentas cambia qué tan rápido debes moverte.'
        },
        { type: 'h2', text: 'Tipos de fechas' },
        {
          type: 'p',
          text:
            'Las fechas fijas cierran en día y hora exactos. Las continuas premian a quien llega temprano. Las prioritarias (comunes en ayuda institucional) dan mejor consideración si postulas antes de una primera fecha.'
        },
        {
          type: 'ul',
          items: [
            'Confirma la zona horaria en las reglas oficiales.',
            'Verifica si «recibido» significa enviado online o matasellos.',
            'Anota si las cartas deben llegar el mismo día.'
          ]
        },
        { type: 'h2', text: 'Cuándo empezar' },
        {
          type: 'p',
          text:
            'Empieza antes de lo que te parece cómodo, sobre todo para ensayos y cartas. Mapea fechas con al menos seis semanas de anticipación y trabaja hacia atrás.'
        },
        { type: 'h2', text: 'Cómo hacer seguimiento' },
        {
          type: 'p',
          text:
            'Un calendario, una hoja o un documento: elige un sistema que realmente abras. Por cada beca registra nombre, enlace, fecha, materiales y estado.'
        },
        { type: 'h2', text: 'Si pierdes una fecha' },
        {
          type: 'p',
          text:
            'No envíes spam al comité. En fechas fijas, pasa a la siguiente beca abierta. Si el portal falló, captura el error y escribe soporte esa misma noche.'
        },
        { type: 'h2', text: 'Consejos pro' },
        {
          type: 'ul',
          items: [
            'Agrupa solicitudes similares el mismo día.',
            'Preescribe una bio de 150 palabras y una historia de reto de 250.',
            'Antes de enviar, repasa el checklist de cómo solicitar becas.',
            'Si acumulas premios, confirma cómo interactúan con la ayuda escolar.'
          ]
        }
      ],
      links: [
        { href: '/resources/how-to-apply-for-scholarships', label: 'Cómo solicitar becas' },
        { href: '/scholarships', label: 'Explorar becas' }
      ],
      faq: [
        {
          question: '¿Puedo postular después de la fecha?',
          answer:
            'En fechas fijas, casi nunca. En programas continuos puede quedar fondo, pero no es lo mismo que «tarde está bien».'
        },
        {
          question: '¿Son flexibles las fechas?',
          answer:
            'Rara vez. Trata la fecha publicada como firme salvo confirmación escrita del proveedor.'
        }
      ],
      endReading: [
        {
          href: '/resources/how-to-apply-for-scholarships',
          title: 'Cómo solicitar becas',
          blurb: 'pasos prácticos para organizar tu proceso'
        },
        {
          href: '/resources/combine-multiple-scholarships',
          title: '¿Puedes combinar varias becas?',
          blurb: 'cómo funciona acumular becas en la práctica'
        }
      ]
    }),
    shellEs('/resources/combine-multiple-scholarships', {
      title: '¿Puedes combinar varias becas?',
      metaDescription:
        'Si puedes acumular becas, cómo funciona con la política escolar, limitaciones y preguntas antes de aceptar varios premios.',
      h1: '¿Puedes combinar varias becas?',
      eyebrow: 'Guía de recursos',
      intro:
        'A menudo sí, pero no siempre. Acumular depende de las reglas de cada premio, la política de tu escuela y si el dinero está limitado solo a matrícula.',
      subtitle:
        'Sí, a menudo, pero no siempre. «Acumular» depende de las reglas de cada premio, la política de tu escuela y si el dinero está etiquetado solo para matrícula. Así puedes pensarlo sin adivinar.',
      proseBlocks: [
        {
          type: 'p',
          text:
            'Acumular becas suena como matemática de dinero gratis, pero escuelas y donantes tienen límites. Algunos premios cubren necesidad no cubierta; otros están limitados al costo de asistencia publicado.'
        },
        { type: 'h2', text: 'Cómo funciona acumular' },
        {
          type: 'p',
          text:
            'Acumular significa tener más de una beca al mismo tiempo. Donantes privados, estados y tu universidad pueden enviar fondos a la oficina de facturación, que los aplica según la política.'
        },
        {
          type: 'ul',
          items: [
            'Pregunta: ¿la beca va a la escuela o a mí directamente?',
            'Pregunta: ¿se renueva automáticamente?',
            'Pregunta: ¿solo cubre matrícula u otros costos?'
          ]
        },
        { type: 'h2', text: 'Reglas y limitaciones' },
        {
          type: 'p',
          text:
            'Busca frases como «no acumulable», «último dólar» o «puede ajustar otra ayuda». Si estás cerca del tope, una beca nueva puede reemplazar parte de una beca existente.'
        },
        { type: 'h2', text: 'Becas privadas vs universitarias' },
        {
          type: 'p',
          text:
            'Las becas externas traen sus reglas; las universitarias se alinean con metas de inscripción o necesidad. Tu oficina de ayuda financiera reconcilia ambas.'
        },
        { type: 'h2', text: 'Cómo maximizar fondos' },
        {
          type: 'p',
          text:
            'Postula a premios con ángulos distintos: mérito, carrera, local, empleador. La organización y las fechas te permiten llegar a más plazos sin prisa.'
        },
        { type: 'h2', text: 'Qué vigilar' },
        {
          type: 'ul',
          items: [
            'Reportes fiscales en montos grandes: consulta al proveedor o a un profesional.',
            'Reembolsos: conoce el calendario de tu escuela.',
            'Renovaciones: perder una beca el próximo año puede cambiar cómo se acumula el resto.'
          ]
        }
      ],
      links: [
        { href: '/resources/scholarship-deadlines-explained', label: 'Fechas explicadas' },
        { href: '/resources/how-to-apply-for-scholarships', label: 'Cómo solicitar becas' }
      ],
      faq: [
        {
          question: '¿Es legal combinar becas?',
          answer:
            'En la mayoría de casos sí, si sigues los términos de cada proveedor y las reglas de ayuda de tu escuela.'
        },
        {
          question: '¿Una beca puede cancelar otra?',
          answer:
            'A veces la ayuda institucional se ajusta cuando llegan becas externas. Pregunta cómo se aplican a becas, préstamos y trabajo-estudio.'
        }
      ],
      endReading: [
        {
          href: '/resources/how-to-apply-for-scholarships',
          title: 'Cómo solicitar becas',
          blurb: 'pasos prácticos para organizar tu proceso'
        },
        {
          href: '/resources/scholarship-deadlines-explained',
          title: 'Fechas de becas explicadas',
          blurb: 'formas simples de gestionar fechas'
        }
      ]
    }),
    shellEs('/resources/medical-scholarships-guide', {
      title: 'Guía de becas médicas para estudiantes de salud',
      metaDescription:
        'Guía práctica de becas médicas y de salud: dónde buscar, elegibilidad, documentos y cómo elegir mejores solicitudes.',
      h1: 'Guía de becas médicas',
      eyebrow: 'Guía de recursos',
      intro:
        'Los estudiantes de salud tienen más ángulos de beca de los que parece: carrera, servicio, ubicación, identidad y tipo de atención que esperan brindar.',
      subtitle:
        'Los estudiantes de salud tienen más ángulos de beca de los que parece. Esta guía ayuda a ordenar opciones sin convertir la búsqueda en otra clase a tiempo completo.',
      proseBlocks: [
        {
          type: 'p',
          text:
            'Las becas médicas no son una sola categoría. Enfermería, pre-medicina, salud pública y ciencias biomédicas tienen caminos distintos. La estrategia empieza notando esas diferencias antes de copiar el mismo ensayo.'
        },
        { type: 'h2', text: 'Empieza por el camino de salud que sigues' },
        {
          type: 'p',
          text:
            'Un error común es buscar solo «becas médicas». Los proveedores escriben premios por enfermería, farmacia, terapia, salud pública o medicina rural.'
        },
        {
          type: 'ul',
          items: [
            'Pre-medicina: becas de ciencia, servicio y carrera en salud.',
            'Enfermería: hospitales, asociaciones estatales y fundaciones locales.',
            'Salud pública: prevención, comunidad y política.',
            'Ciencias aliadas: certificación y escasez de personal.'
          ]
        },
        { type: 'h2', text: 'De dónde suelen venir' },
        {
          type: 'p',
          text:
            'Escuelas, sistemas hospitalarios, asociaciones profesionales, fundaciones locales y empleadores suelen tener fondos que los estudiantes no ven si solo buscan en bases públicas.'
        },
        { type: 'h2', text: 'Alinea tu historia con la razón del proveedor' },
        {
          type: 'p',
          text:
            'Los comités suelen financiar por fuerza laboral local, acceso a la atención o diversidad en salud. Tu solicitud es más fuerte cuando responde a esa razón.'
        },
        { type: 'h2', text: 'Lee elegibilidad sin adivinar' },
        {
          type: 'p',
          text:
            '«Matriculado en programa acreditado de enfermería» no es lo mismo que «interesado en enfermería». Revisa nivel, GPA, ubicación y documentos antes del ensayo.'
        },
        { type: 'h2', text: 'Arma un paquete de solicitud' },
        {
          type: 'p',
          text:
            'Mantén transcripción, currículum, prueba de matrícula, notas para cartas y ejemplos de servicio o exposición clínica en una carpeta lista.'
        },
        { type: 'h2', text: 'Escribe con evidencia, no con eslóganes' },
        {
          type: 'p',
          text:
            '«Quiero ayudar a las personas» puede ser cierto, pero los revisores necesitan un momento, población o problema concreto que explique tu camino.'
        }
      ],
      links: [
        { href: '/scholarships/category/medical', label: 'Becas de medicina' },
        { href: '/essays', label: 'Guías de ensayos' },
        { href: '/resources/scholarship-deadlines-explained', label: 'Fechas explicadas' }
      ],
      faq: [
        {
          question: '¿Las becas médicas son solo para medicina?',
          answer:
            'No. Muchas apoyan enfermería, salud pública, farmacia, terapias y otras rutas. Lee el lenguaje de elegibilidad con cuidado.'
        },
        {
          question: '¿Qué documentos preparar primero?',
          answer:
            'Currículum actualizado, transcripción, prueba de matrícula y lista breve de experiencias clínicas, de servicio o de investigación.'
        },
        {
          question: '¿Cómo evitar perder tiempo?',
          answer:
            'Filtra por campo, nivel, ubicación, GPA y materiales antes de escribir el ensayo.'
        }
      ],
      endReading: [
        {
          href: '/scholarships/category/medical',
          title: 'Explorar becas de medicina',
          blurb: 'comparar listados activos por fecha, elegibilidad y requisitos'
        },
        {
          href: '/essays',
          title: 'Guías de ensayos para becas',
          blurb: 'planificar ensayos de salud, servicio y metas profesionales'
        },
        {
          href: '/resources/scholarship-deadlines-explained',
          title: 'Fechas de becas explicadas',
          blurb: 'organizar transcripciones, cartas y formularios'
        }
      ]
    }),
    shellEs('/resources/scholarships-for-international-students-guide', {
      title: 'Becas para estudiantes internacionales: guía práctica',
      metaDescription:
        'Guía para internacionales: elegibilidad, documentos, ensayos, fechas y listados amigables para internacionales.',
      h1: 'Becas para estudiantes internacionales',
      eyebrow: 'Guía de recursos',
      intro:
        'Los internacionales pueden encontrar becas, pero la búsqueda es distinta: ciudadanía, visa, escuela, documentos y restricciones de pago importan mucho.',
      subtitle:
        'Los internacionales pueden encontrar becas, pero la búsqueda es distinta: reglas de ciudadanía, estatus de visa, elegibilidad escolar, tiempos de documentos y restricciones de fondos importan antes de gastar horas en la solicitud equivocada.',
      proseBlocks: [
        {
          type: 'p',
          text:
            'Buscar becas como internacional puede sentirse como leer letra pequeña todo el día. El objetivo no es postular a todo, sino identificar premios donde tu estatus y perfil encajan de verdad.'
        },
        { type: 'h2', text: 'Qué significa amigable para internacionales' },
        {
          type: 'p',
          text:
            'No significa garantizado. Significa que puede valer la pena revisar la ficha. Algunos proveedores abren explícitamente; otros exigen lectura detallada de ciudadanía, FAFSA o número de Seguro Social.'
        },
        { type: 'h2', text: 'Empieza con ayuda de la escuela' },
        {
          type: 'p',
          text:
            'Para muchos internacionales, las mejores opciones empiezan en la universidad: mérito de admisión, departamentos, becas internacionales o asistentías de posgrado.'
        },
        { type: 'h2', text: 'Separa ayuda de admisión de becas externas' },
        {
          type: 'p',
          text:
            'La palabra beca se usa para tipos distintos de dinero con reglas y tiempos distintos. Llévalos en categorías separadas en tus notas.'
        },
        { type: 'h2', text: 'Revisa reglas de pago antes de contar el dinero' },
        {
          type: 'p',
          text:
            'Un premio puede parecer perfecto y aun así ser difícil de usar si solo paga instituciones de EE. UU. o exige formularios fiscales que no puedes completar a tiempo.'
        },
        { type: 'h2', text: 'Documentos con tiempo de anticipación' },
        {
          type: 'p',
          text:
            'Puedes necesitar traducciones, evaluaciones de credenciales, prueba de matrícula, pasaporte o visa, puntajes y cartas. Pide documentos oficiales temprano.'
        },
        { type: 'h2', text: 'Ensayos con contexto suficiente' },
        {
          type: 'p',
          text:
            'Los lectores pueden no conocer tu sistema escolar o escala de notas. Explica contexto, preparación y metas sin convertir cada ensayo en una historia de visa salvo que el prompt lo pida.'
        }
      ],
      links: [
        { href: '/scholarships/hub/international-friendly', label: 'Becas amigables para internacionales' },
        { href: '/essays', label: 'Guías de ensayos' },
        { href: '/resources/scholarship-deadlines-explained', label: 'Fechas explicadas' }
      ],
      faq: [
        {
          question: '¿Pueden los internacionales solicitar becas en EE. UU.?',
          answer:
            'Sí, algunas abren a no ciudadanos o estudiantes con visa. Siempre confirma reglas oficiales antes de postular.'
        },
        {
          question: '¿Qué revisar primero?',
          answer:
            'Ciudadanía o residencia, visa o matrícula, escuelas elegibles, campo, nivel, ubicación, GPA y si se exige FAFSA u otros formularios.'
        },
        {
          question: '¿Los ensayos deben ser distintos?',
          answer:
            'Deben responder el prompt, pero a menudo conviene explicar contexto educativo y metas con claridad sin depender solo de la historia migratoria.'
        }
      ],
      endReading: [
        {
          href: '/scholarships/hub/international-friendly',
          title: 'Becas amigables para internacionales',
          blurb: 'revisar listados que pueden ser relevantes para postulantes internacionales'
        },
        {
          href: '/essays',
          title: 'Guías de ensayos para becas',
          blurb: 'dar forma a ensayos sobre metas, trayectoria y liderazgo'
        },
        {
          href: '/resources/scholarship-deadlines-explained',
          title: 'Fechas de becas explicadas',
          blurb: 'planificar zonas horarias, documentos y fechas escolares'
        }
      ]
    })
  ]);

export const extendedResourceShellFrPages: Partial<Record<string, PageDraft>> =
  Object.fromEntries([
    shellFr('/resources/how-to-apply-for-scholarships', {
      title: 'Comment postuler aux bourses en 2026',
      metaDescription:
        'Guide étape par étape : où chercher, quoi préparer, erreurs à éviter et candidatures plus solides.',
      h1: 'Comment postuler aux bourses',
      eyebrow: 'Guide ressources',
      intro:
        'Les bourses récompensent la préparation plus que la chance. Ce guide explique où chercher, quoi rassembler et comment envoyer des candidatures qui se lisent vraiment.',
      subtitle:
        'Les bourses récompensent la préparation plus que la chance. Ce guide vous accompagne sur où chercher, quoi rassembler et comment envoyer des candidatures lisibles sans vous épuiser.',
      proseBlocks: [
        {
          type: 'p',
          text:
            'La plupart des étudiants perdent des bourses dans la partie ennuyeuse : champs vides, textes copiés d’autres apps ou envois de dernière minute. Traitez la candidature comme un projet avec calendrier, dossier et checklist.'
        },
        { type: 'h2', text: 'Où trouver des bourses' },
        {
          type: 'p',
          text:
            'Commencez par le service d’aide financière de votre école et les portails recommandés. Ajoutez des bases nationales et explorez par matière et État pour ne pas courir les mêmes gros prix.'
        },
        {
          type: 'ul',
          items: [
            'Vérifiez l’admissibilité avant d’investir du temps dans la rédaction.',
            'Gardez liens et dates au même endroit.',
            'Mélangez bourses ambitieuses, adaptées et de secours.'
          ]
        },
        { type: 'h2', text: 'Préparez vos documents' },
        {
          type: 'p',
          text:
            'La plupart demandent relevé, CV ou liste d’activités, preuve d’inscription et parfois informations financières. Créez un dossier maître en PDF bien nommé.'
        },
        {
          type: 'p',
          text:
            'Demandez les lettres tôt : deux semaines est le minimum poli. Partagez vos objectifs et les bourses visées pour que la lettre corresponde au prompt.'
        },
        { type: 'h2', text: 'Rédiger un texte solide' },
        {
          type: 'p',
          text:
            'Lisez le prompt deux fois. Répondez à la question exacte. Ouvrez sur un moment concret et reliez-le à vos objectifs. Évitez les clichés sans preuve.'
        },
        { type: 'h2', text: 'Erreurs courantes' },
        {
          type: 'ul',
          items: [
            'Ignorer limites de mots ou pièces jointes.',
            'Mauvais nom d’école ou de bourse par copier-coller.',
            'Confondre date d’envoi en ligne et date de poste.',
            'Paniquer le recommandeur à minuit au lieu de relancer poliment.'
          ]
        },
        { type: 'h2', text: 'Augmenter vos chances' },
        {
          type: 'p',
          text:
            'Réutilisez un texte noyau fort, mais adaptez premier et dernier paragraphe à chaque programme. Tenez un registre simple après chaque envoi.'
        }
      ],
      links: [
        { href: '/scholarships', label: 'Explorer les bourses' },
        { href: '/resources/scholarship-deadlines-explained', label: 'Dates de bourses expliquées' }
      ],
      faq: [
        {
          question: 'Faut-il des notes parfaites ?',
          answer:
            'Non. Beaucoup de bourses valorisent adéquation, histoire, besoin ou activités. Postulez où vous correspondez honnêtement aux exigences.'
        },
        {
          question: 'À combien de bourses postuler ?',
          answer:
            'Commencez par un petit ensemble bien fait. La qualité et le suivi des dates comptent plus que le volume brut.'
        }
      ],
      endReading: [
        {
          href: '/resources/scholarship-deadlines-explained',
          title: 'Dates de bourses expliquées',
          blurb: 'façons simples de gérer les dates sans manquer d’opportunités'
        },
        {
          href: '/resources/combine-multiple-scholarships',
          title: 'Peut-on combiner plusieurs bourses ?',
          blurb: 'comment fonctionne l’empilement en pratique'
        }
      ]
    }),
    shellFr('/resources/scholarship-deadlines-explained', {
      title: 'Dates de bourses expliquées : ne manquez pas votre chance',
      metaDescription:
        'Dates fixes vs continues, quand commencer, suivi et habitudes pour ne pas manquer de bourses.',
      h1: 'Dates de bourses expliquées',
      eyebrow: 'Guide ressources',
      intro:
        'Les dates semblent simples jusqu’à mélanger cachets postaux, fuseaux horaires et revues continues. Voici ce que signifie vraiment l’échéance.',
      subtitle:
        'Les dates semblent simples jusqu’à mélanger cachets, fuseaux et revues continues. Voici ce que « échéance » signifie vraiment et comment rester en avance sans vivre dans sa boîte mail.',
      proseBlocks: [
        {
          type: 'p',
          text:
            'Toutes les dates ne se valent pas. Certaines ferment à minuit. D’autres sont continues et lisent les dossiers jusqu’à épuisement des fonds.'
        },
        { type: 'h2', text: 'Types de dates' },
        {
          type: 'p',
          text:
            'Les dates fixes ferment à un jour et une heure précis. Les continues récompensent les premiers arrivés. Les prioritaires donnent une meilleure considération avant une première date.'
        },
        {
          type: 'ul',
          items: [
            'Confirmez le fuseau horaire sur les règles officielles.',
            'Vérifiez si « reçu » signifie en ligne ou cachet postal.',
            'Notez si les lettres doivent arriver le même jour.'
          ]
        },
        { type: 'h2', text: 'Quand commencer' },
        {
          type: 'p',
          text:
            'Commencez plus tôt que confortable, surtout pour textes et lettres. Cartographiez les dates au moins six semaines à l’avance.'
        },
        { type: 'h2', text: 'Suivre les dates' },
        {
          type: 'p',
          text:
            'Calendrier, tableur ou document : choisissez un système que vous ouvrirez. Pour chaque bourse : nom, lien, date, pièces et statut.'
        },
        { type: 'h2', text: 'Si vous manquez une date' },
        {
          type: 'p',
          text:
            'N’envoyez pas de spam au comité. Sur date fixe, passez à la prochaine bourse ouverte. Si le portail a planté, capturez l’erreur et contactez le support cette nuit.'
        },
        { type: 'h2', text: 'Conseils pro' },
        {
          type: 'ul',
          items: [
            'Regroupez les candidatures similaires le même jour.',
            'Préécrivez une bio de 150 mots et une histoire de défi de 250.',
            'Avant d’envoyer, repassez la checklist de candidature.',
            'Si vous empilez des prix, confirmez l’interaction avec l’aide scolaire.'
          ]
        }
      ],
      links: [
        { href: '/resources/how-to-apply-for-scholarships', label: 'Comment postuler aux bourses' },
        { href: '/scholarships', label: 'Explorer les bourses' }
      ],
      faq: [
        {
          question: 'Postuler après la date ?',
          answer:
            'Sur dates fixes, presque jamais. Sur programmes continus, des fonds peuvent rester, mais ce n’est pas « en retard c’est ok ».'
        },
        {
          question: 'Les dates sont-elles flexibles ?',
          answer:
            'Rarement. Traitez la date publiée comme ferme sauf confirmation écrite du fournisseur.'
        }
      ],
      endReading: [
        {
          href: '/resources/how-to-apply-for-scholarships',
          title: 'Comment postuler aux bourses',
          blurb: 'étapes pratiques pour organiser votre processus'
        },
        {
          href: '/resources/combine-multiple-scholarships',
          title: 'Peut-on combiner plusieurs bourses ?',
          blurb: 'comment fonctionne l’empilement en pratique'
        }
      ]
    }),
    shellFr('/resources/combine-multiple-scholarships', {
      title: 'Peut-on combiner plusieurs bourses ?',
      metaDescription:
        'Empilement de bourses, politique scolaire, limites et questions avant d’accepter plusieurs prix.',
      h1: 'Peut-on combiner plusieurs bourses ?',
      eyebrow: 'Guide ressources',
      intro:
        'Souvent oui, mais pas toujours. L’empilement dépend des règles de chaque prix, de la politique de votre école et des restrictions de fonds.',
      subtitle:
        'Oui, souvent, mais pas toujours. L’empilement dépend des règles de chaque prix, de la politique scolaire et du fait que l’argent soit limité aux frais de scolarité.',
      proseBlocks: [
        {
          type: 'p',
          text:
            'Empiler des bourses ressemble à de l’argent gratuit, mais écoles et donateurs ont des garde-fous. Certains prix comblent le besoin non couvert ; d’autres plafonnent au coût de présence publié.'
        },
        { type: 'h2', text: 'Comment fonctionne l’empilement' },
        {
          type: 'p',
          text:
            'Tenir plusieurs bourses en même temps. Donateurs privés, États et université envoient souvent les fonds au service de facturation, qui les applique selon la politique.'
        },
        {
          type: 'ul',
          items: [
            'La bourse va-t-elle à l’école ou directement à moi ?',
            'Se renouvelle-t-elle automatiquement ?',
            'Couvre-t-elle seulement les frais ou d’autres coûts ?'
          ]
        },
        { type: 'h2', text: 'Règles et limites' },
        {
          type: 'p',
          text:
            'Cherchez « non cumulable », « dernier dollar » ou « peut ajuster une autre aide ». Près du plafond, une nouvelle bourse peut remplacer une aide existante.'
        },
        { type: 'h2', text: 'Bourses privées vs universitaires' },
        {
          type: 'p',
          text:
            'Les bourses externes ont leurs règles ; les universitaires suivent objectifs d’inscription ou de besoin. Le service d’aide financière réconcilie les deux.'
        },
        { type: 'h2', text: 'Maximiser le financement' },
        {
          type: 'p',
          text:
            'Postulez à des prix avec angles différents : mérite, filière, local, employeur. Organisation et dates permettent d’atteindre plus d’échéances sans précipitation.'
        },
        { type: 'h2', text: 'Points de vigilance' },
        {
          type: 'ul',
          items: [
            'Fiscalité sur gros montants : consultez fournisseur ou professionnel.',
            'Remboursements : connaissez le calendrier scolaire.',
            'Renouvellements : perdre une bourse l’an prochain peut changer l’empilement.'
          ]
        }
      ],
      links: [
        { href: '/resources/scholarship-deadlines-explained', label: 'Dates expliquées' },
        { href: '/resources/how-to-apply-for-scholarships', label: 'Comment postuler' }
      ],
      faq: [
        {
          question: 'Est-ce légal de combiner des bourses ?',
          answer:
            'Dans la plupart des cas oui, en respectant les termes de chaque fournisseur et les règles d’aide de votre école.'
        },
        {
          question: 'Une bourse peut-elle en annuler une autre ?',
          answer:
            'Parfois l’aide institutionnelle s’ajuste quand arrivent des bourses externes. Demandez comment elles s’appliquent aux subventions, prêts et travail-études.'
        }
      ],
      endReading: [
        {
          href: '/resources/how-to-apply-for-scholarships',
          title: 'Comment postuler aux bourses',
          blurb: 'étapes pratiques pour organiser votre processus'
        },
        {
          href: '/resources/scholarship-deadlines-explained',
          title: 'Dates de bourses expliquées',
          blurb: 'façons simples de gérer les dates'
        }
      ]
    }),
    shellFr('/resources/medical-scholarships-guide', {
      title: 'Guide des bourses médicales pour étudiants en santé',
      metaDescription:
        'Guide pratique : où chercher, admissibilité, documents et choix des meilleures candidatures santé.',
      h1: 'Guide des bourses médicales',
      eyebrow: 'Guide ressources',
      intro:
        'Les étudiants en santé ont plus d’angles de bourse qu’il n’y paraît : filière, service, lieu, identité et type de soins visé.',
      subtitle:
        'Les étudiants en santé ont plus d’angles qu’il n’y paraît. Ce guide aide à trier les options sans transformer la recherche en cours à plein temps.',
      proseBlocks: [
        {
          type: 'p',
          text:
            'Les bourses médicales ne forment pas une seule catégorie. Infirmière, pré-médecine, santé publique et sciences biomédicales ont des chemins distincts.'
        },
        { type: 'h2', text: 'Commencez par votre voie santé réelle' },
        {
          type: 'p',
          text:
            'Erreur courante : ne chercher que « bourses médicales ». Les fournisseurs écrivent pour infirmière, pharmacie, thérapie, santé publique ou médecine rurale.'
        },
        {
          type: 'ul',
          items: [
            'Pré-médecine : bourses science, service et carrière santé.',
            'Infirmière : hôpitaux, associations d’État, fondations locales.',
            'Santé publique : prévention, communauté, politique.',
            'Soins paramédicaux : certification et pénurie de personnel.'
          ]
        },
        { type: 'h2', text: 'D’où viennent souvent les bourses' },
        {
          type: 'p',
          text:
            'Écoles, hôpitaux, associations professionnelles, fondations locales et employeurs ont des fonds que les étudiants manquent s’ils ne cherchent que dans les bases publiques.'
        },
        { type: 'h2', text: 'Alignez votre histoire sur la raison du donateur' },
        {
          type: 'p',
          text:
            'Les comités financent souvent pour main-d’œuvre locale, accès aux soins ou diversité en santé. Votre candidature est plus forte quand elle répond à cette raison.'
        },
        { type: 'h2', text: 'Lisez l’admissibilité sans deviner' },
        {
          type: 'p',
          text:
            '« Inscrit dans un programme accrédité d’infirmière » n’est pas « intéressé par l’infirmière ». Vérifiez niveau, GPA, lieu et documents avant la rédaction.'
        },
        { type: 'h2', text: 'Constituez un dossier de candidature' },
        {
          type: 'p',
          text:
            'Gardez relevé, CV, preuve d’inscription, notes pour lettres et exemples de service ou d’exposition clinique prêts.'
        },
        { type: 'h2', text: 'Écrivez avec preuves, pas slogans' },
        {
          type: 'p',
          text:
            '« Je veux aider les gens » peut être vrai, mais les examinateurs ont besoin d’un moment, d’une population ou d’un problème concret.'
        }
      ],
      links: [
        { href: '/scholarships/category/medical', label: 'Bourses médecine' },
        { href: '/essays', label: 'Guides de rédaction' },
        { href: '/resources/scholarship-deadlines-explained', label: 'Dates expliquées' }
      ],
      faq: [
        {
          question: 'Les bourses médicales sont-elles seulement pour la médecine ?',
          answer:
            'Non. Beaucoup soutiennent infirmière, santé publique, pharmacie, thérapies et autres voies. Lisez l’admissibilité attentivement.'
        },
        {
          question: 'Quels documents préparer en premier ?',
          answer:
            'CV à jour, relevé, preuve d’inscription et liste brève d’expériences cliniques, de service ou de recherche.'
        },
        {
          question: 'Comment éviter de perdre du temps ?',
          answer:
            'Filtrez par filière, niveau, lieu, GPA et pièces avant d’écrire le texte.'
        }
      ],
      endReading: [
        {
          href: '/scholarships/category/medical',
          title: 'Parcourir les bourses médecine',
          blurb: 'comparer les fiches actives par date, admissibilité et exigences'
        },
        {
          href: '/essays',
          title: 'Guides de rédaction pour bourses',
          blurb: 'planifier textes santé, service et objectifs de carrière'
        },
        {
          href: '/resources/scholarship-deadlines-explained',
          title: 'Dates de bourses expliquées',
          blurb: 'organiser relevés, lettres et formulaires'
        }
      ]
    }),
    shellFr('/resources/scholarships-for-international-students-guide', {
      title: 'Bourses pour étudiants internationaux : guide pratique',
      metaDescription:
        'Guide pour internationaux : admissibilité, documents, rédactions, dates et fiches international-friendly.',
      h1: 'Bourses pour étudiants internationaux',
      eyebrow: 'Guide ressources',
      intro:
        'Les internationaux peuvent trouver des bourses, mais la recherche diffère : citoyenneté, visa, école, documents et restrictions de paiement comptent beaucoup.',
      subtitle:
        'Les internationaux peuvent trouver des bourses, mais citoyenneté, visa, admissibilité scolaire, délais documentaires et restrictions de fonds comptent avant d’y passer des heures.',
      proseBlocks: [
        {
          type: 'p',
          text:
            'Chercher des bourses en tant qu’international peut sembler lire des conditions en permanence. L’objectif n’est pas de tout postuler, mais d’identifier les prix où votre statut correspond vraiment.'
        },
        { type: 'h2', text: 'Que signifie international-friendly' },
        {
          type: 'p',
          text:
            'Ce n’est pas garanti. Cela signifie que la fiche peut mériter un examen. Certains fournisseurs ouvrent explicitement ; d’autres exigent une lecture fine de citoyenneté, FAFSA ou numéro de sécurité sociale.'
        },
        { type: 'h2', text: 'Commencez par l’aide de l’école' },
        {
          type: 'p',
          text:
            'Pour beaucoup d’internationaux, les meilleures options commencent à l’université : mérite d’admission, départements, bourses internationales ou assistantats.'
        },
        { type: 'h2', text: 'Séparez aide d’admission et bourses externes' },
        {
          type: 'p',
          text:
            'Le mot bourse couvre des types d’argent et de règles différents. Gardez-les dans des catégories séparées dans vos notes.'
        },
        { type: 'h2', text: 'Vérifiez les règles de paiement' },
        {
          type: 'p',
          text:
            'Un prix peut sembler parfait mais être difficile à utiliser s’il ne paie que des établissements américains ou exige des formulaires fiscaux impossibles à temps.'
        },
        { type: 'h2', text: 'Documents en avance' },
        {
          type: 'p',
          text:
            'Traductions, évaluations de diplômes, preuve d’inscription, passeport ou visa, scores et lettres : demandez les pièces officielles tôt.'
        },
        { type: 'h2', text: 'Textes avec assez de contexte' },
        {
          type: 'p',
          text:
            'Les lecteurs peuvent ne pas connaître votre système scolaire. Expliquez contexte, préparation et objectifs sans faire de chaque texte une histoire de visa sauf si le prompt le demande.'
        }
      ],
      links: [
        { href: '/scholarships/hub/international-friendly', label: 'Bourses international-friendly' },
        { href: '/essays', label: 'Guides de rédaction' },
        { href: '/resources/scholarship-deadlines-explained', label: 'Dates expliquées' }
      ],
      faq: [
        {
          question: 'Les internationaux peuvent-ils postuler aux bourses américaines ?',
          answer:
            'Oui, certaines ouvrent aux non-citoyens ou aux étudiants en visa. Confirmez toujours les règles officielles.'
        },
        {
          question: 'Que vérifier en premier ?',
          answer:
            'Citoyenneté ou résidence, visa ou inscription, écoles admissibles, domaine, niveau, lieu, GPA et exigence FAFSA ou autres formulaires.'
        },
        {
          question: 'Les textes doivent-ils être différents ?',
          answer:
            'Ils doivent répondre au prompt, mais il faut souvent expliquer clairement le parcours éducatif sans dépendre seulement de l’histoire migratoire.'
        }
      ],
      endReading: [
        {
          href: '/scholarships/hub/international-friendly',
          title: 'Bourses international-friendly',
          blurb: 'parcourir des fiches potentiellement pertinentes pour internationaux'
        },
        {
          href: '/essays',
          title: 'Guides de rédaction pour bourses',
          blurb: 'façonner textes sur objectifs, parcours et leadership'
        },
        {
          href: '/resources/scholarship-deadlines-explained',
          title: 'Dates de bourses expliquées',
          blurb: 'planifier fuseaux, documents et dates scolaires'
        }
      ]
    })
  ]);
