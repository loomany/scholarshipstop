import type { ResourcePilotLocaleArticleDef } from '@/lib/i18n/resourcePilot/resourcePilotArticleBuilder';
import type { ResourcePilotSlug } from '@/lib/i18n/resourcePilot/resourcePilotSlugs';

const ST_ES =
  'ScholarshipTop no concede becas ni garantiza ningún premio. Confirma plazos, requisitos y montos en la página oficial del proveedor antes de solicitar.';
const ST_FR =
  'ScholarshipTop n’accorde pas de bourses et ne garantit aucune attribution. Vérifiez dates, critères et montants sur la page officielle du financeur avant de candidater.';

export const PILOT_ARTICLES_CORE: Record<
  ResourcePilotSlug,
  { es: ResourcePilotLocaleArticleDef; fr: ResourcePilotLocaleArticleDef }
> = {
  'avoid-scholarship-scams-targeting-families': {
    es: {
      translated_title: 'Cómo evitar estafas de becas que apuntan a familias',
      translated_meta_title: 'Evitar estafas de becas: guía práctica para padres (EE. UU.)',
      translated_meta_description:
        'Señales de alerta, preguntas que hacer y pasos para verificar becas reales sin pagar tasas sospechosas ni compartir datos innecesarios con desconocidos.',
      translated_summary:
        'Guía práctica para padres que quieren proteger a sus hijos de estafas de becas. Aprende a verificar fuentes oficiales antes de pagar o enviar documentos.',
      sections: [
        {
          h2: 'Señales comunes de estafa',
          paragraphs: [
            'Desconfía de mensajes que prometen una beca “garantizada”, exigen pago inmediato o presionan para compartir datos bancarios o del Seguro Social. Las becas legítimas casi siempre publican criterios claros y una vía de solicitud en un sitio verificable.',
            'Compara el nombre de la organización con registros públicos, con la universidad o con el sitio del proveedor. Si solo existe un formulario genérico sin datos de contacto verificables, detente y busca una segunda fuente.'
          ]
        },
        {
          h2: 'Qué preguntar antes de confiar',
          paragraphs: [
            'Pide el nombre legal del proveedor, la dirección física, el proceso de selección y quién financia el premio. Una beca real puede responder preguntas sin amenazas ni urgencia artificial.',
            'Evita pagar “tasas de procesamiento”, “seguros” o “activación” para recibir fondos. Esas prácticas no sustituyen una revisión oficial de elegibilidad ni un contrato claro del proveedor.'
          ]
        },
        {
          h2: 'Cómo verificar en fuentes oficiales',
          paragraphs: [
            'Abre la página del proveedor desde un enlace que encuentres tú mismo (no desde un correo sospechoso). Revisa requisitos, plazos, documentos y si la solicitud se envía por un portal conocido.',
            'Si la beca menciona una universidad o fundación, confirma el programa en el sitio institucional o llama a la oficina de ayuda financiera usando el número publicado oficialmente.'
          ]
        },
        {
          h2: 'Proteger datos y dinero familiar',
          paragraphs: [
            'No envíes copias de identificación, extractos bancarios ni contraseñas por mensajes no solicitados. Usa cuentas de correo dedicadas al proceso y guarda capturas de lo que prometen.',
            'Habla con tu hijo sobre presión social en redes: muchas estafas imitan perfiles de “mentores” o “agentes”. Un plan familiar de verificación reduce decisiones impulsivas.'
          ]
        },
        {
          h2: 'Recordatorio sobre resultados',
          paragraphs: [
            'Ninguna guía sustituye la revisión directa de reglas del proveedor. Los resultados dependen de elegibilidad, plazos y competencia real del proceso.',
            ST_ES
          ]
        }
      ],
      translated_faq_json: [
        {
          question: '¿Las becas legítimas cobran para “reservar” el premio?',
          answer:
            'En general no. Si te piden pagar para desbloquear fondos, trátalo como alerta y verifica con la organización usando canales oficiales.'
        },
        {
          question: '¿Cómo confirmar que un correo de beca es real?',
          answer:
            'No uses enlaces del mensaje: entra al sitio del proveedor manualmente, compara remitente y dominio, y confirma el proceso en la página oficial.'
        },
        {
          question: '¿ScholarshipTop concede becas a través de esta guía?',
          answer:
            'No. ScholarshipTop publica orientación y enlaces informativos; las becas las otorgan los proveedores según sus propias reglas.'
        }
      ]
    },
    fr: {
      translated_title: 'Comment éviter les arnaques aux bourses visant les familles',
      translated_meta_title: 'Éviter les arnaques aux bourses : guide pour les parents',
      translated_meta_description:
        'Signaux d’alerte, questions à poser et étapes pour vérifier une vraie bourse sans payer de frais suspects ni partager trop de données personnelles.',
      translated_summary:
        'Guide pratique pour les parents qui veulent protéger leur enfant des arnaques liées aux bourses. Apprenez à vérifier les sources officielles avant de payer ou d’envoyer des documents.',
      sections: [
        {
          h2: 'Signaux d’arnaque fréquents',
          paragraphs: [
            'Méfiez-vous des messages promettant une bourse « garantie », exigeant un paiement immédiat ou poussant à partager des coordonnées bancaires ou un numéro d’identité. Les bourses légitimes publient en principe des critères clairs et une procédure sur un site vérifiable.',
            'Comparez le nom de l’organisme avec des registres publics, l’université ou le site du financeur. S’il n’existe qu’un formulaire générique sans contact vérifiable, arrêtez-vous et cherchez une seconde source.'
          ]
        },
        {
          h2: 'Questions à poser avant de faire confiance',
          paragraphs: [
            'Demandez la raison sociale, l’adresse, le mode de sélection et qui finance la bourse. Un programme réel peut répondre sans menaces ni urgence artificielle.',
            'Évitez les « frais de dossier », « assurances » ou « activation » pour recevoir des fonds. Ces pratiques ne remplacent pas une vérification officielle de l’éligibilité.'
          ]
        },
        {
          h2: 'Vérifier via des sources officielles',
          paragraphs: [
            'Ouvrez le site du financeur via un lien que vous trouvez vous-même (pas depuis un e-mail douteux). Lisez critères, dates, pièces et canal de candidature.',
            'Si la bourse cite une université ou une fondation, confirmez le programme sur le site institutionnel ou contactez le service d’aide financière via le numéro officiel.'
          ]
        },
        {
          h2: 'Protéger données et budget familial',
          paragraphs: [
            'N’envoyez pas de pièces d’identité, relevés bancaires ni mots de passe via messages non sollicités. Utilisez une adresse e-mail dédiée et conservez des traces des promesses.',
            'Parlez avec votre enfant de la pression sur les réseaux : beaucoup d’arnaques imitent des « coachs ». Un plan familial de vérification limite les décisions impulsives.'
          ]
        },
        {
          h2: 'Rappel sur les résultats',
          paragraphs: [
            'Aucun guide ne remplace la lecture des règles du financeur. Les résultats dépendent de l’éligibilité, des dates et de la concurrence réelle.',
            ST_FR
          ]
        }
      ],
      translated_faq_json: [
        {
          question: 'Une bourse légitime demande-t-elle de payer pour « réserver » le prix ?',
          answer:
            'En règle générale, non. Si l’on exige un paiement pour débloquer des fonds, considérez cela comme un signal et vérifiez via les canaux officiels.'
        },
        {
          question: 'Comment confirmer qu’un e-mail de bourse est authentique ?',
          answer:
            'N’utilisez pas les liens du message : allez sur le site du financeur manuellement, comparez l’expéditeur et le domaine, puis validez la procédure sur la page officielle.'
        },
        {
          question: 'ScholarshipTop accorde-t-il des bourses via ce guide ?',
          answer:
            'Non. ScholarshipTop publie des conseils et des liens informatifs ; les bourses sont attribuées par les financeurs selon leurs propres règles.'
        }
      ]
    }
  },

  'types-of-scholarships-usa-explained': {
    es: {
      translated_title: 'Tipos de becas en EE. UU. explicados',
      translated_meta_title: 'Tipos de becas en EE. UU. explicados: guía para estudiantes',
      translated_meta_description:
        'Merito, necesidad, deportes, estudios, comunidad y más: entiende categorías comunes de becas en EE. UU. y cómo comparar requisitos en fuentes oficiales.',
      translated_summary:
        'Resumen claro de las categorías de becas más habituales en Estados Unidos y cómo evaluar cada una según tu perfil, sin prometer resultados.',
      sections: [
        {
          h2: 'Becas por mérito académico',
          paragraphs: [
            'Suelen valorar GPA, rigor del currículo, pruebas estandarizadas o logros académicos. Revisa si el proveedor exige un mínimo concreto o un ranking interno.',
            'No asumas elegibilidad solo por buenas notas: muchas becas combinan mérito con ensayo, actividades o campo de estudio. Confirma criterios en la página oficial.'
          ]
        },
        {
          h2: 'Becas por necesidad económica',
          paragraphs: [
            'Se orientan a familias con limitaciones financieras y pueden requerir FAFSA u otros formularios. Los montos y renovaciones dependen del proveedor.',
            'Compara cómo calculan la necesidad y si la beca es única o renovable cada año. Guarda copias de lo enviado y fechas límite oficiales.'
          ]
        },
        {
          h2: 'Becas por talento, deporte o servicio',
          paragraphs: [
            'Incluyen artes, atletismo, liderazgo comunitario o trayectorias específicas. Suelen pedir portafolio, estadísticas o cartas que describan impacto real.',
            'Verifica reglas de elegibilidad deportiva o artística en la liga o institución correspondiente, no solo en resúmenes de terceros.'
          ]
        },
        {
          h2: 'Becas locales, corporativas y de fundaciones',
          paragraphs: [
            'Pueden tener menos competencia que becas nacionales masivas, pero plazos y documentos varían. Busca proveedores con historial público y contacto verificable.',
            'Lee si la beca se paga a la institución o al estudiante y qué ocurre si cambias de programa o te matriculas a tiempo parcial.'
          ]
        },
        {
          h2: 'Cómo priorizar sin promesas',
          paragraphs: [
            'Haz una lista por encaje (elegibilidad + esfuerzo de solicitud + plazo) en lugar de perseguir solo el monto anunciado. Un plan realista reduce errores.',
            ST_ES
          ]
        }
      ],
      translated_faq_json: [
        {
          question: '¿Una beca “completa” cubre siempre todo el costo?',
          answer:
            'Depende del proveedor. Algunas cubren matrícula y gastos; otras son parciales. Lee la definición oficial del premio y qué gastos incluye.'
        },
        {
          question: '¿Puedo solicitar varios tipos a la vez?',
          answer:
            'Sí, si cumples requisitos de cada una y respetas reglas de acumulación del proveedor o de tu universidad. Verifica políticas de “stacking”.'
        },
        {
          question: '¿ScholarshipTop otorga estos tipos de becas?',
          answer:
            'No. Esta guía explica categorías; los fondos los define y paga cada proveedor según sus reglas publicadas.'
        }
      ]
    },
    fr: {
      translated_title: 'Types de bourses aux États-Unis expliqués',
      translated_meta_title: 'Types de bourses aux États-Unis : guide pour étudiants',
      translated_meta_description:
        'Mérite, besoin financier, sport, études, engagement communautaire : comprenez les catégories courantes et comparez les critères sur les pages officielles.',
      translated_summary:
        'Panorama des principales catégories de bourses aux États-Unis et façon de les évaluer selon votre profil, sans promesse de résultat.',
      sections: [
        {
          h2: 'Bourses au mérite académique',
          paragraphs: [
            'Elles valorisent souvent le GPA, la rigueur du cursus, les tests standardisés ou les distinctions. Vérifiez les seuils précis du financeur.',
            'Ne présumez pas l’éligibilité sur la seule base de bonnes notes : beaucoup de programmes combinent mérite, essai, activités ou filière. Lisez les critères officiels.'
          ]
        },
        {
          h2: 'Bourses selon les besoins financiers',
          paragraphs: [
            'Elles ciblent les familles avec contraintes budgétaires et peuvent exiger FAFSA ou d’autres formulaires. Montants et renouvellements varient.',
            'Comparez le calcul du besoin et si la bourse est unique ou renouvelable. Conservez copies des envois et dates limites officielles.'
          ]
        },
        {
          h2: 'Bourses talent, sport ou engagement',
          paragraphs: [
            'Arts, sport, leadership ou parcours spécifiques : portfolio, statistiques ou lettres décrivant un impact concret sont fréquents.',
            'Validez l’éligibilité sportive ou artistique auprès de la ligue ou de l’institution concernée, pas seulement via des résumés tiers.'
          ]
        },
        {
          h2: 'Bourses locales, d’entreprises et fondations',
          paragraphs: [
            'Parfois moins concurrentielles que les programmes nationaux massifs, mais dates et pièces diffèrent. Privilégiez des financeurs vérifiables.',
            'Lisez si le versement va à l’établissement ou à l’étudiant et ce qui se passe en cas de changement de programme ou de temps partiel.'
          ]
        },
        {
          h2: 'Prioriser sans promesses',
          paragraphs: [
            'Classez par adéquation (éligibilité + effort de dossier + date) plutôt que par le montant affiché seul. Un plan réaliste limite les erreurs.',
            ST_FR
          ]
        }
      ],
      translated_faq_json: [
        {
          question: 'Une bourse « complète » couvre-t-elle toujours tous les coûts ?',
          answer:
            'Cela dépend du financeur. Certaines couvrent frais de scolarité et dépenses ; d’autres sont partielles. Lisez la définition officielle du prix.'
        },
        {
          question: 'Puis-je candidater à plusieurs types en parallèle ?',
          answer:
            'Oui, si vous respectez chaque critère et les règles de cumul du financeur ou de votre université. Vérifiez les politiques de combinaison.'
        },
        {
          question: 'ScholarshipTop attribue-t-il ces types de bourses ?',
          answer:
            'Non. Ce guide décrit des catégories ; les fonds sont définis et versés par chaque financeur selon ses règles publiées.'
        }
      ]
    }
  },

  'how-to-write-a-winning-scholarship-essay': {
    es: {
      translated_title: 'Cómo escribir un ensayo de beca convincente',
      translated_meta_title: 'Ensayo de beca ganador: estructura, consejos y errores clave',
      translated_meta_description:
        'Aprende a planificar, estructurar y revisar un ensayo de beca con ejemplos concretos de tu experiencia. Sin prometer premios: verifica requisitos oficiales.',
      translated_summary:
        'Consejos prácticos de estructura, voz auténtica y revisión para ensayos de beca. Complementa tu solicitud verificando criterios en la página del proveedor.',
      sections: [
        {
          h2: 'Entender la pregunta del proveedor',
          paragraphs: [
            'Subraya verbos clave (describe, explica, reflexiona) y el límite de palabras. Un ensayo fuerte responde a la consigna, no solo lista logros.',
            'Si la beca valora un tema (liderazgo, resiliencia, servicio), elige un ejemplo específico con inicio, conflicto y resultado medible cuando sea posible.'
          ]
        },
        {
          h2: 'Estructura que facilita la lectura',
          paragraphs: [
            'Abre con una escena o idea central en lugar de frases genéricas. Desarrolla un arco: contexto, acción, aprendizaje y vínculo con tus metas académicas.',
            'Cierra mostrando cómo la beca encaja con tu trayectoria futura, sin exagerar ni inventar impacto. La claridad suele pesar más que adjetivos vacíos.'
          ]
        },
        {
          h2: 'Voz auténtica y detalles concretos',
          paragraphs: [
            'Usa verbos activos y datos verificables (horas, roles, resultados). Evita clichés como “soy apasionado” sin evidencia detrás.',
            'Si mencionas dificultades, enfócate en lo que hiciste y qué aprendiste, respetando tu privacidad y el tono del proveedor.'
          ]
        },
        {
          h2: 'Revisión antes de enviar',
          paragraphs: [
            'Lee en voz alta, recorta repeticiones y confirma el conteo de palabras. Pide a alguien de confianza que señale partes confusas, no que reescriba tu historia.',
            'Comprueba nombre del archivo, formato y portal de envío en las instrucciones oficiales; un ensayo excelente puede descartarse por un error administrativo.'
          ]
        },
        {
          h2: 'Expectativas realistas',
          paragraphs: [
            'Un buen ensayo mejora tu presentación, pero no garantiza selección. Los comités consideran elegibilidad, cupos y criterios que no siempre son públicos.',
            ST_ES
          ]
        }
      ],
      translated_faq_json: [
        {
          question: '¿Debo usar IA para redactar el ensayo?',
          answer:
            'Muchos proveedores exigen trabajo original. Usa herramientas solo para lluvia de ideas o revisión de claridad, manteniendo tu voz y hechos verificables.'
        },
        {
          question: '¿Cuántas versiones necesito?',
          answer:
            'Al menos una versión completa más una pasada de recorte y otra de corrección. Adapta ejemplos cuando reutilices ensayos para otras becas.'
        },
        {
          question: '¿ScholarshipTop evalúa o premia ensayos?',
          answer:
            'No. ScholarshipTop no concede becas; la evaluación la realiza cada proveedor según sus reglas.'
        }
      ]
    },
    fr: {
      translated_title: 'Comment rédiger un essai de bourse convaincant',
      translated_meta_title: 'Essai de bourse : structure, conseils et erreurs à éviter',
      translated_meta_description:
        'Planifiez, structurez et relisez un essai avec des exemples concrets de votre parcours. Sans promesse de prix : vérifiez les exigences officielles.',
      translated_summary:
        'Conseils pratiques de structure, voix authentique et relecture pour les essais de bourse. Complétez votre dossier en validant les critères sur le site du financeur.',
      sections: [
        {
          h2: 'Comprendre la question du financeur',
          paragraphs: [
            'Soulignez les verbes clés et la limite de mots. Un bon essai répond à la consigne, pas seulement à une liste de réussites.',
            'Si le thème est leadership, résilience ou service, choisissez un exemple précis avec contexte, action et résultat mesurable quand c’est possible.'
          ]
        },
        {
          h2: 'Structure lisible pour le jury',
          paragraphs: [
            'Ouvrez par une scène ou une idée centrale plutôt que des formules génériques. Développez contexte, action, apprentissage et lien avec vos objectifs.',
            'Concluez en montrant pourquoi la bourse correspond à votre trajectoire, sans exagération. La clarté compte souvent plus que les adjectifs vides.'
          ]
        },
        {
          h2: 'Voix authentique et détails concrets',
          paragraphs: [
            'Employez des verbes actifs et des faits vérifiables (heures, rôles, résultats). Évitez les clichés sans preuve.',
            'Si vous évoquez des difficultés, concentrez-vous sur vos actions et apprentissages, en respectant votre vie privée et le ton attendu.'
          ]
        },
        {
          h2: 'Relecture avant envoi',
          paragraphs: [
            'Lisez à voix haute, coupez les répétitions et vérifiez le nombre de mots. Demandez un retour sur la clarté, pas une réécriture complète.',
            'Contrôlez nom de fichier, format et portail officiel ; un excellent texte peut être rejeté pour une erreur administrative.'
          ]
        },
        {
          h2: 'Attentes réalistes',
          paragraphs: [
            'Un bon essai améliore votre dossier, sans garantir la sélection. Les jurys tiennent compte d’éligibilité, de quotas et de critères non toujours publics.',
            ST_FR
          ]
        }
      ],
      translated_faq_json: [
        {
          question: 'Dois-je utiliser l’IA pour rédiger l’essai ?',
          answer:
            'De nombreux financeurs exigent un travail original. Utilisez l’IA pour brainstormer ou clarifier, en gardant votre voix et des faits vérifiables.'
        },
        {
          question: 'Combien de versions faut-il ?',
          answer:
            'Au minimum une version complète, une passe de coupe et une de correction. Adaptez les exemples si vous réutilisez un texte pour d’autres bourses.'
        },
        {
          question: 'ScholarshipTop note-t-il ou attribue-t-il des essais ?',
          answer:
            'Non. ScholarshipTop n’accorde pas de bourses ; l’évaluation relève de chaque financeur.'
        }
      ]
    }
  },

  'how-to-proofread-scholarship-essay': {
    es: {
      translated_title: 'Cómo revisar un ensayo de beca antes de enviarlo',
      translated_meta_title: 'Revisar ensayo de beca antes de enviar: guía paso a paso',
      translated_meta_description:
        'Lista de revisión para claridad, gramática, tono y cumplimiento de la consigna. Mejora tu borrador sin inventar hechos ni prometer resultados.',
      translated_summary:
        'Proceso paso a paso para corregir ensayos de beca: contenido, estilo y formato. Siempre contrasta requisitos finales con la página oficial del proveedor.',
      sections: [
        {
          h2: 'Primera pasada: contenido y consigna',
          paragraphs: [
            'Comprueba que cada párrafo responde a la pregunta y que no hay tangentes largas. Marca afirmaciones que necesiten ejemplo o dato verificable.',
            'Elimina repeticiones de logros ya listados en el formulario; el ensayo debe aportar contexto y reflexión, no duplicar la solicitud.'
          ]
        },
        {
          h2: 'Segunda pasada: claridad y tono',
          paragraphs: [
            'Acorta oraciones largas y sustituye palabras vagas por acciones concretas. Mantén un tono respetuoso y profesional acorde al proveedor.',
            'Evita sarcasmo, jerga excesiva o humor que pueda malinterpretarse en una lectura rápida del comité.'
          ]
        },
        {
          h2: 'Tercera pasada: gramática y estilo',
          paragraphs: [
            'Usa corrector con cuidado: no aceptes cambios que alteren tu significado. Revisa concordancia, tiempos verbales y puntuación en párrafos clave.',
            'Si escribes en un segundo idioma, pide revisión de un hablante nativo solo para errores graves, conservando tu voz.'
          ]
        },
        {
          h2: 'Control final de formato',
          paragraphs: [
            'Verifica límite de palabras, fuente, márgenes y nombre de archivo según instrucciones oficiales. Un error de formato puede invalidar un buen texto.',
            'Exporta o sube una copia de respaldo con fecha en tu carpeta de solicitudes.'
          ]
        },
        {
          h2: 'Recordatorio',
          paragraphs: [
            'La revisión reduce errores evitables, pero no sustituye elegibilidad ni criterios del proveedor.',
            ST_ES
          ]
        }
      ],
      translated_faq_json: [
        {
          question: '¿Cuánto tiempo dejar entre borrador y revisión?',
          answer:
            'Idealmente 24 horas si el plazo lo permite. La distancia ayuda a detectar frases confusas que antes parecían claras.'
        },
        {
          question: '¿Puede otra persona reescribir mi ensayo?',
          answer:
            'Mejor que señale confusiones. Un texto que no suena a ti puede perder autenticidad; además, muchas becas exigen trabajo original.'
        },
        {
          question: '¿ScholarshipTop revisa ensayos por los estudiantes?',
          answer:
            'No. ScholarshipTop ofrece guías informativas; la evaluación la hace cada proveedor.'
        }
      ]
    },
    fr: {
      translated_title: 'Comment relire un essai de bourse avant envoi',
      translated_meta_title: 'Relire un essai de bourse avant envoi : guide pas à pas',
      translated_meta_description:
        'Checklist clarté, grammaire, ton et respect du sujet. Améliorez votre brouillon sans inventer de faits ni promettre de résultats. Info útil.',
      translated_summary:
        'Processus étape par étape pour corriger un essai de bourse : fond, style et format. Comparez toujours les exigences finales avec la page officielle.',
      sections: [
        {
          h2: 'Première passe : fond et consigne',
          paragraphs: [
            'Vérifiez que chaque paragraphe répond à la question sans digressions longues. Signalez les affirmations qui manquent d’exemple ou de preuve.',
            'Supprimez les répétitions déjà présentes dans le formulaire ; l’essai doit apporter contexte et réflexion.'
          ]
        },
        {
          h2: 'Deuxième passe : clarté et ton',
          paragraphs: [
            'Raccourcissez les phrases lourdes et remplacez les mots vagues par des actions concrètes. Gardez un ton respectueux adapté au financeur.',
            'Évitez sarcasme, jargon excessif ou humour risquant une mauvaise lecture rapide par le jury.'
          ]
        },
        {
          h2: 'Troisième passe : grammaire et style',
          paragraphs: [
            'Utilisez un correcteur avec prudence : ne changez pas le sens. Relisez accords, temps et ponctuation des passages clés.',
            'Si vous écrivez dans une langue seconde, demandez une relecture ciblée sans perdre votre voix.'
          ]
        },
        {
          h2: 'Contrôle format final',
          paragraphs: [
            'Validez limite de mots, police, marges et nom de fichier selon les consignes officielles. Une erreur de format peut invalider un bon texte.',
            'Conservez une copie de secours datée dans votre dossier de candidatures.'
          ]
        },
        {
          h2: 'Rappel',
          paragraphs: [
            'La relecture limite les erreurs évitables, mais ne remplace pas l’éligibilité ni les critères du financeur.',
            ST_FR
          ]
        }
      ],
      translated_faq_json: [
        {
          question: 'Combien de temps attendre entre brouillon et relecture ?',
          answer:
            'Idéalement 24 heures si le délai le permet. L’écart aide à repérer les phrases confuses.'
        },
        {
          question: 'Quelqu’un d’autre peut-il réécrire mon essai ?',
          answer:
            'Mieux vaut des retours sur la clarté. Un texte qui ne vous ressemble pas peut nuire ; beaucoup de programmes exigent un travail original.'
        },
        {
          question: 'ScholarshipTop relit-il les essais des étudiants ?',
          answer:
            'Non. ScholarshipTop publie des guides ; l’évaluation appartient à chaque financeur.'
        }
      ]
    }
  },

  'how-to-write-a-thank-you-letter-after-winning-a-scholarship': {
    es: {
      translated_title: 'Cómo escribir una carta de agradecimiento tras ganar una beca',
      translated_meta_title: 'Carta de agradecimiento tras una beca: cómo redactarla bien',
      translated_meta_description:
        'Plantilla mental para agradecer a donantes o comités con tono profesional, ejemplos concretos y plazos razonables. Verifica instrucciones oficiales del prove…',
      translated_summary:
        'Pasos para redactar una carta de agradecimiento sincera después de una beca. Confirma si el proveedor exige formato, plazo o canal de envío específico.',
      sections: [
        {
          h2: 'Cuándo enviar la carta',
          paragraphs: [
            'Muchos proveedores indican un plazo tras la notificación. Si no hay guía, envía dentro de dos semanas con un tono puntual y breve.',
            'Guarda copia de lo enviado y de cualquier acuse del portal o correo oficial.'
          ]
        },
        {
          h2: 'Estructura recomendada',
          paragraphs: [
            'Saludo formal, agradecimiento explícito, párrafo sobre cómo usarás la beca (estudios, metas), y cierre con disposición a mantener buen rendimiento si aplica.',
            'Menciona un detalle concreto del programa o misión del proveedor para mostrar que leíste sus materiales, sin lenguaje exagerado.'
          ]
        },
        {
          h2: 'Tono y errores a evitar',
          paragraphs: [
            'Sé conciso: una página suele bastar. Evita pedir más fondos en la misma carta salvo que el proveedor lo invite expresamente.',
            'Revisa nombres del comité, fundación y ortografía. Un error de destinatario resta profesionalismo.'
          ]
        },
        {
          h2: 'Entrega y privacidad',
          paragraphs: [
            'Usa el canal indicado (correo, portal, correo postal). No publiques datos sensibles en redes si el proveedor pide discreción.',
            'Si la beca es anónima, sigue las instrucciones sobre cómo dirigir el mensaje sin identificar donantes indebidamente.'
          ]
        },
        {
          h2: 'Recordatorio',
          paragraphs: [
            'La carta refuerza relación y cortesía; no modifica por sí sola montos ni renovaciones. Consulta reglas oficiales de mantenimiento de la beca.',
            ST_ES
          ]
        }
      ],
      translated_faq_json: [
        {
          question: '¿Puedo enviar un correo en lugar de carta física?',
          answer:
            'Depende del proveedor. Sigue el canal publicado en la carta de adjudicación o en la página oficial del programa.'
        },
        {
          question: '¿Debo incluir mi historial académico completo?',
          answer:
            'No suele ser necesario. Prioriza gratitud breve e impacto previsto en tus estudios, salvo que pidan un informe formal aparte.'
        },
        {
          question: '¿ScholarshipTop recibe estas cartas?',
          answer:
            'No. ScholarshipTop no administra becas; envía la carta al proveedor o comité indicado en tu notificación oficial.'
        }
      ]
    },
    fr: {
      translated_title: 'Comment écrire un mot de remerciement après une bourse',
      translated_meta_title: 'Remerciement après une bourse : guide de rédaction clair',
      translated_meta_description:
        'Structure pour remercier donateurs ou jurys avec ton professionnel et exemples concrets. Vérifiez format, délai et canal indiqués par le financeur.',
      translated_summary:
        'Étapes pour rédiger un remerciement sincère après l’attribution d’une bourse. Confirmez si un format, délai ou canal spécifique est exigé.',
      sections: [
        {
          h2: 'Quand envoyer le message',
          paragraphs: [
            'Beaucoup de financeurs précisent un délai après la notification. Sans consigne, envoyez sous deux semaines, de façon brève et ponctuelle.',
            'Conservez une copie de l’envoi et de tout accusé du portail ou e-mail officiel.'
          ]
        },
        {
          h2: 'Structure recommandée',
          paragraphs: [
            'Formule d’appel, remerciement explicite, paragraphe sur l’usage prévu de la bourse (études, objectifs), clôture avec engagement sérieux si pertinent.',
            'Citez un élément concret de la mission du financeur pour montrer que vous avez lu ses documents, sans flatterie excessive.'
          ]
        },
        {
          h2: 'Ton et erreurs à éviter',
          paragraphs: [
            'Restez concis : une page suffit souvent. N’y demandez pas plus de fonds sauf invitation expresse du programme.',
            'Relisez noms du comité, fondation et orthographe. Une erreur de destinataire nuit à l’image professionnelle.'
          ]
        },
        {
          h2: 'Envoi et confidentialité',
          paragraphs: [
            'Utilisez le canal indiqué (e-mail, portail, courrier). Ne publiez pas de données sensibles si le financeur demande de la discrétion.',
            'Pour les bourses anonymes, suivez les consignes sur l’adressage sans révéler indeûment les donateurs.'
          ]
        },
        {
          h2: 'Rappel',
          paragraphs: [
            'Le remerciement renforce la courtoisie ; il ne modifie pas seul montants ou renouvellements. Lisez les règles officielles de maintien de la bourse.',
            ST_FR
          ]
        }
      ],
      translated_faq_json: [
        {
          question: 'Un e-mail suffit-il à la place du courrier ?',
          answer:
            'Cela dépend du financeur. Suivez le canal indiqué dans la lettre d’attribution ou sur la page officielle.'
        },
        {
          question: 'Dois-je joindre tout mon historique académique ?',
          answer:
            'Rarement. Privilégiez un message court et l’impact prévu sur vos études, sauf demande formelle séparée.'
        },
        {
          question: 'ScholarshipTop reçoit-il ces remerciements ?',
          answer:
            'Non. ScholarshipTop n’administre pas de bourses ; adressez le message au financeur ou comité de votre notification officielle.'
        }
      ]
    }
  },

  'how-to-get-recommendation-letters-for-scholarships': {
    es: {
      translated_title: 'Cómo conseguir cartas de recomendación para becas',
      translated_meta_title: 'Cartas de recomendación para becas: guía completa y práctica',
      translated_meta_description:
        'Elige referentes, prepara un brief útil y da plazos realistas para cartas alineadas con cada beca. Verifica requisitos y formato en la página oficial del pro…',
      translated_summary:
        'Guía para solicitar cartas de recomendación útiles y a tiempo. Cada beca define quién puede escribir y cómo enviarlas: confirma instrucciones oficiales.',
      sections: [
        {
          h2: 'Elegir a las personas adecuadas',
          paragraphs: [
            'Prioriza quienes te conocen en contexto académico, laboral o de servicio y pueden dar ejemplos concretos. Evita cartas genéricas de figuras famosas sin relación contigo.',
            'Revisa si la beca exige profesor, mentor, empleador o combinación. Algunas limitan reutilizar el mismo autor en varios programas.'
          ]
        },
        {
          h2: 'Preparar un brief claro',
          paragraphs: [
            'Comparte plazo, enlace oficial, consigna del ensayo y tres logros verificables. Indica por qué solicitas esa beca en particular.',
            'Facilita un borrador de logros o CV para ahorrar tiempo, sin presionar. Un brief ordenado suele mejorar la calidad de la carta.'
          ]
        },
        {
          h2: 'Plazos y seguimiento respetuoso',
          paragraphs: [
            'Pide con al menos dos a tres semanas de margen. Envía recordatorio amable solo si el plazo oficial se acerca y el referente aceptó ayudar.',
            'Confirma si la carta se sube al portal, se envía por correo sellado o llega por correo institucional del referente.'
          ]
        },
        {
          h2: 'Calidad y ética',
          paragraphs: [
            'No pidas que inventen experiencias. Las cartas deben ser honestas y específicas; los comités detectan plantillas vacías.',
            'Agradece siempre y comparte resultado si es apropiado, sin obligar al referente a divulgar información privada.'
          ]
        },
        { h2: 'Recordatorio', paragraphs: ['Las cartas apoyan tu perfil, pero no garantizan selección.', ST_ES] }
      ],
      translated_faq_json: [
        { question: '¿Cuántas cartas necesito?', answer: 'Depende de cada beca. Lee el número y tipo de referentes en las instrucciones oficiales.' },
        { question: '¿Puedo reutilizar la misma carta?', answer: 'Solo si el proveedor lo permite y el contenido sigue siendo relevante. Muchas becas prefieren cartas adaptadas.' },
        { question: '¿ScholarshipTop emite cartas?', answer: 'No. ScholarshipTop no participa en tu solicitud; las cartas las escriben tus referentes.' }
      ]
    },
    fr: {
      translated_title: 'Obtenir des lettres de recommandation pour les bourses',
      translated_meta_title: 'Lettres de recommandation pour bourses : guide complet',
      translated_meta_description:
        'Choisissez des référents, préparez un brief utile et fixez des délais réalistes alignés sur chaque bourse. Vérifiez format et envoi sur la page officielle.',
      translated_summary:
        'Guide pour demander des recommandations utiles et à temps. Chaque bourse définit qui peut écrire et comment envoyer : lisez les consignes officielles.',
      sections: [
        {
          h2: 'Choisir les bonnes personnes',
          paragraphs: [
            'Privilégiez ceux qui vous connaissent en contexte scolaire, professionnel ou associatif avec des exemples concrets. Évitez les lettres génériques sans lien réel.',
            'Vérifiez si le programme exige enseignant, mentor, employeur ou mix. Certaines limitent la réutilisation du même auteur.'
          ]
        },
        {
          h2: 'Préparer un brief clair',
          paragraphs: [
            'Partagez date limite, lien officiel, sujet d’essai et trois réalisations vérifiables. Expliquez pourquoi vous visez cette bourse.',
            'Fournissez CV ou liste de faits pour gagner du temps, sans pression. Un brief structuré améliore souvent la lettre.'
          ]
        },
        {
          h2: 'Délais et relance respectueuse',
          paragraphs: [
            'Demandez au moins deux à trois semaines à l’avance. Relancez poliment seulement si la date officielle approche et que la personne a accepté.',
            'Confirmez si la lettre se dépose sur un portail, s’envoie scellée ou part d’une adresse institutionnelle.'
          ]
        },
        {
          h2: 'Qualité et éthique',
          paragraphs: [
            'Ne demandez pas d’inventer des faits. Les lettres doivent être honnêtes et précises ; les jurys repèrent les modèles vides.',
            'Remerciez toujours et partagez l’issue si approprié, sans forcer la divulgation d’informations privées.'
          ]
        },
        { h2: 'Rappel', paragraphs: ['Les lettres soutiennent le dossier sans garantir la sélection.', ST_FR] }
      ],
      translated_faq_json: [
        { question: 'Combien de lettres faut-il ?', answer: 'Cela dépend de chaque bourse. Lisez le nombre et le type de référents dans les consignes officielles.' },
        { question: 'Puis-je réutiliser la même lettre ?', answer: 'Seulement si le financeur l’autorise et que le contenu reste pertinent. Beaucoup préfèrent des lettres adaptées.' },
        { question: 'ScholarshipTop fournit-il des lettres ?', answer: 'Non. ScholarshipTop n’intervient pas dans votre dossier ; les lettres viennent de vos référents.' }
      ]
    }
  },

  'four-year-scholarship-plan-college': {
    es: {
      translated_title: 'Plan de becas de cuatro años para la universidad',
      translated_meta_title: 'Plan de becas de 4 años antes de la universidad en EE. UU.',
      translated_meta_description:
        'Organiza becas por curso escolar, plazos y esfuerzo de solicitud. Construye un plan realista sin prometer fondos: verifica cada oportunidad en fuentes oficia…',
      translated_summary:
        'Marco para estudiantes de secundaria que quieren repartir la búsqueda de becas entre los cuatro años previos a la universidad.',
      sections: [
        {
          h2: 'Primer año: exploración y hábitos',
          paragraphs: [
            'Aprende tipos de becas, guarda un calendario básico y registra actividades con impacto medible. Evita solicitar programas para los que aún no eres elegible.',
            'Prioriza buenas notas y cursos alineados con metas; muchas becas futuras miran trayectoria consistente.'
          ]
        },
        {
          h2: 'Segundo y tercer año: enfoque',
          paragraphs: [
            'Identifica 10–20 becas con encaje real y prepara borradores de ensayo reutilizables con adaptación. Pide cartas con antelación para programas grandes.',
            'Registra plazos por trimestre y separa “alta prioridad” de “si hay tiempo”.'
          ]
        },
        {
          h2: 'Cuarto año: ejecución',
          paragraphs: [
            'Completa FAFSA u otros formularios según instrucciones oficiales de tu situación. Envía solicitudes con margen antes del cierre del portal.',
            'Evita saturarte la última semana: errores de archivo y ensayo apresurado son frecuentes.'
          ]
        },
        {
          h2: 'Revisión trimestral del plan',
          paragraphs: [
            'Cada trimestre, elimina becas donde ya no cumples requisitos y añade nuevas verificadas. Ajusta esfuerzo según resultados parciales, sin desanimarte por rechazos normales.',
            'Habla con orientación escolar o ayuda financiera universitaria usando canales oficiales.'
          ]
        },
        { h2: 'Recordatorio', paragraphs: ['Un plan ordena el trabajo; no garantiza montos ni admisiones.', ST_ES] }
      ],
      translated_faq_json: [
        { question: '¿Debo empezar en primer año de secundaria?', answer: 'Sí, con hábitos y registro de actividades. Las solicitudes intensivas suelen concentrarse en el último año o antes.' },
        { question: '¿Cuántas becas debo tener como meta?', answer: 'Mejor pocas bien alineadas que muchas genéricas. Ajusta según tiempo real y plazos oficiales.' },
        { question: '¿ScholarshipTop financia el plan?', answer: 'No. ScholarshipTop ayuda a organizar información; los fondos los define cada proveedor.' }
      ]
    },
    fr: {
      translated_title: 'Plan bourses sur quatre ans avant l’université',
      translated_meta_title: 'Plan bourses sur quatre ans avant l’université aux USA',
      translated_meta_description:
        'Organisez les bourses par année scolaire, dates et effort de dossier. Plan réaliste sans promesse de fonds : vérifiez chaque offre sur les sources officielles.',
      translated_summary:
        'Cadre pour les lycéens qui veulent étaler la recherche de bourses sur les quatre années précédant l’entrée à l’université.',
      sections: [
        {
          h2: 'Première année : exploration',
          paragraphs: [
            'Découvrez les types de bourses, tenez un calendrier simple et notez activités à impact mesurable. Évitez les programmes où vous n’êtes pas encore éligible.',
            'Priorisez un parcours cohérent ; beaucoup de bourses futures regardent la régularité.'
          ]
        },
        {
          h2: 'Deuxième et troisième année : ciblage',
          paragraphs: [
            'Listez 10–20 bourses réalistes et préparez des brouillons d’essais adaptables. Anticipez les lettres pour les grands programmes.',
            'Classez les dates par trimestre et séparez priorité haute et optionnel.'
          ]
        },
        {
          h2: 'Dernière année : exécution',
          paragraphs: [
            'Complétez FAFSA ou formulaires requis selon votre situation officielle. Envoyez les dossiers avant la fermeture des portails.',
            'Évitez la surcharge de la dernière semaine : erreurs de fichier et essais bâclés sont fréquents.'
          ]
        },
        {
          h2: 'Revue trimestrielle',
          paragraphs: [
            'Chaque trimestre, retirez les offres non éligibles et ajoutez des sources vérifiées. Ajustez l’effort après les refus normaux du processus.',
            'Échangez avec l’orientation ou l’aide financière via canaux officiels.'
          ]
        },
        { h2: 'Rappel', paragraphs: ['Un plan structure le travail sans garantir montants ni admissions.', ST_FR] }
      ],
      translated_faq_json: [
        { question: 'Faut-il commencer dès la seconde ?', answer: 'Oui, par les habitudes et le suivi d’activités. Les candidatures intenses viennent souvent en terminale.' },
        { question: 'Combien de bourses viser ?', answer: 'Mieux vaut peu de dossiers bien ciblés que beaucoup de candidatures génériques.' },
        { question: 'ScholarshipTop finance-t-il ce plan ?', answer: 'Non. ScholarshipTop organise l’information ; les fonds relèvent de chaque financeur.' }
      ]
    }
  },

  'track-scholarship-deadlines-usa': {
    es: {
      translated_title: 'Cómo hacer seguimiento de plazos de becas en EE. UU.',
      translated_meta_title: 'Seguimiento de plazos de becas en EE. UU.: método organizado',
      translated_meta_description:
        'Calendario, recordatorios y verificación de fechas oficiales para no perder becas por error de zona horaria o portal. Sin prometer resultados.',
      translated_summary:
        'Métodos prácticos para registrar y revisar plazos de becas en Estados Unidos usando siempre la fecha publicada por el proveedor.',
      sections: [
        {
          h2: 'Registrar fechas oficiales',
          paragraphs: [
            'Copia plazo, zona horaria y canal de envío desde la página del proveedor, no desde resúmenes de terceros. Guarda captura o enlace guardado en tu carpeta.',
            'Distingue “fecha límite de solicitud” de “fecha de notificación” o de materiales suplementarios.'
          ]
        },
        {
          h2: 'Calendario y recordatorios',
          paragraphs: [
            'Crea eventos con alertas a 14, 7 y 1 día antes. Reserva bloques de trabajo para ensayos y cartas, no solo para el clic final.',
            'Si usas hoja de cálculo, incluye columnas de estado: investigación, borrador, revisión, enviado.'
          ]
        },
        {
          h2: 'Evitar errores comunes',
          paragraphs: [
            'Confirma si el cierre es a medianoche local del proveedor o del estudiante. Sube archivos con margen por fallos de portal.',
            'No confíes en fechas republicadas en redes sin verificar el sitio oficial.'
          ]
        },
        {
          h2: 'Priorizar cuando hay solapamiento',
          paragraphs: [
            'Ordena por elegibilidad fuerte y esfuerzo razonable. Es mejor enviar menos solicitudes completas que muchas a medias.',
            'Revisa si una beca permite varias rondas o lista de espera en sus reglas públicas.'
          ]
        },
        { h2: 'Recordatorio', paragraphs: ['Registrar plazos no sustituye elegibilidad ni selección.', ST_ES] }
      ],
      translated_faq_json: [
        { question: '¿Qué pasa si el portal falla el día límite?', answer: 'Documenta capturas y contacta al soporte oficial del proveedor de inmediato. Las reglas varían.' },
        { question: '¿Debo usar una sola herramienta?', answer: 'Puedes combinar calendario y hoja; lo crítico es una fuente de verdad con fechas verificadas.' },
        { question: '¿ScholarshipTop envía recordatorios de plazos?', answer: 'No administra tus solicitudes. Usa tus herramientas y confirma fechas en cada proveedor.' }
      ]
    },
    fr: {
      translated_title: 'Suivre les dates limites de bourses aux États-Unis',
      translated_meta_title: 'Suivre les dates limites de bourses aux États-Unis : méthode',
      translated_meta_description:
        'Calendrier, rappels et vérification des dates officielles pour éviter les erreurs de fuseau ou de portail. Sans promesse de résultats. Info útil.',
      translated_summary:
        'Méthodes pour enregistrer et revoir les échéances de bourses aux États-Unis en s’appuyant sur la date publiée par le financeur.',
      sections: [
        {
          h2: 'Enregistrer les dates officielles',
          paragraphs: [
            'Copiez délai, fuseau et canal depuis le site du financeur, pas depuis des résumés tiers. Conservez lien ou capture.',
            'Distinguez date limite de candidature, de notification et de pièces complémentaires.'
          ]
        },
        {
          h2: 'Calendrier et rappels',
          paragraphs: [
            'Créez des alertes à 14, 7 et 1 jour. Réservez du temps pour essais et lettres, pas seulement pour le clic final.',
            'En tableur, ajoutez statut : recherche, brouillon, relecture, envoyé.'
          ]
        },
        {
          h2: 'Éviter les erreurs fréquentes',
          paragraphs: [
            'Vérifiez si la clôture est minuit locale du financeur ou de l’étudiant. Téléversez avec marge en cas de panne portail.',
            'Ne faites pas confiance aux dates repartagées sur les réseaux sans vérification officielle.'
          ]
        },
        {
          h2: 'Prioriser les chevauchements',
          paragraphs: [
            'Classez par forte éligibilité et effort raisonnable. Mieux vaut peu de dossiers complets que beaucoup incomplets.',
            'Lisez si le programme prévoit plusieurs vagues ou liste d’attente.'
          ]
        },
        { h2: 'Rappel', paragraphs: ['Suivre les dates ne remplace pas l’éligibilité ni la sélection.', ST_FR] }
      ],
      translated_faq_json: [
        { question: 'Que faire si le portail plante le jour J ?', answer: 'Conservez des preuves et contactez le support officiel du financeur. Les règles varient.' },
        { question: 'Une seule outil suffit-il ?', answer: 'Calendrier et tableur peuvent coexister ; l’essentiel est une source de vérité vérifiée.' },
        { question: 'ScholarshipTop envoie-t-il des rappels ?', answer: 'Il n’administre pas vos dossiers. Utilisez vos outils et confirmez chaque date officielle.' }
      ]
    }
  },

  'best-scholarship-tracker-templates-students': {
    es: {
      translated_title: 'Mejores plantillas para seguir becas como estudiante',
      translated_meta_title: 'Plantillas de seguimiento de becas: guía para estudiantes',
      translated_meta_description:
        'Compara columnas útiles en hojas de cálculo, Notion o papel: plazos, requisitos, estado y enlaces oficiales. Organiza sin prometer becas. Info útil.',
      translated_summary:
        'Ideas de plantillas para registrar becas con campos que realmente ayudan a decidir qué solicitar y cuándo, usando enlaces oficiales.',
      sections: [
        {
          h2: 'Columnas que sí importan',
          paragraphs: [
            'Incluye nombre del proveedor, enlace oficial, plazo verificado, elegibilidad resumida, monto si está publicado, esfuerzo estimado y estado.',
            'Evita copiar textos largos: enlaza a la fuente y actualiza cuando el proveedor cambie requisitos.'
          ]
        },
        {
          h2: 'Plantilla en hoja de cálculo',
          paragraphs: [
            'Usa filtros por mes y color por prioridad. Añade columna “última verificación” para no confiar en datos viejos.',
            'Exporta copia de seguridad antes de temporada alta de solicitudes.'
          ]
        },
        {
          h2: 'Plantilla en Notion u otras apps',
          paragraphs: [
            'Crea vistas por plazo y por tipo (mérito, necesidad, local). Adjunta checklist de documentos por fila.',
            'Comparte solo con personas de confianza; no publiques datos personales en espacios abiertos.'
          ]
        },
        {
          h2: 'Mantener el sistema vivo',
          paragraphs: [
            'Revisa semanalmente 15 minutos: mover estados, archivar becas no elegibles y añadir nuevas verificadas.',
            'Una plantilla simple usada a diario supera a una compleja abandonada.'
          ]
        },
        { h2: 'Recordatorio', paragraphs: ['Organizar no garantiza adjudicación ni montos.', ST_ES] }
      ],
      translated_faq_json: [
        { question: '¿Hace falta una plantilla de pago?', answer: 'No. Una hoja gratuita bien mantenida suele bastar si las fechas están verificadas.' },
        { question: '¿Cuántas becas registrar?', answer: 'Empieza con 15–30 candidatas reales y poda según tiempo y elegibilidad.' },
        { question: '¿ScholarshipTop ofrece plantillas oficiales?', answer: 'Puedes inspirarte en esta guía; confirma siempre datos en el sitio de cada proveedor.' }
      ]
    },
    fr: {
      translated_title: 'Meilleurs modèles de suivi de bourses pour étudiants',
      translated_meta_title: 'Modèles de suivi de bourses : comparatif pratique étudiants',
      translated_meta_description:
        'Colonnes utiles en tableur, Notion ou papier : dates, critères, statut et liens officiels. Organisez sans promettre d’attribution. Info útil.',
      translated_summary:
        'Idées de modèles pour suivre les bourses avec des champs actionnables et des liens officiels vérifiés.',
      sections: [
        {
          h2: 'Colonnes vraiment utiles',
          paragraphs: [
            'Incluez financeur, lien officiel, date vérifiée, éligibilité résumée, montant publié, effort estimé et statut.',
            'Évitez les longs copier-coller : liez la source et mettez à jour si les critères changent.'
          ]
        },
        {
          h2: 'Modèle tableur',
          paragraphs: [
            'Filtrez par mois et codez par priorité. Ajoutez « dernière vérification » pour éviter les données obsolètes.',
            'Sauvegardez avant la haute saison des candidatures.'
          ]
        },
        {
          h2: 'Modèle Notion ou apps',
          paragraphs: [
            'Vues par date et par type (mérite, besoin, local). Checklist de pièces par ligne.',
            'Partagez prudemment ; ne diffusez pas de données personnelles en public.'
          ]
        },
        {
          h2: 'Faire vivre le système',
          paragraphs: [
            '15 minutes par semaine : mettre à jour statuts, archiver l’inéligible, ajouter des offres vérifiées.',
            'Un modèle simple tenu vaut mieux qu’un modèle complexe abandonné.'
          ]
        },
        { h2: 'Rappel', paragraphs: ['Organiser ne garantit ni attribution ni montants.', ST_FR] }
      ],
      translated_faq_json: [
        { question: 'Faut-il un modèle payant ?', answer: 'Non. Un tableur gratuit bien tenu suffit si les dates sont vérifiées.' },
        { question: 'Combien d’offres suivre ?', answer: 'Commencez par 15–30 candidatures réalistes et éliminez selon temps et éligibilité.' },
        { question: 'ScholarshipTop fournit-il des modèles officiels ?', answer: 'Cette guide informe ; confirmez toujours les données sur le site de chaque financeur.' }
      ]
    }
  },

  'verify-scholarship-emails-usa': {
    es: {
      translated_title: 'Cómo verificar correos de becas en EE. UU. antes de responder',
      translated_meta_title: 'Verificar correos de becas en EE. UU. antes de responder',
      translated_meta_description:
        'Revisa remitente, dominio, enlaces y tono antes de compartir datos. Pasos para confirmar mensajes reales en la página oficial del proveedor.',
      translated_summary:
        'Guía para evaluar correos sobre becas sin caer en phishing. La confirmación final siempre debe hacerse en canales oficiales del proveedor.',
      sections: [
        {
          h2: 'Revisar remitente y dominio',
          paragraphs: [
            'Compara la dirección con dominios conocidos del proveedor; desconfía de variaciones con guiones o TLD raros. No confíes solo en el nombre mostrado.',
            'Busca el mensaje completo con encabezados si usas cliente avanzado y tienes dudas serias.'
          ]
        },
        {
          h2: 'Enlaces y archivos adjuntos',
          paragraphs: [
            'Pasa el cursor sobre enlaces sin clicar; abre el sitio del proveedor manualmente. Evita descargar adjuntos inesperados.',
            'Los portales legítimos suelen pedir inicio de sesión en su dominio, no en formularios genéricos.'
          ]
        },
        {
          h2: 'Tono y urgencia',
          paragraphs: [
            'Las estafas presionan con amenazas o premios instantáneos. Un proceso real describe pasos, plazos y documentos sin exigir pagos raros.',
            'Si piden datos bancarios o contraseñas por correo, detente y verifica por teléfono publicado oficialmente.'
          ]
        },
        {
          h2: 'Confirmación cruzada',
          paragraphs: [
            'Inicia sesión en el portal oficial o llama al contacto listado en el sitio institucional, no al número del correo sospechoso.',
            'Guarda capturas para reportar fraude si aplica, sin compartir información sensible en redes.'
          ]
        },
        { h2: 'Recordatorio', paragraphs: ['Verificar correos reduce riesgo, no garantiza becas.', ST_ES] }
      ],
      translated_faq_json: [
        { question: '¿Un correo .edu siempre es seguro?', answer: 'No necesariamente. Confirma que corresponde a la institución o programa real en su sitio oficial.' },
        { question: '¿Debo responder pidiendo más datos?', answer: 'Mejor verificar primero por canal oficial. No envíes documentos hasta confirmar autenticidad.' },
        { question: '¿ScholarshipTop envía correos de adjudicación?', answer: 'No concede becas. Las notificaciones legítimas vienen del proveedor que administras en su portal.' }
      ]
    },
    fr: {
      translated_title: 'Vérifier les e-mails de bourse aux États-Unis avant de répondre',
      translated_meta_title: 'Vérifier les e-mails de bourse aux États-Unis avant réponse',
      translated_meta_description:
        'Examinez expéditeur, domaine, liens et ton avant de partager des données. Confirmez les messages réels sur la page officielle du financeur. Info útil.',
      translated_summary:
        'Guide pour évaluer les e-mails liés aux bourses sans phishing. La confirmation finale passe toujours par les canaux officiels du financeur.',
      sections: [
        {
          h2: 'Expéditeur et domaine',
          paragraphs: [
            'Comparez l’adresse aux domaines connus du financeur ; méfiez-vous des variantes avec tirets ou TLD inhabituels.',
            'Consultez les en-têtes complets si vous avez un doute technique sérieux.'
          ]
        },
        {
          h2: 'Liens et pièces jointes',
          paragraphs: [
            'Survolez les liens sans cliquer ; ouvrez le site du financeur manuellement. Évitez les pièces jointes inattendues.',
            'Les portails légitimes demandent une connexion sur leur domaine, pas sur des formulaires génériques.'
          ]
        },
        {
          h2: 'Ton et urgence',
          paragraphs: [
            'Les arnaques utilisent menaces ou gains instantanés. Un processus réel décrit étapes, dates et pièces sans frais bizarres.',
            'Si l’on demande coordonnées bancaires ou mots de passe par e-mail, arrêtez-vous et vérifiez via le numéro officiel du site.'
          ]
        },
        {
          h2: 'Confirmation croisée',
          paragraphs: [
            'Connectez-vous au portail officiel ou appelez le contact listé sur le site institutionnel, pas celui de l’e-mail douteux.',
            'Conservez des captures pour signaler une fraude si besoin, sans publier de données sensibles.'
          ]
        },
        { h2: 'Rappel', paragraphs: ['Vérifier les e-mails réduit le risque sans garantir une bourse.', ST_FR] }
      ],
      translated_faq_json: [
        { question: 'Un e-mail .edu est-il toujours sûr ?', answer: 'Pas forcément. Confirmez qu’il correspond au programme réel sur le site officiel.' },
        { question: 'Dois-je répondre en demandant plus d’infos ?', answer: 'Vérifiez d’abord par canal officiel. N’envoyez pas de documents avant confirmation.' },
        { question: 'ScholarshipTop envoie-t-il des e-mails d’attribution ?', answer: 'Il n’accorde pas de bourses. Les notifications légitimes viennent du financeur sur son portail.' }
      ]
    }
  },

  'trustworthy-scholarship-review-online': {
    es: {
      translated_title: 'Qué hace confiable una reseña de becas en línea',
      translated_meta_title: 'Reseñas de becas en línea: cómo saber si son confiables',
      translated_meta_description:
        'Señales de transparencia, fuentes citadas y límites claros en reseñas de becas. Aprende a contrastar con páginas oficiales sin creer promesas vagas.',
      translated_summary:
        'Criterios para evaluar reseñas y comparativas de becas en internet antes de confiar en montos, plazos o tasas de éxito.',
      sections: [
        {
          h2: 'Transparencia del autor',
          paragraphs: [
            'Busca quién escribió la reseña, cuándo se actualizó y si declara afiliaciones. Las reseñas sin autor ni fecha son señal débil.',
            'Desconfía de testimonios anónimos que no enlazan al programa oficial.'
          ]
        },
        {
          h2: 'Fuentes y verificabilidad',
          paragraphs: [
            'Una buena reseña enlaza al proveedor y cita requisitos verificables, no solo capturas sin contexto. Compara con la página oficial.',
            'Evita contenido que inventa porcentajes de aceptación sin método público.'
          ]
        },
        {
          h2: 'Equilibrio y límites',
          paragraphs: [
            'Las guías honestas mencionan costos de solicitud, tiempo requerido y riesgos (estafas, renovación). El tono solo positivo puede ser marketing.',
            'Pregunta si la reseña mezcla becas reales con productos de pago no relacionados.'
          ]
        },
        {
          h2: 'Uso práctico de reseñas',
          paragraphs: [
            'Trata las reseñas como mapa inicial, no decisión final. Tu lista corta debe basarse en elegibilidad confirmada.',
            'Si dos reseñas se contradicen, prioriza el documento oficial del proveedor.'
          ]
        },
        { h2: 'Recordatorio', paragraphs: ['Las reseñas informan; no otorgan becas ni garantizan resultados.', ST_ES] }
      ],
      translated_faq_json: [
        { question: '¿Las estrellas en foros bastan?', answer: 'No. Verifica siempre requisitos y plazos en el sitio del proveedor.' },
        { question: '¿Una reseña puede sustituir la solicitud oficial?', answer: 'Nunca. Solo el proceso publicado por el proveedor cuenta.' },
        { question: '¿ScholarshipTop publica reseñas pagadas de proveedores?', answer: 'ScholarshipTop prioriza orientación verificable; confirma siempre en la fuente oficial del programa.' }
      ]
    },
    fr: {
      translated_title: 'Ce qui rend un avis sur les bourses fiable en ligne',
      translated_meta_title: 'Avis sur les bourses en ligne : comment juger leur fiabilité',
      translated_meta_description:
        'Transparence, sources citées et limites claires dans les avis sur les bourses. Recoupez avec les pages officielles sans croire aux promesses vagues.',
      translated_summary:
        'Critères pour évaluer avis et comparatifs de bourses en ligne avant de faire confiance aux montants, dates ou taux de réussite.',
      sections: [
        {
          h2: 'Transparence de l’auteur',
          paragraphs: [
            'Identifiez l’auteur, la date de mise à jour et les affiliations déclarées. Sans auteur ni date, la fiabilité est faible.',
            'Méfiez-vous des témoignages anonymes sans lien vers le programme officiel.'
          ]
        },
        {
          h2: 'Sources et vérifiabilité',
          paragraphs: [
            'Un bon avis lie le financeur et cite des critères vérifiables. Comparez avec la page officielle.',
            'Évitez les contenus inventant des taux d’acceptation sans méthode publique.'
          ]
        },
        {
          h2: 'Équilibre et limites',
          paragraphs: [
            'Les guides honnêtes mentionnent coûts, temps et risques (arnaques, renouvellement). Un ton uniquement positif peut être marketing.',
            'Vérifiez si l’avis mélange vraies bourses et produits payants sans lien.'
          ]
        },
        {
          h2: 'Usage pratique des avis',
          paragraphs: [
            'Traitez les avis comme carte initiale, pas décision finale. Votre liste courte repose sur l’éligibilité confirmée.',
            'En cas de contradiction, priorisez le document officiel du financeur.'
          ]
        },
        { h2: 'Rappel', paragraphs: ['Les avis informent ; ils n’attribuent pas de bourses ni ne garantissent de résultats.', ST_FR] }
      ],
      translated_faq_json: [
        { question: 'Les étoiles sur les forums suffisent-elles ?', answer: 'Non. Vérifiez toujours critères et dates sur le site du financeur.' },
        { question: 'Un avis peut-il remplacer la candidature officielle ?', answer: 'Jamais. Seule la procédure publiée par le financeur compte.' },
        { question: 'ScholarshipTop publie-t-il des avis payés ?', answer: 'ScholarshipTop privilégie des conseils vérifiables ; confirmez toujours sur la source officielle.' }
      ]
    }
  },

  'scholarship-faq-low-gpa-students': {
    es: {
      translated_title: 'FAQ de becas para estudiantes con GPA bajo',
      translated_meta_title: 'Becas con GPA bajo: preguntas frecuentes y opciones reales',
      translated_meta_description:
        'Opciones realistas, becas por mérito alternativo y errores a evitar si tu GPA no es alto. Verifica requisitos en cada proveedor oficial. Info útil.',
      translated_summary:
        'Respuestas directas para quienes temen que un GPA bajo cierre todas las puertas. Muchas becas valoran otros criterios además del promedio.',
      sections: [
        {
          h2: '¿Un GPA bajo descarta todo?',
          paragraphs: [
            'No. Existen becas por necesidad, comunidad, talento, primera generación o trayectorias no académicas con umbrales flexibles o sin GPA mínimo publicado.',
            'Lee cada ficha oficial: algunas solo piden progreso reciente o explicación de circunstancias.'
          ]
        },
        {
          h2: 'Dónde buscar con encaje',
          paragraphs: [
            'Prioriza becas locales y programas que mencionen servicio, liderazgo o metas profesionales claras. Evita listas masivas sin filtrar elegibilidad.',
            'Usa tu ensayo para contextualizar mejoras y plan académico, sin inventar excusas.'
          ]
        },
        {
          h2: 'Fortalecer el perfil sin prometer milagros',
          paragraphs: [
            'Mejora materias clave, busca tutoría y documenta actividades constantes. Un GPA en ascenso puede contar si el proveedor lo permite.',
            'Pide cartas que hablen de trabajo, no solo de números.'
          ]
        },
        {
          h2: 'Errores frecuentes',
          paragraphs: [
            'No pagues “acceso garantizado” por GPA bajo. No copies ensayos genéricos sin adaptar.',
            'No omitas revisar si la beca exige GPA mínimo: enviar sin cumplirlo desperdicia tiempo.'
          ]
        },
        { h2: 'Recordatorio', paragraphs: ['Más opciones no significan adjudicación automática.', ST_ES] }
      ],
      translated_faq_json: [
        { question: '¿Debo mencionar mi GPA en el ensayo?', answer: 'Si la consigna lo pide o hay contexto útil (mejora, circunstancias). Sé breve y orientado a acciones.' },
        { question: '¿Existen becas sin mirar GPA?', answer: 'Sí, pero son minoría. Confirma en la página oficial; no confíes en titulares de blogs.' },
        { question: '¿ScholarshipTop relaja requisitos de GPA?', answer: 'No. ScholarshipTop no define elegibilidad; cada proveedor publica sus reglas.' }
      ]
    },
    fr: {
      translated_title: 'FAQ bourses pour étudiants avec GPA faible',
      translated_meta_title: 'Bourses avec GPA faible : FAQ et options réalistes',
      translated_meta_description:
        'Options réalistes, critères alternatifs et erreurs à éviter si votre GPA n’est pas élevé. Vérifiez les exigences sur chaque page officielle.',
      translated_summary:
        'Réponses directes pour ceux qui craignent qu’un GPA faible ferme toutes les portes. Beaucoup de bourses valorisent d’autres critères que la moyenne.',
      sections: [
        {
          h2: 'Un GPA faible ferme-t-il tout ?',
          paragraphs: [
            'Non. Il existe des bourses selon besoin, engagement, talent, première génération ou parcours non purement scolaire, parfois sans seuil publié.',
            'Lisez chaque fiche officielle : certaines demandent seulement une progression récente ou un contexte expliqué.'
          ]
        },
        {
          h2: 'Où chercher avec adéquation',
          paragraphs: [
            'Privilégiez bourses locales et programmes valorisant service, leadership ou projet professionnel. Évitez les listes massives non filtrées.',
            'Dans l’essai, contextualisez les progrès et le plan académique sans inventer d’excuses.'
          ]
        },
        {
          h2: 'Renforcer le profil sans promesse miracle',
          paragraphs: [
            'Améliorez les matières clés, cherchez du soutien et documentez des activités régulières. Une moyenne en hausse peut compter si le financeur l’accepte.',
            'Demandez des lettres qui parlent du travail, pas seulement des chiffres.'
          ]
        },
        {
          h2: 'Erreurs fréquentes',
          paragraphs: [
            'Ne payez pas d’« accès garanti » pour GPA faible. N’envoyez pas d’essais génériques non adaptés.',
            'Vérifiez le GPA minimum exigé avant d’envoyer un dossier inéligible.'
          ]
        },
        { h2: 'Rappel', paragraphs: ['Plus d’options ne signifie pas attribution automatique.', ST_FR] }
      ],
      translated_faq_json: [
        { question: 'Dois-je mentionner mon GPA dans l’essai ?', answer: 'Si la consigne le demande ou si le contexte est utile (progrès, circonstances). Restez bref et orienté action.' },
        { question: 'Existe-t-il des bourses sans regarder le GPA ?', answer: 'Oui, mais ce sont des minorités. Confirmez sur la page officielle.' },
        { question: 'ScholarshipTop assouplit-il le GPA ?', answer: 'Non. Chaque financeur publie ses propres règles d’éligibilité.' }
      ]
    }
  },

  'scholarship-faq-comparing-multiple-offers': {
    es: {
      translated_title: 'FAQ para comparar varias ofertas de becas',
      translated_meta_title: 'Comparar varias ofertas de becas: preguntas que debes hacer',
      translated_meta_description:
        'Montos, renovación, restricciones y plazos al elegir entre becas. Compara con documentos oficiales, no solo con titulares de marketing. Info útil.',
      translated_summary:
        'Preguntas frecuentes al recibir más de una beca o ayuda. Te ayuda a decidir con reglas publicadas por cada proveedor y tu universidad.',
      sections: [
        {
          h2: 'Qué comparar primero',
          paragraphs: [
            'Monto total, duración, renovación condicionada y gastos cubiertos (matrícula, alojamiento, libros). Un monto alto puede ser parcial o de un solo año.',
            'Revisa si hay servicio obligatorio, GPA mínimo de renovación o restricciones de carrera.'
          ]
        },
        {
          h2: 'Políticas de acumulación',
          paragraphs: [
            'Algunas universidades limitan cuánto ayuda externa puedes combinar. Consulta ayuda financiera institucional con números oficiales.',
            'El proveedor también puede prohibir “stacking” con otras becas específicas.'
          ]
        },
        {
          h2: 'Plazos de aceptación',
          paragraphs: [
            'Anota fechas para aceptar, rechazar o solicitar revisión. Perder un plazo puede convertir una oferta válida en perdida.',
            'Pide extensiones solo si el proveedor lo permite públicamente.'
          ]
        },
        {
          h2: 'Decisión con familia',
          paragraphs: [
            'Compara costo total de asistencia después de becas, no solo el cheque anunciado. Incluye préstamos y trabajo esperado.',
            'Documenta cada oferta en una tabla con enlaces oficiales.'
          ]
        },
        { h2: 'Recordatorio', paragraphs: ['Comparar bien reduce errores; no sustituye asesoría oficial de tu escuela.', ST_ES] }
      ],
      translated_faq_json: [
        { question: '¿Debo aceptar la beca más grande?', answer: 'No siempre. Mira renovación, restricciones y impacto en otra ayuda institucional.' },
        { question: '¿Puedo negociar una beca?', answer: 'Algunas universidades permiten apelación de paquete financiero; las becas privadas rara vez “negocian” como empleo.' },
        { question: '¿ScholarshipTop decide por mí?', answer: 'No. ScholarshipTop no administra ofertas; decide con reglas oficiales y asesoría de tu institución.' }
      ]
    },
    fr: {
      translated_title: 'FAQ pour comparer plusieurs offres de bourses',
      translated_meta_title: 'Comparer plusieurs offres de bourses : questions clés',
      translated_meta_description:
        'Montants, renouvellement, restrictions et dates pour choisir entre bourses. Comparez les documents officiels, pas seulement les titres marketing.',
      translated_summary:
        'Questions fréquentes quand plusieurs aides arrivent. Aide à décider avec les règles de chaque financeur et de votre établissement.',
      sections: [
        {
          h2: 'Que comparer en premier',
          paragraphs: [
            'Montant total, durée, renouvellement conditionnel et frais couverts. Un gros chiffre peut être partiel ou sur une seule année.',
            'Vérifiez service obligatoire, GPA de renouvellement ou restrictions de filière.'
          ]
        },
        {
          h2: 'Règles de cumul',
          paragraphs: [
            'Certaines universités limitent l’aide externe cumulée. Consultez l’aide financière institutionnelle avec chiffres officiels.',
            'Le financeur peut aussi interdire le cumul avec d’autres bourses.'
          ]
        },
        {
          h2: 'Délais d’acceptation',
          paragraphs: [
            'Notez les dates pour accepter, refuser ou demander une revue. Les manquer peut faire perdre une offre valide.',
            'Demandez une extension seulement si le financeur l’autorise publiquement.'
          ]
        },
        {
          h2: 'Décision en famille',
          paragraphs: [
            'Comparez le coût net après bourses, pas seulement le montant annoncé. Incluez prêts et travail prévu.',
            'Documentez chaque offre dans un tableau avec liens officiels.'
          ]
        },
        { h2: 'Rappel', paragraphs: ['Bien comparer limite les erreurs sans remplacer l’avis officiel de l’école.', ST_FR] }
      ],
      translated_faq_json: [
        { question: 'Dois-je prendre la plus grosse bourse ?', answer: 'Pas toujours. Regardez renouvellement, restrictions et impact sur l’aide institutionnelle.' },
        { question: 'Peut-on négocier une bourse ?', answer: 'Certaines universités permettent une appel du package ; les bourses privées se négocient rarement comme un salaire.' },
        { question: 'ScholarshipTop choisit-il pour moi ?', answer: 'Non. Décidez avec les règles officielles et l’orientation de votre établissement.' }
      ]
    }
  },

  'scholarship-faq-no-recommendation-letters': {
    es: {
      translated_title: 'FAQ de becas sin cartas de recomendación',
      translated_meta_title: 'Becas sin cartas de recomendación: preguntas frecuentes',
      translated_meta_description:
        'Programas que no exigen cartas, alternativas como referencias laborales y cómo compensar con ensayo fuerte. Verifica requisitos oficiales. Info útil.',
      translated_summary:
        'Guía para estudiantes que no pueden conseguir cartas académicas a tiempo. Muchas becas permiten otras pruebas o ninguna carta.',
      sections: [
        {
          h2: '¿Existen becas sin cartas?',
          paragraphs: [
            'Sí. Algunas usan solo ensayo, transcripción y formulario. Lee la sección de materiales en la página oficial antes de descartar.',
            'Las becas rápidas “sin ensayo” también existen, pero suelen tener otros filtros de elegibilidad.'
          ]
        },
        {
          h2: 'Alternativas cuando se permiten referencias',
          paragraphs: [
            'Supervisores de trabajo, coaches de servicio o mentores comunitarios pueden servir si el proveedor lo acepta.',
            'Nunca sustituyas con cartas de familiares salvo que esté explícitamente permitido.'
          ]
        },
        {
          h2: 'Compensar con ensayo y perfil',
          paragraphs: [
            'Refuerza ejemplos verificables de impacto y coherencia con la misión del programa. La especificidad puede compensar ausencia de carta.',
            'Mantén tono honesto sobre por qué no hay carta (clases en línea, primer año, etc.) si la consigna lo permite.'
          ]
        },
        {
          h2: 'Planificación',
          paragraphs: [
            'Reserva más tiempo para becas sin carta en tu calendario. Para las que sí la exigen, pide con margen a quien sí te conozca.',
            'No envíes sin carta si es obligatoria: suele ser descarte automático.'
          ]
        },
        { h2: 'Recordatorio', paragraphs: ['Las reglas varían por proveedor; no hay atajo universal.', ST_ES] }
      ],
      translated_faq_json: [
        { question: '¿Puedo enviar una carta tardía?', answer: 'Solo si el proveedor lo permite. Muchos portales cierren sin recepción posterior.' },
        { question: '¿Una carta de amigo cuenta?', answer: 'Casi nunca. Usa referentes permitidos y profesionales según instrucciones.' },
        { question: '¿ScholarshipTop exime cartas?', answer: 'No. ScholarshipTop no define requisitos; el proveedor sí.' }
      ]
    },
    fr: {
      translated_title: 'FAQ bourses sans lettre de recommandation',
      translated_meta_title: 'Bourses sans lettre de recommandation : FAQ utiles',
      translated_meta_description:
        'Programmes sans lettre, références professionnelles et compensation par un essai solide. Vérifiez les pièces sur la page officielle. Info útil.',
      translated_summary:
        'Guide pour étudiants sans lettre académique à temps. Beaucoup de bourses acceptent d’autres preuves ou aucune lettre.',
      sections: [
        {
          h2: 'Existe-t-il des bourses sans lettre ?',
          paragraphs: [
            'Oui. Certaines demandent seulement essai, relevé et formulaire. Lisez la liste officielle des pièces avant d’écarter.',
            'Les bourses « sans essai » existent aussi avec d’autres filtres d’éligibilité.'
          ]
        },
        {
          h2: 'Alternatives quand références autorisées',
          paragraphs: [
            'Employeur, coach associatif ou mentor peuvent convenir si le financeur l’accepte.',
            'N’utilisez pas de lettres familiales sauf autorisation explicite.'
          ]
        },
        {
          h2: 'Compenser par essai et profil',
          paragraphs: [
            'Renforcez exemples vérifiables et lien avec la mission du programme. La précision peut compenser l’absence de lettre.',
            'Soyez honnête sur l’absence de lettre (cours en ligne, première année) si la consigne le permet.'
          ]
        },
        {
          h2: 'Planification',
          paragraphs: [
            'Bloquez du temps pour les bourses sans lettre. Pour les autres, anticipez la demande aux référents.',
            'N’envoyez pas sans lettre si elle est obligatoire : rejet fréquent.'
          ]
        },
        { h2: 'Rappel', paragraphs: ['Les règles varient ; il n’y a pas de raccourci universel.', ST_FR] }
      ],
      translated_faq_json: [
        { question: 'Puis-je envoyer une lettre en retard ?', answer: 'Seulement si le financeur l’autorise. Beaucoup de portails ferment sans suite.' },
        { question: 'Une lettre d’ami suffit-elle ?', answer: 'Rarement. Utilisez des référents autorisés et professionnels.' },
        { question: 'ScholarshipTop dispense-t-il des lettres ?', answer: 'Non. Seul le financeur définit les pièces requises.' }
      ]
    }
  },

  'scholarship-faq-applying-late': {
    es: {
      translated_title: 'FAQ para solicitar becas tarde',
      translated_meta_title: 'Solicitar becas tarde: qué hacer ahora, preguntas frecuentes',
      translated_meta_description:
        'Qué hacer si perdiste plazos, becas con ventanas tardías y cómo priorizar sin errores. Confirma fechas en fuentes oficiales, no en rumores. Info útil.',
      translated_summary:
        'Respuestas para quienes empiezan tarde la temporada de becas. Enfócate en plazos reales y calidad de solicitud, no en promesas de rescate.',
      sections: [
        {
          h2: '¿Aún hay opciones?',
          paragraphs: [
            'Algunas becas tienen ciclos trimestrales o plazos en primavera; otras cierran temprano. Busca fechas verificadas, no listas desactualizadas.',
            'Tu universidad puede tener fondos con plazos internos distintos a becas privadas.'
          ]
        },
        {
          h2: 'Priorizar con poco tiempo',
          paragraphs: [
            'Elige pocas becas con alta elegibilidad y materiales reutilizables. Un ensayo sólido adaptado supera diez envíos vacíos.',
            'Completa FAFSA u otros formularios base si aplican a tu situación oficial.'
          ]
        },
        {
          h2: 'Errores al apurar',
          paragraphs: [
            'No copies ensayos sin revisar consigna. No pagues servicios que prometen “plazo extendido” sin prueba oficial.',
            'Sube archivos con tiempo de margen el día del cierre.'
          ]
        },
        {
          h2: 'Plan para el próximo ciclo',
          paragraphs: [
            'Mientras solicitas lo que queda, configura calendario para el año siguiente con recordatorios tempranos.',
            'Registra qué faltó (cartas, pruebas) para no repetir el retraso.'
          ]
        },
        { h2: 'Recordatorio', paragraphs: ['Empezar tarde reduce opciones, no las elimina todas.', ST_ES] }
      ],
      translated_faq_json: [
        { question: '¿Puedo pedir extensión de plazo?', answer: 'Solo si el proveedor lo publica o responde por canal oficial. No asumas que sí.' },
        { question: '¿Las becas “rolling” ayudan?', answer: 'Pueden, hasta agotar fondos. Envía pronto aunque no haya fecha única.' },
        { question: '¿ScholarshipTop extiende plazos?', answer: 'No. Los plazos los controla cada proveedor en su sitio oficial.' }
      ]
    },
    fr: {
      translated_title: 'FAQ candidater tard aux bourses',
      translated_meta_title: 'Candidater tard aux bourses : que faire maintenant (FAQ)',
      translated_meta_description:
        'Que faire après une date manquée, bourses à fenêtres tardives et priorités sans erreurs. Confirmez les dates sur sources officielles. Info útil.',
      translated_summary:
        'Réponses pour ceux qui commencent tard la saison des bourses. Concentrez-vous sur dates réelles et qualité de dossier, pas sur promesses de rattrapage.',
      sections: [
        {
          h2: 'Reste-t-il des options ?',
          paragraphs: [
            'Certaines bourses ont des cycles trimestriels ou des dates au printemps ; d’autres ferment tôt. Vérifiez les dates, pas les listes obsolètes.',
            'Votre université peut avoir des fonds internes avec calendrier différent.'
          ]
        },
        {
          h2: 'Prioriser avec peu de temps',
          paragraphs: [
            'Choisissez peu de bourses très éligibles et pièces réutilisables. Un bon essai adapté vaut mieux que dix dossiers vides.',
            'Complétez FAFSA ou formulaires de base si requis officiellement.'
          ]
        },
        {
          h2: 'Erreurs en urgence',
          paragraphs: [
            'Ne copiez pas d’essais sans lire la consigne. Ne payez pas de « délai prolongé » sans preuve officielle.',
            'Téléversez avec marge le jour de la clôture.'
          ]
        },
        {
          h2: 'Plan pour le prochain cycle',
          paragraphs: [
            'Configurez un calendrier pour l’année suivante pendant que vous terminez le reste.',
            'Notez ce qui a manqué (lettres, tests) pour éviter le même retard.'
          ]
        },
        { h2: 'Rappel', paragraphs: ['Commencer tard réduit les options sans tout fermer.', ST_FR] }
      ],
      translated_faq_json: [
        { question: 'Puis-je demander une extension ?', answer: 'Seulement si le financeur le publie ou confirme par canal officiel.' },
        { question: 'Les bourses « rolling » aident-elles ?', answer: 'Oui, jusqu’à épuisement des fonds. Envoyez tôt même sans date unique.' },
        { question: 'ScholarshipTop prolonge-t-il les dates ?', answer: 'Non. Chaque financeur fixe ses dates sur son site officiel.' }
      ]
    }
  },

  'organize-scholarship-applications-by-difficulty': {
    es: {
      translated_title: 'Organizar solicitudes de becas por nivel de dificultad',
      translated_meta_title: 'Organizar becas por dificultad: método práctico estudiantes',
      translated_meta_description:
        'Clasifica becas por esfuerzo, elegibilidad y plazo para equilibrar victorias rápidas y solicitudes exigentes. Sin prometer resultados. Info útil.',
      translated_summary:
        'Método para ordenar tu lista de becas según dificultad real de solicitud y encaje, usando datos verificados de cada proveedor.',
      sections: [
        {
          h2: 'Definir “dificultad” con criterios claros',
          paragraphs: [
            'Combina longitud del ensayo, número de cartas, documentos especiales y competencia estimada (tamaño del premio y alcance nacional).',
            'Marca “rápida” solo si materiales y plazo son ligeros y sigues cumpliendo elegibilidad al 100 %.'
          ]
        },
        {
          h2: 'Mezclar victorias rápidas y retos',
          paragraphs: [
            'Alterna solicitudes cortas con dos o tres programas ambiciosos bien preparados. Evita solo becas masivas imposibles de personalizar.',
            'Un calendario equilibrado reduce burnout en temporada alta.'
          ]
        },
        {
          h2: 'Actualizar la clasificación',
          paragraphs: [
            'Si un proveedor cambia requisitos, mueve la fila de categoría. Si fallas elegibilidad, archiva sin pena.',
            'Registra tiempo real invertido para mejorar estimaciones el próximo año.'
          ]
        },
        {
          h2: 'Revisión semanal',
          paragraphs: [
            'Cada semana, elige 2–3 tareas concretas por dificultad y plazo. No reordenes sin mirar fechas oficiales.',
            'Prioriza envíos completos sobre cantidad.'
          ]
        },
        { h2: 'Recordatorio', paragraphs: ['Organizar por dificultad no garantiza becas.', ST_ES] }
      ],
      translated_faq_json: [
        { question: '¿Las becas “fáciles” son estafas?', answer: 'No siempre, pero verifica proveedor igual que en programas grandes. La facilidad no implica legitimidad.' },
        { question: '¿Cuántas difíciles debo intentar?', answer: 'Depende de tu tiempo. Muchos estudiantes combinan pocas difíciles con varias moderadas.' },
        { question: '¿ScholarshipTop clasifica dificultad por mí?', answer: 'No. Tú clasificas según requisitos oficiales que leas en cada programa.' }
      ]
    },
    fr: {
      translated_title: 'Organiser les candidatures par niveau de difficulté',
      translated_meta_title: 'Organiser les bourses par difficulté : méthode étudiants',
      translated_meta_description:
        'Classez les bourses par effort, éligibilité et date pour équilibrer gains rapides et dossiers exigeants. Sans promesse de résultats. Info útil.',
      translated_summary:
        'Méthode pour ordonner votre liste selon la difficulté réelle et l’adéquation, avec données vérifiées de chaque financeur.',
      sections: [
        {
          h2: 'Définir la difficulté clairement',
          paragraphs: [
            'Combinez longueur d’essai, nombre de lettres, pièces spéciales et concurrence estimée (montant et portée nationale).',
            'Marquez « rapide » seulement si pièces et délai sont légers et éligibilité à 100 %.'
          ]
        },
        {
          h2: 'Mélanger rapides et ambitieux',
          paragraphs: [
            'Alternez candidatures courtes et deux ou trois programmes exigeants bien préparés. Évitez seulement les masses impossibles à personnaliser.',
            'Un calendrier équilibré limite l’épuisement en haute saison.'
          ]
        },
        {
          h2: 'Mettre à jour la classification',
          paragraphs: [
            'Si les critères changent, déplacez la ligne. Si inéligible, archivez sans culpabilité.',
            'Notez le temps réel passé pour affiner l’année suivante.'
          ]
        },
        {
          h2: 'Revue hebdomadaire',
          paragraphs: [
            'Chaque semaine, choisissez 2–3 tâches par difficulté et date. Ne réorganisez pas sans lire les échéances officielles.',
            'Priorisez des dossiers complets, pas la quantité.'
          ]
        },
        { h2: 'Rappel', paragraphs: ['Organiser par difficulté ne garantit pas de bourses.', ST_FR] }
      ],
      translated_faq_json: [
        { question: 'Les bourses « faciles » sont-elles des arnaques ?', answer: 'Pas toujours, mais vérifiez le financeur comme pour les grands programmes.' },
        { question: 'Combien de dossiers difficiles viser ?', answer: 'Selon votre temps. Beaucoup combinent peu de difficiles et plusieurs modérés.' },
        { question: 'ScholarshipTop classe-t-il pour moi ?', answer: 'Non. Vous classez selon les exigences officielles de chaque programme.' }
      ]
    }
  },

  'organize-scholarship-applications-notion': {
    es: {
      translated_title: 'Cómo organizar solicitudes de becas en Notion',
      translated_meta_title: 'Organizar solicitudes de becas en Notion: guía estudiantes',
      translated_meta_description:
        'Bases de datos, vistas por plazo y plantillas de checklist en Notion para becas. Mantén enlaces oficiales y fechas verificadas del proveedor.',
      translated_summary:
        'Configuración práctica de Notion para seguir becas, documentos y estados sin perder de vista plazos oficiales.',
      sections: [
        {
          h2: 'Crear la base de datos',
          paragraphs: [
            'Campos sugeridos: proveedor, enlace oficial, plazo, elegibilidad, esfuerzo, estado, notas. Usa tipo fecha con zona horaria anotada en notas.',
            'Evita pegar HTML largo; enlaza a la ficha del proveedor.'
          ]
        },
        {
          h2: 'Vistas útiles',
          paragraphs: [
            'Tabla por mes, tablero kanban por estado y vista “esta semana” filtrada por plazo. Añade plantilla de checklist duplicable por beca.',
            'Incluye propiedad “última verificación” para recordar revisar cambios del proveedor.'
          ]
        },
        {
          h2: 'Flujo de trabajo diario',
          paragraphs: [
            'Abre la vista semanal cada lunes, mueve tarjetas y asigna bloques de tiempo para ensayos. Registra minutos reales para aprender ritmo.',
            'Exporta o respalda antes de cambios grandes de estructura.'
          ]
        },
        {
          h2: 'Privacidad',
          paragraphs: [
            'No compartas la base públicamente con datos personales. Usa permisos solo para familia o mentores de confianza.',
            'Desactiva integraciones que copien contenido a servicios desconocidos.'
          ]
        },
        { h2: 'Recordatorio', paragraphs: ['Notion organiza; no valida becas ni plazos por ti.', ST_ES] }
      ],
      translated_faq_json: [
        { question: '¿Hace falta Notion de pago?', answer: 'La versión gratuita suele bastar para estudiantes. Revisa límites de archivos si subes PDF.' },
        { question: '¿Puedo sincronizar con calendario?', answer: 'Sí con integraciones; confirma siempre la fecha en el sitio del proveedor.' },
        { question: '¿ScholarshipTop tiene plantilla Notion oficial?', answer: 'Puedes adaptar esta estructura; ScholarshipTop no administra tu espacio de trabajo.' }
      ]
    },
    fr: {
      translated_title: 'Organiser ses candidatures bourses dans Notion',
      translated_meta_title: 'Organiser ses candidatures bourses dans Notion : guide',
      translated_meta_description:
        'Bases, vues par date et checklists Notion pour les bourses. Gardez liens officiels et dates vérifiées du financeur. Info útil. Info útil. Info útil.',
      translated_summary:
        'Configuration pratique de Notion pour suivre bourses, pièces et statuts en gardant les échéances officielles visibles.',
      sections: [
        {
          h2: 'Créer la base',
          paragraphs: [
            'Champs : financeur, lien officiel, date, éligibilité, effort, statut, notes. Date avec fuseau noté dans les notes.',
            'Évitez les longs collages ; liez la fiche officielle.'
          ]
        },
        {
          h2: 'Vues utiles',
          paragraphs: [
            'Table par mois, kanban par statut, vue « cette semaine ». Modèle de checklist duplicable par bourse.',
            'Propriété « dernière vérification » pour suivre les changements du financeur.'
          ]
        },
        {
          h2: 'Routine hebdomadaire',
          paragraphs: [
            'Ouvrez la vue hebdo chaque lundi, déplacez les cartes et bloquez du temps pour les essais. Notez le temps réel passé.',
            'Sauvegardez avant de refactoriser la base.'
          ]
        },
        {
          h2: 'Confidentialité',
          paragraphs: [
            'Ne partagez pas la base publiquement avec données personnelles. Limitez l’accès à la famille ou mentors de confiance.',
            'Désactivez les intégrations qui copient vers des services inconnus.'
          ]
        },
        { h2: 'Rappel', paragraphs: ['Notion organise ; il ne valide pas les bourses à votre place.', ST_FR] }
      ],
      translated_faq_json: [
        { question: 'Faut-il Notion payant ?', answer: 'La version gratuite suffit souvent. Vérifiez les limites si vous joignez des PDF.' },
        { question: 'Synchroniser avec un calendrier ?', answer: 'Oui via intégrations ; confirmez toujours la date sur le site du financeur.' },
        { question: 'ScholarshipTop fournit-il un modèle Notion ?', answer: 'Adaptez cette structure ; ScholarshipTop n’administre pas votre espace.' }
      ]
    }
  },

  'how-to-track-scholarships-international-students': {
    es: {
      translated_title: 'Herramientas para seguir becas como estudiante internacional',
      translated_meta_title: 'Seguimiento de becas para estudiantes internacionales EE.UU.',
      translated_meta_description:
        'Calendario, requisitos de visa y enlaces oficiales al organizar becas en EE. UU. desde el extranjero. Sin prometer admisión ni fondos. Info útil.',
      translated_summary:
        'Consejos de seguimiento para estudiantes internacionales que aplican a becas en Estados Unidos, con énfasis en verificación oficial.',
      sections: [
        {
          h2: 'Registrar requisitos de elegibilidad',
          paragraphs: [
            'Anota nacionalidad, tipo de visa previsto, nivel académico e idioma exigido. Muchas becas excluyen ciertos estatus sin dejarlo claro en titulares.',
            'Guarda enlace oficial y fecha de última revisión.'
          ]
        },
        {
          h2: 'Zonas horarias y plazos',
          paragraphs: [
            'Convierte plazos a tu hora local y añade margen. Los portales pueden cerrar según hora del proveedor en EE. UU.',
            'Programa recordatorios 48 horas antes para subir documentos traducidos si aplica.'
          ]
        },
        {
          h2: 'Documentos recurrentes',
          paragraphs: [
            'Mantén carpeta de transcripciones, pruebas de idioma y cartas con versiones actualizadas. Verifica si piden evaluación de credenciales.',
            'No envíes traducciones no certificadas si el proveedor exige traductor jurado.'
          ]
        },
        {
          h2: 'Coordinar con admisiones',
          paragraphs: [
            'Algunas becas dependen de admisión universitaria primero. Registra dependencias en tu tabla para no invertir orden.',
            'Contacta oficinas internacionales por canales publicados en la universidad.'
          ]
        },
        { h2: 'Recordatorio', paragraphs: ['Seguir becas no sustituye requisitos migratorios ni de admisión.', ST_ES] }
      ],
      translated_faq_json: [
        { question: '¿Puedo usar la misma plantilla que estudiantes locales?', answer: 'Sí, añade columnas de visa, idioma y evaluación de credenciales.' },
        { question: '¿Las becas internacionales tienen plazos distintos?', answer: 'A menudo sí. Confirma en cada proveedor, no en agregadores genéricos.' },
        { question: '¿ScholarshipTop gestiona visas?', answer: 'No. ScholarshipTop no ofrece asesoría migratoria ni becas propias.' }
      ]
    },
    fr: {
      translated_title: 'Outils pour suivre les bourses en tant qu’étudiant international',
      translated_meta_title: 'Suivi des bourses pour étudiants internationaux (États-Unis)',
      translated_meta_description:
        'Calendrier, visa et liens officiels pour organiser des bourses aux États-Unis depuis l’étranger. Sans promesse d’admission ni de fonds. Info útil.',
      translated_summary:
        'Conseils de suivi pour étudiants internationaux candidatant à des bourses aux États-Unis, avec vérification officielle.',
      sections: [
        {
          h2: 'Enregistrer l’éligibilité',
          paragraphs: [
            'Notez nationalité, visa prévu, niveau et langue exigée. Beaucoup de bourses excluent certains statuts peu visibles dans les titres.',
            'Conservez lien officiel et date de dernière vérification.'
          ]
        },
        {
          h2: 'Fuseaux et dates limites',
          paragraphs: [
            'Convertissez les échéances à votre heure locale avec marge. Les portails peuvent clôturer selon l’heure américaine du financeur.',
            'Rappels 48 h avant pour téléverser traductions si requis.'
          ]
        },
        {
          h2: 'Pièces récurrentes',
          paragraphs: [
            'Dossier de relevés, tests de langue et lettres à jour. Vérifiez besoin d’évaluation credential.',
            'N’envoyez pas de traductions non conformes si certification exigée.'
          ]
        },
        {
          h2: 'Coordination avec admissions',
          paragraphs: [
            'Certaines bourses dépendent d’abord de l’admission. Notez les dépendances pour respecter l’ordre.',
            'Contactez les bureaux internationaux via canaux publiés par l’université.'
          ]
        },
        { h2: 'Rappel', paragraphs: ['Suivre les bourses ne remplace pas immigration ni admission.', ST_FR] }
      ],
      translated_faq_json: [
        { question: 'Même modèle que les étudiants locaux ?', answer: 'Oui, ajoutez colonnes visa, langue et évaluation des diplômes.' },
        { question: 'Dates différentes pour internationaux ?', answer: 'Souvent oui. Confirmez sur chaque financeur.' },
        { question: 'ScholarshipTop gère-t-il les visas ?', answer: 'Non. Pas d’avis migratoire ni de bourses propres.' }
      ]
    }
  },

  'how-to-find-scholarships-for-international-students': {
    es: {
      translated_title: 'Guía para encontrar becas para estudiantes internacionales',
      translated_meta_title: 'Encontrar becas para estudiantes internacionales en EE. UU.',
      translated_meta_description:
        'Fuentes oficiales, filtros de elegibilidad y señales de confianza al buscar becas en EE. UU. desde el extranjero. Verifica cada programa directamente.',
      translated_summary:
        'Pasos para buscar becas internacionales con criterios claros y menos ruido, priorizando páginas oficiales de proveedores y universidades.',
      sections: [
        {
          h2: 'Empezar por elegibilidad',
          paragraphs: [
            'Define nivel, país, campo y necesidad financiera antes de abrir listas enormes. Filtra por requisitos que ya cumples.',
            'Descarta rápido programas que exigen ciudadanía estadounidense si no la tienes.'
          ]
        },
        {
          h2: 'Fuentes confiables',
          paragraphs: [
            'Sitios de universidades, fundaciones y agencias gubernamentales publican reglas completas. Evita foros sin enlaces oficiales.',
            'ScholarshipTop puede ayudarte a explorar, pero la decisión final requiere leer la página del proveedor.'
          ]
        },
        {
          h2: 'Evaluar calidad del programa',
          paragraphs: [
            'Busca contacto verificable, historial del programa y proceso transparente. Desconfía de tasas para “desbloquear” becas.',
            'Compara montos, renovación y obligaciones (servicio, GPA) en texto oficial.'
          ]
        },
        {
          h2: 'Plan de búsqueda sostenible',
          paragraphs: [
            'Reserva bloques semanales cortos en lugar de maratones agotadores. Guarda 10–15 candidatas verificadas por mes.',
            'Combina becas internacionales con ayuda institucional una vez admitido, según políticas publicadas.'
          ]
        },
        { h2: 'Recordatorio', paragraphs: ['Encontrar opciones no garantiza adjudicación.', ST_ES] }
      ],
      translated_faq_json: [
        { question: '¿Las becas “full ride” son comunes?', answer: 'Son competitivas y con definiciones variables. Lee qué gastos cubre cada proveedor.' },
        { question: '¿Necesito agente de becas?', answer: 'No es obligatorio. Si usas servicio, verifica contrato y evita pagos opacos.' },
        { question: '¿ScholarshipTop cobra por listados?', answer: 'Consulta políticas actuales del sitio; las becas las otorgan terceros según sus reglas.' }
      ]
    },
    fr: {
      translated_title: 'Trouver des bourses pour étudiants internationaux',
      translated_meta_title: 'Trouver des bourses pour étudiants internationaux — USA',
      translated_meta_description:
        'Sources officielles, filtres d’éligibilité et signaux de confiance pour chercher des bourses aux États-Unis depuis l’étranger. Info útil. Info útil.',
      translated_summary:
        'Étapes pour chercher des bourses internationales avec critères clairs, en priorisant pages officielles des financeurs et universités.',
      sections: [
        {
          h2: 'Commencer par l’éligibilité',
          paragraphs: [
            'Définissez niveau, pays, filière et besoin financier avant les longues listes. Filtrez ce que vous remplissez déjà.',
            'Écartez vite les programmes réservés aux citoyens américains si ce n’est pas votre cas.'
          ]
        },
        {
          h2: 'Sources fiables',
          paragraphs: [
            'Sites universitaires, fondations et agences publiques publient règles complètes. Évitez forums sans lien officiel.',
            'ScholarshipTop aide à explorer, mais lisez toujours la page du financeur.'
          ]
        },
        {
          h2: 'Évaluer la qualité du programme',
          paragraphs: [
            'Contact vérifiable, historique et processus transparent. Méfiance des frais pour « débloquer » une bourse.',
            'Comparez montants, renouvellement et obligations dans le texte officiel.'
          ]
        },
        {
          h2: 'Recherche durable',
          paragraphs: [
            'Sessions courtes hebdomadaires plutôt que marathons. Gardez 10–15 candidatures vérifiées par mois.',
            'Combinez bourses internationales et aide institutionnelle après admission, selon règles publiées.'
          ]
        },
        { h2: 'Rappel', paragraphs: ['Trouver des options ne garantit pas d’attribution.', ST_FR] }
      ],
      translated_faq_json: [
        { question: 'Les « full ride » sont-elles courantes ?', answer: 'Compétitives et définitions variables. Lisez ce que chaque financeur couvre.' },
        { question: 'Faut-il un agent ?', answer: 'Non obligatoire. Vérifiez contrat et évitez paiements opaques.' },
        { question: 'ScholarshipTop facture-t-il les listes ?', answer: 'Voir politiques du site ; les bourses sont attribuées par des tiers.' }
      ]
    }
  },

  'how-to-write-scholarship-essay-as-international-student': {
    es: {
      translated_title: 'Redactar un ensayo de beca como estudiante internacional',
      translated_meta_title: 'Ensayo de beca como estudiante internacional: consejos clave',
      translated_meta_description:
        'Contexto cultural, claridad en inglés y ejemplos concretos sin exagerar. Alinea tu historia con la consigna y verifica requisitos oficiales.',
      translated_summary:
        'Consejos para ensayos de beca cuando estudias fuera de EE. UU. o aplicas en inglés como segunda lengua, sin prometer selección.',
      sections: [
        {
          h2: 'Leer la consigna con cuidado',
          paragraphs: [
            'Identifica qué valoran (impacto comunitario, liderazgo, adaptación). Responde con un arco claro, no con biografía completa.',
            'Si permiten idioma distinto, confirma en instrucciones oficiales; si exigen inglés, prioriza claridad sobre vocabulario raro.'
          ]
        },
        {
          h2: 'Contexto internacional sin clichés',
          paragraphs: [
            'Explica brevemente tu trayectoria educativa y por qué EE. UU. encaja con metas reales. Evita estereotipos o tono de pity.',
            'Muestra cómo aportarás a campus o comunidad con ejemplos medibles.'
          ]
        },
        {
          h2: 'Claridad y revisión lingüística',
          paragraphs: [
            'Frases cortas y párrafos enfocados. Pide revisión de gramática a un hablante avanzado, manteniendo tu voz.',
            'No dejes que otra persona reescriba toda la historia: autenticidad y originalidad importan.'
          ]
        },
        {
          h2: 'Detalles verificables',
          paragraphs: [
            'Usa datos reales de proyectos, voluntariado o estudios. No inventes estadísticas ni cargos.',
            'Relaciona logros con la misión del proveedor leída en su sitio oficial.'
          ]
        },
        { h2: 'Recordatorio', paragraphs: ['Un ensayo fuerte no compensa requisitos de visa o elegibilidad faltantes.', ST_ES] }
      ],
      translated_faq_json: [
        { question: '¿Debo explicar dificultades económicas?', answer: 'Solo si es relevante y veraz. Enfócate en acciones y metas, no solo en carencias.' },
        { question: '¿Puedo mezclar español y inglés?', answer: 'Solo si el proveedor lo autoriza. Por defecto, sigue el idioma exigido.' },
        { question: '¿ScholarshipTop corrige ensayos?', answer: 'No. Ofrece guías; la evaluación la hace cada proveedor.' }
      ]
    },
    fr: {
      translated_title: 'Rédiger un essai de bourse en tant qu’étudiant international',
      translated_meta_title: 'Essai de bourse en tant qu’étudiant international : conseils',
      translated_meta_description:
        'Contexte culturel, clarté en anglais et exemples concrets sans exagération. Alignez votre récit sur la consigne et les exigences officielles.',
      translated_summary:
        'Conseils d’essai pour candidats hors États-Unis ou rédigeant en anglais langue seconde, sans promesse de sélection.',
      sections: [
        {
          h2: 'Lire la consigne attentivement',
          paragraphs: [
            'Identifiez ce qui est valorisé (impact, leadership, adaptation). Répondez avec un arc clair, pas une autobiographie entière.',
            'Si une autre langue est autorisée, confirmez officiellement ; sinon, privilégiez clarté plutôt que vocabulaire rare.'
          ]
        },
        {
          h2: 'Contexte international sans clichés',
          paragraphs: [
            'Expliquez brièvement votre parcours et pourquoi les États-Unis servent des objectifs réels. Évitez pitié ou stéréotypes.',
            'Montrez votre apport au campus avec exemples mesurables.'
          ]
        },
        {
          h2: 'Clarté et relecture linguistique',
          paragraphs: [
            'Phrases courtes, paragraphes ciblés. Demandez une relecture grammaticale en gardant votre voix.',
            'Ne laissez pas réécrire tout le texte : authenticité et originalité comptent.'
          ]
        },
        {
          h2: 'Faits vérifiables',
          paragraphs: [
            'Données réelles de projets, bénévolat ou études. Pas de statistiques ou titres inventés.',
            'Reliez les réalisations à la mission du financeur sur son site officiel.'
          ]
        },
        { h2: 'Rappel', paragraphs: ['Un bon essai ne compense pas visa ou éligibilité manquante.', ST_FR] }
      ],
      translated_faq_json: [
        { question: 'Dois-je détailler les difficultés financières ?', answer: 'Si pertinent et vrai. Orientez vers actions et objectifs.' },
        { question: 'Mélanger français et anglais ?', answer: 'Seulement si autorisé. Sinon, suivez la langue exigée.' },
        { question: 'ScholarshipTop corrige-t-il les essais ?', answer: 'Non. Guides uniquement ; évaluation par chaque financeur.' }
      ]
    }
  },

  'how-to-get-full-scholarship-usa': {
    es: {
      translated_title: 'Cómo aspirar a una beca completa en EE. UU.',
      translated_meta_title: 'Beca completa en EE. UU.: guía realista para estudiantes',
      translated_meta_description:
        'Qué suele significar “beca completa”, quién califica y cómo preparar perfil y solicitudes sin promesas. Verifica definiciones en cada proveedor.',
      translated_summary:
        'Guía realista sobre becas que cubren gran parte de costos en Estados Unidos. La cobertura exacta siempre la define el proveedor oficial.',
      sections: [
        {
          h2: 'Qué significa “completa”',
          paragraphs: [
            'Puede incluir matrícula total o parcial, alojamiento, comidas o stipend. Lee la letra pequeña en la página del programa.',
            'Algunas “full ride” universitarias dependen de admisión y paquete institucional, no solo de becas privadas.'
          ]
        },
        {
          h2: 'Perfil competitivo sin mitos',
          paragraphs: [
            'Fuerte trayectoria académica, actividades con impacto y ensayos específicos ayudan, pero no garantizan cobertura total.',
            'Evita servicios que prometen 100 % de éxito a cambio de pago.'
          ]
        },
        {
          h2: 'Combinar fuentes',
          paragraphs: [
            'Ayuda institucional, becas privadas y programas externos pueden acumularse con límites. Consulta políticas oficiales de tu universidad.',
            'Completa formularios base (como FAFSA si aplica a tu estatus) en fechas publicadas.'
          ]
        },
        {
          h2: 'Plan plurianual',
          paragraphs: [
            'Muchas becas completas exigen renovación con GPA o servicio. Registra obligaciones antes de aceptar.',
            'Prepara cartas y ensayos con tiempo; programas grandes tienen plazos tempranos.'
          ]
        },
        { h2: 'Recordatorio', paragraphs: ['Nadie puede prometer beca completa fuera del proveedor oficial.', ST_ES] }
      ],
      translated_faq_json: [
        { question: '¿Los deportistas tienen más becas completas?', answer: 'Algunos programas deportivos cubren costos, con reglas NCAA/NAIA u otras. Verifica elegibilidad deportiva oficial.' },
        { question: '¿Internacionales pueden obtener beca completa?', answer: 'Es posible pero más competitivo. Busca programas que admitan no residentes y lee restricciones.' },
        { question: '¿ScholarshipTop otorga becas completas?', answer: 'No. ScholarshipTop no concede fondos; los proveedores definen montos y criterios.' }
      ]
    },
    fr: {
      translated_title: 'Viser une bourse complète aux États-Unis',
      translated_meta_title: 'Bourse complète aux États-Unis : guide réaliste étudiants',
      translated_meta_description:
        'Ce que signifie souvent « bourse complète », profils compétitifs et préparation sans promesses. Vérifiez la définition sur chaque page officielle.',
      translated_summary:
        'Guide réaliste sur les bourses couvrant une large part des coûts aux États-Unis. La couverture exacte est définie par le financeur.',
      sections: [
        {
          h2: 'Sens de « complète »',
          paragraphs: [
            'Peut couvrir frais totaux ou partiels, logement, repas ou allocation. Lisez les détails officiels.',
            'Certaines offres universitaires dépendent de l’admission et du package institutionnel.'
          ]
        },
        {
          h2: 'Profil compétitif sans mythes',
          paragraphs: [
            'Parcours solide, activités à impact et essais ciblés aident, sans garantir couverture totale.',
            'Évitez services promettant 100 % de réussite payants.'
          ]
        },
        {
          h2: 'Combiner les sources',
          paragraphs: [
            'Aide institutionnelle, bourses privées et programmes externes peuvent se cumuler avec limites. Lisez règles officielles.',
            'Complétez formulaires de base (FAFSA si applicable) aux dates publiées.'
          ]
        },
        {
          h2: 'Plan pluriannuel',
          paragraphs: [
            'Renouvellement souvent lié à GPA ou service. Notez obligations avant d’accepter.',
            'Anticipez lettres et essais ; grands programmes ferment tôt.'
          ]
        },
        { h2: 'Rappel', paragraphs: ['Personne ne peut promettre une bourse complète hors financeur officiel.', ST_FR] }
      ],
      translated_faq_json: [
        { question: 'Les sportifs ont-ils plus de bourses complètes ?', answer: 'Certains programmes couvrent des coûts avec règles NCAA/NAIA ou autres. Vérifiez éligibilité sportive.' },
        { question: 'Les internationaux peuvent-ils viser le complet ?', answer: 'Possible mais très compétitif. Cherchez programmes ouverts aux non-résidents.' },
        { question: 'ScholarshipTop accorde-t-il des bourses complètes ?', answer: 'Non. Les financeurs définissent montants et critères.' }
      ]
    }
  },

  'graduate-scholarship-application-checklist': {
    es: {
      translated_title: 'Lista de verificación para becas de posgrado',
      translated_meta_title: 'Checklist de becas de posgrado: qué preparar y cuándo',
      translated_meta_description:
        'CV académico, ensayo, cartas, transcripciones y plazos para becas de maestría o doctorado. Revisa requisitos en cada proveedor oficial. Info útil.',
      translated_summary:
        'Checklist práctica para solicitudes de beca en estudios de posgrado, adaptable según exija cada programa en su página oficial.',
      sections: [
        {
          h2: 'Documentos académicos',
          paragraphs: [
            'Transcripciones, CV académico, pruebas si aplican y descripción de investigación o proyecto. Verifica formatos de archivo.',
            'Algunos programas piden portafolio o publicaciones; no envíes material extra no solicitado.'
          ]
        },
        {
          h2: 'Ensayo o statement of purpose',
          paragraphs: [
            'Alinea metas de investigación o carrera con la misión del proveedor. Sé específico sobre por qué ese programa, no solo “quiero estudiar”.',
            'Adapta cada versión; los comités detectan plantillas genéricas.'
          ]
        },
        {
          h2: 'Cartas y referencias',
          paragraphs: [
            'Pide a quienes conocen tu trabajo de grado o investigación. Proporciona plazo, consigna y borrador de objetivos.',
            'Confirma si las cartas se envían por portal separado del tuyo.'
          ]
        },
        {
          h2: 'Calendario y seguimiento',
          paragraphs: [
            'Anota plazos de admisión y beca; a veces son distintos. Guarda confirmaciones de envío.',
            'Prepara entrevista si el proveedor la menciona en instrucciones oficiales.'
          ]
        },
        { h2: 'Recordatorio', paragraphs: ['La lista orienta; no sustituye la checklist del proveedor.', ST_ES] }
      ],
      translated_faq_json: [
        { question: '¿Necesito admisión antes de la beca?', answer: 'Depende del programa. Algunas becas van ligadas a admisión departamental; lee orden en sitio oficial.' },
        { question: '¿Puedo reutilizar CV de empleo?', answer: 'Mejor CV académico con publicaciones, enseñanza e investigación según consigna.' },
        { question: '¿ScholarshipTop revisa mi checklist?', answer: 'No. Valida requisitos directamente con cada proveedor o universidad.' }
      ]
    },
    fr: {
      translated_title: 'Checklist de candidature bourse pour le supérieur',
      translated_meta_title: 'Checklist bourses master et doctorat : quoi préparer',
      translated_meta_description:
        'CV académique, essai, lettres, relevés et dates pour bourses de master ou doctorat. Vérifiez chaque exigence sur la page officielle. Info útil.',
      translated_summary:
        'Checklist pratique pour bourses de cycles supérieurs, à adapter selon chaque programme sur sa page officielle.',
      sections: [
        {
          h2: 'Documents académiques',
          paragraphs: [
            'Relevés, CV académique, tests si requis et description de recherche. Vérifiez formats de fichier.',
            'Portfolio ou publications seulement si demandés.'
          ]
        },
        {
          h2: 'Essai ou statement of purpose',
          paragraphs: [
            'Alignez objectifs de recherche ou carrière sur la mission du financeur. Précisez pourquoi ce programme.',
            'Adaptez chaque version ; les jurys repèrent les modèles génériques.'
          ]
        },
        {
          h2: 'Lettres et références',
          paragraphs: [
            'Choisissez des personnes connaissant votre travail de licence ou recherche. Donnez délai, consigne et brouillon d’objectifs.',
            'Vérifiez envoi séparé via portail référent.'
          ]
        },
        {
          h2: 'Calendrier et suivi',
          paragraphs: [
            'Dates admission et bourse parfois distinctes. Conservez confirmations d’envoi.',
            'Préparez entretien si mentionné officiellement.'
          ]
        },
        { h2: 'Rappel', paragraphs: ['Cette liste guide ; elle ne remplace pas celle du financeur.', ST_FR] }
      ],
      translated_faq_json: [
        { question: 'Faut-il être admis avant la bourse ?', answer: 'Selon le programme. Lisez l’ordre des étapes sur le site officiel.' },
        { question: 'Réutiliser un CV emploi ?', answer: 'Préférez un CV académique avec recherche, enseignement et publications.' },
        { question: 'ScholarshipTop valide-t-il ma checklist ?', answer: 'Non. Validez avec chaque financeur ou université.' }
      ]
    }
  },

  'verify-scholarship-eligibility-usa': {
    es: {
      translated_title: 'Cómo verificar elegibilidad de becas en EE. UU.',
      translated_meta_title: 'Verificar elegibilidad de becas en EE. UU. sin foros',
      translated_meta_description:
        'Lee criterios oficiales, evita foros contradictorios y documenta dudas con el proveedor. Pasos claros sin garantizar admisión ni premio. Info útil.',
      translated_summary:
        'Método para confirmar si cumples requisitos de una beca usando solo fuentes oficiales y contacto verificable del proveedor.',
      sections: [
        {
          h2: 'Empezar en la página oficial',
          paragraphs: [
            'Busca sección eligibility con ciudadanía, nivel, campo, GPA mínimo y situación financiera. Guarda captura con fecha.',
            'No te bases en resúmenes de redes que omiten excepciones.'
          ]
        },
        {
          h2: 'Cruzar con tu perfil real',
          paragraphs: [
            'Haz tabla sí/no para cada requisito. Si hay zona gris (residencia, medio tiempo), anota pregunta para el proveedor.',
            'Algunas becas permiten apelación de elegibilidad; otras no.'
          ]
        },
        {
          h2: 'Evitar foros como única fuente',
          paragraphs: [
            'Los foros mezclan años y reglas viejas. Úsalos solo para ideas de preguntas, no para decisiones finales.',
            'Prioriza PDF oficial, FAQ del proveedor y correo desde dominio verificado.'
          ]
        },
        {
          h2: 'Contactar al proveedor con preguntas claras',
          paragraphs: [
            'Escribe situación específica en una frase y cita enlace del programa. Evita enviar datos sensibles por canales no seguros.',
            'Guarda respuesta por escrito si te orientan sobre elegibilidad.'
          ]
        },
        { h2: 'Recordatorio', paragraphs: ['Verificar elegibilidad ahorra tiempo; no implica que te seleccionen.', ST_ES] }
      ],
      translated_faq_json: [
        { question: '¿Puedo aplicar “por si acaso”?', answer: 'Si incumples requisitos duros, suele ser rechazo automático. Mejor invertir tiempo en becas elegibles.' },
        { question: '¿La universidad confirma elegibilidad externa?', answer: 'A veces ayuda financiera orienta sobre combinación; la beca privada responde sus propias reglas.' },
        { question: '¿ScholarshipTop decide elegibilidad?', answer: 'No. Solo el proveedor define y aplica criterios oficiales.' }
      ]
    },
    fr: {
      translated_title: 'Vérifier l’éligibilité aux bourses aux États-Unis',
      translated_meta_title: 'Vérifier l’éligibilité aux bourses aux États-Unis sans forum',
      translated_meta_description:
        'Lisez critères officiels, évitez forums contradictoires et documentez vos doutes avec le financeur. Étapes claires sans garantie d’attribution.',
      translated_summary:
        'Méthode pour confirmer votre éligibilité en s’appuyant sur sources officielles et contact vérifiable du financeur.',
      sections: [
        {
          h2: 'Commencer sur la page officielle',
          paragraphs: [
            'Section eligibility : citoyenneté, niveau, filière, GPA minimum, besoin financier. Capture datée.',
            'Ne vous fiez pas aux résumés sociaux incomplets.'
          ]
        },
        {
          h2: 'Comparer à votre profil',
          paragraphs: [
            'Tableau oui/non par critère. Zones grises (résidence, temps partiel) → question au financeur.',
            'Certaines bourses permettent appel ; d’autres non.'
          ]
        },
        {
          h2: 'Éviter forums comme seule source',
          paragraphs: [
            'Mélange d’anciennes règles. Forums pour idées de questions, pas décision finale.',
            'Priorisez PDF officiel, FAQ financeur, e-mail domaine vérifié.'
          ]
        },
        {
          h2: 'Contacter le financeur clairement',
          paragraphs: [
            'Situation en une phrase + lien du programme. Pas de données sensibles sur canaux non sécurisés.',
            'Conservez réponse écrite si fournie.'
          ]
        },
        { h2: 'Rappel', paragraphs: ['Vérifier l’éligibilité fait gagner du temps sans garantir sélection.', ST_FR] }
      ],
      translated_faq_json: [
        { question: 'Candidater « au cas où » ?', answer: 'Critères durs non remplis → rejet fréquent. Mieux vaut cibler l’éligible.' },
        { question: 'L’université confirme-t-elle l’externe ?', answer: 'L’aide financière peut orienter sur cumul ; la bourse privée applique ses règles.' },
        { question: 'ScholarshipTop décide-t-il l’éligibilité ?', answer: 'Non. Seul le financeur définit et applique les critères.' }
      ]
    }
  },

  'scholarship-faq-school-students-applying-early': {
    es: {
      translated_title: 'FAQ de becas para estudiantes que aplican temprano',
      translated_meta_title: 'Becas para quienes aplican temprano: preguntas frecuentes',
      translated_meta_description:
        'Ventanas tempranas, ventajas reales y mitos para estudiantes de secundaria que empiezan antes. Confirma fechas y reglas en cada proveedor. Info útil.',
      translated_summary:
        'Preguntas frecuentes sobre empezar la búsqueda de becas antes del último año de secundaria, con enfoque en planificación verificable.',
      sections: [
        {
          h2: '¿Vale la pena empezar temprano?',
          paragraphs: [
            'Sí para hábitos, registro de actividades y conocer tipos de beca. Las solicitudes intensivas suelen concentrarse más tarde.',
            'Evita pagar servicios que prometen becas a freshman de secundaria sin transparencia.'
          ]
        },
        {
          h2: 'Qué puedes hacer cada año',
          paragraphs: [
            'Primeros años: explorar y fortalecer perfil. Años medios: ensayos borrador y relaciones para cartas. Último año: envíos con plazos oficiales.',
            'Guarda calendario con fechas verificadas, no rumores.'
          ]
        },
        {
          h2: 'Becas con plazos tempranos',
          paragraphs: [
            'Algunos programas grandes cierran en otoño del último año. Lee si hay rondas prioritarias o ventajas de envío temprano reales.',
            'Early submission no sustituye elegibilidad.'
          ]
        },
        {
          h2: 'Coordinar con padres y escuela',
          paragraphs: [
            'Comparte calendario familiar y límites de presupuesto para solicitudes con costo. Orientación escolar puede señalar becas locales verificadas.',
            'Mantén expectativas realistas: empezar temprano no garantiza montos.'
          ]
        },
        { h2: 'Recordatorio', paragraphs: ['Planificar temprano ayuda; no promete becas.', ST_ES] }
      ],
      translated_faq_json: [
        { question: '¿Hay becas solo para grado 9?', answer: 'Pocas y con reglas estrictas. Verifica elegibilidad por grado en cada proveedor.' },
        { question: '¿Debo escribir ensayos años antes?', answer: 'Borradores sí; versiones finales cerca del plazo con consigna actualizada.' },
        { question: '¿ScholarshipTop reserva becas por aplicar temprano?', answer: 'No. Los plazos y reglas los publica cada proveedor.' }
      ]
    },
    fr: {
      translated_title: 'FAQ bourses pour lycéens qui candidatent tôt',
      translated_meta_title: 'Bourses en candidature anticipée : questions fréquentes',
      translated_meta_description:
        'Fenêtres précoces, avantages réels et mythes pour lycéens qui commencent tôt. Confirmez dates et règles sur chaque page officielle. Info útil.',
      translated_summary:
        'Questions fréquentes sur la recherche de bourses avant la terminale, avec planification vérifiable.',
      sections: [
        {
          h2: 'Vaut-il commencer tôt ?',
          paragraphs: [
            'Oui pour habitudes, suivi d’activités et connaissance des types. Candidatures intenses souvent plus tard.',
            'Évitez services opaques promettant bourses dès la seconde.'
          ]
        },
        {
          h2: 'Actions par année',
          paragraphs: [
            'Début : explorer et renforcer profil. Milieu : brouillons d’essais et référents. Terminale : envois aux dates officielles.',
            'Calendrier avec dates vérifiées, pas rumeurs.'
          ]
        },
        {
          h2: 'Bourses à dates hâtives',
          paragraphs: [
            'Grands programmes ferment parfois à l’automne de terminale. Lisez vraies priorités d’envoi anticipé.',
            'Envoi précoce ne remplace pas l’éligibilité.'
          ]
        },
        {
          h2: 'Coordination famille et lycée',
          paragraphs: [
            'Partagez calendrier et budget pour frais de dossier. Orientation peut signaler bourses locales vérifiables.',
            'Attentes réalistes : commencer tôt ne garantit pas de montants.'
          ]
        },
        { h2: 'Rappel', paragraphs: ['Planifier tôt aide ; cela ne promet pas de bourses.', ST_FR] }
      ],
      translated_faq_json: [
        { question: 'Bourses dès la seconde ?', answer: 'Peu nombreuses et critères stricts. Vérifiez niveau scolaire exigé.' },
        { question: 'Rédiger des essais des années avant ?', answer: 'Brouillons oui ; version finale proche de la date avec consigne à jour.' },
        { question: 'ScholarshipTop réserve-t-il si vous êtes tôt ?', answer: 'Non. Dates et règles viennent de chaque financeur.' }
      ]
    }
  },

  'scholarship-faq-parents-worried-scams': {
    es: {
      translated_title: 'FAQ para padres preocupados por estafas de becas',
      translated_meta_title: 'Padres y estafas de becas: preguntas frecuentes de seguridad',
      translated_meta_description:
        'Señales de alerta, conversación con hijos y verificación de proveedores cuando temes estafas. Pasos prácticos sin prometer becas ni resultados.',
      translated_summary:
        'Respuestas para padres que quieren proteger a sus hijos sin frenar una búsqueda legítima de becas, usando verificación oficial.',
      sections: [
        {
          h2: 'Señales que deben preocupar',
          paragraphs: [
            'Pagos para “liberar” fondos, presión por datos bancarios, garantías de beca o falta de información verificable sobre el proveedor.',
            'Sitios nuevos sin historial y correos con dominios extraños merecen pausa y verificación cruzada.'
          ]
        },
        {
          h2: 'Hablar con tu hijo sin alarmismo',
          paragraphs: [
            'Establece regla familiar: ningún pago ni documento sin revisión conjunta. Comparte checklist de verificación.',
            'Anima a mostrar ofertas “demasiado buenas” antes de responder.'
          ]
        },
        {
          h2: 'Verificar proveedores juntos',
          paragraphs: [
            'Abran el sitio oficial desde búsqueda independiente, no desde enlaces de correo. Confirmen contacto y proceso con universidad si aplica.',
            'Guarden evidencia si reportan fraude a autoridades o plataformas.'
          ]
        },
        {
          h2: 'Becas legítimas siguen siendo posibles',
          paragraphs: [
            'La cautela no significa evitar todas las becas. Significa leer reglas, plazos y documentos con calma.',
            'ScholarshipTop puede orientar, pero la adjudicación y pagos los hace cada proveedor verificado por ustedes.'
          ]
        },
        { h2: 'Recordatorio', paragraphs: ['La vigilancia reduce riesgo; no selecciona becas por ustedes.', ST_ES] }
      ],
      translated_faq_json: [
        { question: '¿Los “seminarios gratuitos” son estafa?', answer: 'No siempre, pero si terminan en venta agresiva sin transparencia, trátalo como alerta.' },
        { question: '¿Debemos pagar por “búsqueda premium”?', answer: 'Evalúen contrato y resultados verificables. Muchas becas legítimas son públicas con trabajo de solicitud.' },
        { question: '¿ScholarshipTop pide pagos por adjudicar?', answer: 'ScholarshipTop no concede becas. Desconfíen de cualquier mensaje que prometa premio a cambio de pago.' }
      ]
    },
    fr: {
      translated_title: 'FAQ parents inquiets des arnaques aux bourses',
      translated_meta_title: 'Parents et arnaques aux bourses : FAQ sécurité et confiance',
      translated_meta_description:
        'Signaux d’alerte, dialogue avec l’enfant et vérification des financeurs. Étapes pratiques sans promesse de bourse ni de résultat. Info útil.',
      translated_summary:
        'Réponses pour parents qui veulent protéger leur enfant sans bloquer une recherche légitime, via vérification officielle.',
      sections: [
        {
          h2: 'Signaux inquiétants',
          paragraphs: [
            'Paiements pour « débloquer » fonds, pression pour coordonnées bancaires, garanties de bourse ou absence d’infos vérifiables sur le financeur.',
            'Sites récents sans historique et e-mails à domaines bizarres : pause et recoupement.'
          ]
        },
        {
          h2: 'Parler sans alarmisme',
          paragraphs: [
            'Règle familiale : aucun paiement ni document sans relecture commune. Partagez une checklist de vérification.',
            'Encouragez à montrer offres « trop belles » avant de répondre.'
          ]
        },
        {
          h2: 'Vérifier ensemble',
          paragraphs: [
            'Ouvrez le site officiel via recherche indépendante, pas via liens d’e-mail. Confirmez avec l’université si pertinent.',
            'Conservez preuves pour signaler une fraude si nécessaire.'
          ]
        },
        {
          h2: 'Bourses légitimes restent possibles',
          paragraphs: [
            'Prudence ne veut pas dire éviter toutes les bourses. Lisez règles, dates et pièces calmement.',
            'ScholarshipTop oriente ; attribution et paiements relèvent du financeur que vous vérifiez.'
          ]
        },
        { h2: 'Rappel', paragraphs: ['La vigilance réduit le risque ; elle ne choisit pas les bourses.', ST_FR] }
      ],
      translated_faq_json: [
        { question: 'Séminaires « gratuits » = arnaque ?', answer: 'Pas toujours, mais vente agressive sans transparence = signal.' },
        { question: 'Payer une « recherche premium » ?', answer: 'Lisez contrat et preuves. Beaucoup de bourses légitimes sont publiques avec effort de dossier.' },
        { question: 'ScholarshipTop demande-t-il paiement pour attribuer ?', answer: 'Il n’accorde pas de bourses. Méfiance des messages promettant un prix contre paiement.' }
      ]
    }
  }
};

