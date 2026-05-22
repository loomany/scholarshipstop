import type { UserIntent } from '@/lib/iqAssessmentTypes';
import type { IqLocale } from '@/lib/iq/i18n/iqLocales';

export type ContextualIntentCopy = {
  eyebrow: string;
  title: string;
  text: string;
  outcome: string;
};

export type IqContextualFunnelCopy = {
  intents: Record<UserIntent, ContextualIntentCopy>;
  highlights: Array<{ title: string; text: string }>;
  startTest: string;
  startSubline: string;
  introAside: {
    badge: string;
    title: string;
    body: string;
    pillars: Array<{ name: string; detail: string }>;
    disclaimer: string;
  };
  emailGate: {
    preEyebrow: string;
    postEyebrow: string;
    title: string;
    preBody: string;
    postBody: string;
    emailLabel: string;
    emailPlaceholder: string;
    saving: string;
    continuePre: string;
    continuePost: string;
    googleOpening: string;
    googleSignIn: string;
    noPasswordHint: string;
    errors: {
      invalidEmail: string;
      accountFailed: string;
      sessionFailed: string;
      connection: string;
      googleFailed: string;
    };
  };
  loadingProgress: string;
  iqReadyTitle: string;
  iqReadyBody: string;
  iqReadySubtitle: string;
  iqReadyHighlights: [string, string, string];
  getReportCta: string;
  revealGrantsCta: string;
  startAgain: string;
  checkingProfile: string;
  preparingReportAccess: string;
  strategyAccount: {
    savingStrategy: string;
    updatingProfile: string;
    sessionFoundHint: string;
    matchesFound: string;
    saveBeforeUnlock: string;
    finalStep: string;
    saveMatchesBody: string;
    emailLabel: string;
    emailPlaceholder: string;
    noPasswordHint: string;
    savingMatches: string;
    saveAndUnlock: string;
    errors: {
      invalidEmail: string;
      profileUpdateFailed: string;
      generic: string;
    };
  };
};

const EN_INTENTS: Record<UserIntent, ContextualIntentCopy> = {
  general_iq: {
    eyebrow: 'Cognitive profile',
    title: 'Take a research-informed IQ-style test before you choose your next move.',
    text: 'This short cognitive assessment measures how you solve problems across reasoning, speed, spatial thinking, verbal logic, and decision-making.',
    outcome: 'Then we translate your profile into a practical scholarship strategy.'
  },
  essay_prep: {
    eyebrow: 'Essay prep path',
    title: 'Discover the thinking pattern behind stronger scholarship essays.',
    text: 'The test helps identify whether your advantage is structure, logic, verbal reasoning, or pattern recognition before you write.',
    outcome:
      'Your final strategy will point toward essay angles and awards where your profile can stand out.'
  },
  college_fit: {
    eyebrow: 'College fit path',
    title: 'Compare schools through the way your brain works.',
    text: 'Instead of guessing, use a five-domain cognitive profile to understand how you evaluate tradeoffs, deadlines, and application styles.',
    outcome:
      'Your final strategy will connect your profile to school and scholarship-fit decisions.'
  },
  scholarship_match: {
    eyebrow: 'Scholarship match path',
    title: 'Find scholarships that fit how your brain works.',
    text: 'Take the same 30-question cognitive assessment used for the general IQ flow, then add a few goals so the result becomes useful.',
    outcome:
      'Your final strategy will prioritize awards, reading, and next steps based on your strengths.'
  },
  provider_research: {
    eyebrow: 'Provider research path',
    title: 'Prioritize scholarship providers with a clearer strategy.',
    text: 'A cognitive profile can help you decide whether to focus on essay-heavy providers, fast applications, research awards, or logic-based opportunities.',
    outcome:
      'Your final strategy will help you choose which providers deserve attention first.'
  },
  deadline_strategy: {
    eyebrow: 'Deadline strategy path',
    title: 'Build an application plan around your execution style.',
    text: 'The assessment looks at speed, prioritization, and reasoning so your scholarship plan can match how you actually work under pressure.',
    outcome:
      'Your final strategy will separate quick wins from higher-effort deadlines.'
  }
};

const ES_INTENTS: Record<UserIntent, ContextualIntentCopy> = {
  general_iq: {
    eyebrow: 'Perfil cognitivo',
    title: 'Haz un test de CI basado en investigación antes de tu próximo paso.',
    text: 'Esta evaluación breve mide cómo resuelves problemas en razonamiento, velocidad, pensamiento espacial, lógica verbal y toma de decisiones.',
    outcome: 'Luego traducimos tu perfil en una estrategia práctica de becas.'
  },
  essay_prep: {
    eyebrow: 'Ruta de ensayos',
    title: 'Descubre el patrón de pensamiento detrás de mejores ensayos de becas.',
    text: 'El test identifica si tu ventaja es estructura, lógica, razonamiento verbal o reconocimiento de patrones antes de escribir.',
    outcome:
      'Tu estrategia final señalará ángulos de ensayo y premios donde tu perfil destaque.'
  },
  college_fit: {
    eyebrow: 'Ruta de encaje universitario',
    title: 'Compara universidades según cómo funciona tu mente.',
    text: 'En lugar de adivinar, usa un perfil en cinco dominios para entender cómo evalúas compensaciones, plazos y estilos de solicitud.',
    outcome:
      'Tu estrategia final conectará tu perfil con decisiones de universidad y becas.'
  },
  scholarship_match: {
    eyebrow: 'Ruta de coincidencia de becas',
    title: 'Encuentra becas que encajen con cómo piensas.',
    text: 'Haz la misma evaluación de 30 preguntas del flujo general de CI y añade unos objetivos para que el resultado sea útil.',
    outcome:
      'Tu estrategia final priorizará premios, lecturas y próximos pasos según tus fortalezas.'
  },
  provider_research: {
    eyebrow: 'Ruta de investigación de proveedores',
    title: 'Prioriza proveedores de becas con una estrategia más clara.',
    text: 'Un perfil cognitivo ayuda a decidir si centrarte en proveedores con mucho ensayo, solicitudes rápidas, premios de investigación u oportunidades lógicas.',
    outcome:
      'Tu estrategia final ayudará a elegir qué proveedores merecen atención primero.'
  },
  deadline_strategy: {
    eyebrow: 'Ruta de plazos',
    title: 'Construye un plan de solicitudes según tu estilo de ejecución.',
    text: 'La evaluación mira velocidad, priorización y razonamiento para que tu plan de becas coincida con cómo trabajas bajo presión.',
    outcome:
      'Tu estrategia final separará victorias rápidas de plazos que exigen más esfuerzo.'
  }
};

const FR_INTENTS: Record<UserIntent, ContextualIntentCopy> = {
  general_iq: {
    eyebrow: 'Profil cognitif',
    title: 'Passez un test de QI fondé sur la recherche avant votre prochaine étape.',
    text: 'Cette évaluation courte mesure votre façon de résoudre des problèmes : raisonnement, vitesse, pensée spatiale, logique verbale et décision.',
    outcome: 'Nous traduisons ensuite votre profil en stratégie de bourses concrète.'
  },
  essay_prep: {
    eyebrow: 'Parcours essais',
    title: 'Découvrez le schéma de pensée derrière de meilleurs essais de bourses.',
    text: 'Le test indique si votre avantage est la structure, la logique, le raisonnement verbal ou la reconnaissance de motifs avant d’écrire.',
    outcome:
      'Votre stratégie finale orientera les angles d’essai et les prix où votre profil ressort.'
  },
  college_fit: {
    eyebrow: 'Parcours adéquation université',
    title: 'Comparez les écoles selon le fonctionnement de votre esprit.',
    text: 'Utilisez un profil en cinq domaines pour comprendre comment vous évaluez compromis, délais et styles de candidature.',
    outcome:
      'Votre stratégie finale reliera votre profil aux choix d’école et de bourses.'
  },
  scholarship_match: {
    eyebrow: 'Parcours correspondance bourses',
    title: 'Trouvez des bourses adaptées à votre façon de penser.',
    text: 'Passez la même évaluation de 30 questions que le flux QI général, puis ajoutez quelques objectifs pour un résultat utile.',
    outcome:
      'Votre stratégie finale priorisera prix, lectures et prochaines étapes selon vos forces.'
  },
  provider_research: {
    eyebrow: 'Parcours recherche fournisseurs',
    title: 'Priorisez les fournisseurs de bourses avec une stratégie plus claire.',
    text: 'Un profil cognitif aide à choisir entre fournisseurs axés essais, candidatures rapides, prix de recherche ou opportunités logiques.',
    outcome:
      'Votre stratégie finale indiquera quels fournisseurs méritent l’attention en premier.'
  },
  deadline_strategy: {
    eyebrow: 'Parcours délais',
    title: 'Construisez un plan de candidatures selon votre style d’exécution.',
    text: 'L’évaluation examine vitesse, priorisation et raisonnement pour aligner votre plan de bourses sur votre travail sous pression.',
    outcome:
      'Votre stratégie finale séparera gains rapides et délais plus exigeants.'
  }
};

function buildLocaleCopy(
  intents: Record<UserIntent, ContextualIntentCopy>,
  locale: 'en' | 'es' | 'fr'
): IqContextualFunnelCopy {
  const highlights =
    locale === 'en'
      ? [
          {
            title: '30 focused questions',
            text: 'Short enough to finish, structured enough to reveal a useful pattern.'
          },
          {
            title: '5 cognitive domains',
            text: 'Reasoning, spatial intelligence, verbal logic, numerical logic, and decision speed.'
          },
          {
            title: 'Strategy after score',
            text: 'Your result becomes a scholarship plan after matching details.'
          }
        ]
      : locale === 'es'
        ? [
            {
              title: '30 preguntas enfocadas',
              text: 'Lo bastante corto para terminar, lo bastante estructurado para revelar un patrón útil.'
            },
            {
              title: '5 dominios cognitivos',
              text: 'Razonamiento, inteligencia espacial, lógica verbal, lógica numérica y velocidad de decisión.'
            },
            {
              title: 'Estrategia tras la puntuación',
              text: 'Tu resultado se convierte en un plan de becas tras los datos de coincidencia.'
            }
          ]
        : [
            {
              title: '30 questions ciblées',
              text: 'Assez court pour finir, assez structuré pour révéler un motif utile.'
            },
            {
              title: '5 domaines cognitifs',
              text: 'Raisonnement, intelligence spatiale, logique verbale, logique numérique et vitesse de décision.'
            },
            {
              title: 'Stratégie après le score',
              text: 'Votre résultat devient un plan de bourses après les détails de correspondance.'
            }
          ];

  const intro =
    locale === 'en'
      ? {
          badge: 'Research-informed',
          title:
            'Inspired by modern online psychometrics, not positioned as a clinical exam.',
          body: 'The research brief points to ICAR as the closest online-battery reference, with Raven, Wechsler, and Cattell as the historical backbone. The result is an interpretive cognitive profile, not a medical diagnosis.',
          pillars: [
            { name: 'ICAR', detail: 'open cognitive research tradition' },
            { name: 'Raven', detail: 'matrix reasoning lineage' },
            { name: 'Wechsler', detail: 'broad cognitive testing history' },
            { name: 'Cattell', detail: 'fluid intelligence tradition' }
          ],
          disclaimer:
            'Results are educational profiles, not licensed clinical diagnoses. Percentiles depend on reference samples.'
        }
      : locale === 'es'
        ? {
            badge: 'Basado en investigación',
            title:
              'Inspirado en psicometría online moderna, no presentado como examen clínico.',
            body: 'La referencia más cercana es ICAR como batería online, con Raven, Wechsler y Cattell como base histórica. El resultado es un perfil cognitivo interpretativo, no un diagnóstico médico.',
            pillars: [
              { name: 'ICAR', detail: 'tradición abierta de investigación cognitiva' },
              { name: 'Raven', detail: 'linaje de razonamiento matricial' },
              { name: 'Wechsler', detail: 'historia amplia de tests cognitivos' },
              { name: 'Cattell', detail: 'tradición de inteligencia fluida' }
            ],
            disclaimer:
              'Los resultados son perfiles educativos, no diagnósticos clínicos con licencia. Los percentiles dependen de muestras de referencia.'
          }
        : {
            badge: 'Fondé sur la recherche',
            title:
              'Inspiré de la psychométrie en ligne moderne, pas présenté comme examen clinique.',
            body: 'La référence la plus proche est ICAR comme batterie en ligne, avec Raven, Wechsler et Cattell comme socle historique. Le résultat est un profil cognitif interprétatif, pas un diagnostic médical.',
            pillars: [
              { name: 'ICAR', detail: 'tradition ouverte de recherche cognitive' },
              { name: 'Raven', detail: 'lignée de raisonnement matriciel' },
              { name: 'Wechsler', detail: 'histoire large des tests cognitifs' },
              { name: 'Cattell', detail: 'tradition d’intelligence fluide' }
            ],
            disclaimer:
              'Les résultats sont des profils éducatifs, pas des diagnostics cliniques agréés. Les percentiles dépendent d’échantillons de référence.'
          };

  const email =
    locale === 'en'
      ? {
          preEyebrow: 'Start your IQ profile',
          postEyebrow: 'Your report is ready',
          title: 'Where should we save your IQ profile?',
          preBody:
            'Enter your email to start the timed assessment. We will save your progress and prepare your cognitive profile.',
          postBody:
            'Enter your email to unlock your IQ-style report and scholarship strategy preview.',
          emailLabel: 'Email',
          emailPlaceholder: 'you@example.com',
          saving: 'Saving your IQ profile...',
          continuePre: 'Continue to IQ test',
          continuePost: 'Continue',
          googleOpening: 'Opening Google...',
          googleSignIn: 'Sign in with Google',
          noPasswordHint:
            'No password needed now. If you ever want one, you can set it later through forgot password.',
          errors: {
            invalidEmail: 'Enter a valid email address.',
            accountFailed: 'Could not create your account.',
            sessionFailed:
              'Account was created, but we could not start your session. Check your email to continue.',
            connection: 'Something went wrong. Check your connection and try again.',
            googleFailed: 'Google sign-in failed. Try again in a moment.'
          }
        }
      : locale === 'es'
        ? {
            preEyebrow: 'Empieza tu perfil de CI',
            postEyebrow: 'Tu informe está listo',
            title: '¿Dónde guardamos tu perfil de CI?',
            preBody:
              'Introduce tu correo para iniciar la evaluación cronometrada. Guardaremos tu progreso y prepararemos tu perfil cognitivo.',
            postBody:
              'Introduce tu correo para desbloquear tu informe tipo CI y la vista previa de estrategia de becas.',
            emailLabel: 'Correo',
            emailPlaceholder: 'tu@ejemplo.com',
            saving: 'Guardando tu perfil de CI...',
            continuePre: 'Continuar al test de CI',
            continuePost: 'Continuar',
            googleOpening: 'Abriendo Google...',
            googleSignIn: 'Iniciar sesión con Google',
            noPasswordHint:
              'No hace falta contraseña ahora. Si la quieres después, puedes crearla con «olvidé mi contraseña».',
            errors: {
              invalidEmail: 'Introduce una dirección de correo válida.',
              accountFailed: 'No se pudo crear tu cuenta.',
              sessionFailed:
                'La cuenta se creó, pero no pudimos iniciar sesión. Revisa tu correo para continuar.',
              connection: 'Algo salió mal. Comprueba tu conexión e inténtalo de nuevo.',
              googleFailed: 'Error con Google. Inténtalo de nuevo en un momento.'
            }
          }
        : {
            preEyebrow: 'Commencez votre profil de QI',
            postEyebrow: 'Votre rapport est prêt',
            title: 'Où enregistrer votre profil de QI ?',
            preBody:
              'Saisissez votre e-mail pour lancer l’évaluation chronométrée. Nous enregistrerons votre progression et préparerons votre profil cognitif.',
            postBody:
              'Saisissez votre e-mail pour débloquer votre rapport type QI et l’aperçu de stratégie de bourses.',
            emailLabel: 'E-mail',
            emailPlaceholder: 'vous@exemple.com',
            saving: 'Enregistrement de votre profil de QI...',
            continuePre: 'Continuer vers le test de QI',
            continuePost: 'Continuer',
            googleOpening: 'Ouverture de Google...',
            googleSignIn: 'Se connecter avec Google',
            noPasswordHint:
              'Pas de mot de passe pour l’instant. Vous pourrez en définir un plus tard via « mot de passe oublié ».',
            errors: {
              invalidEmail: 'Saisissez une adresse e-mail valide.',
              accountFailed: 'Impossible de créer votre compte.',
              sessionFailed:
                'Compte créé, mais la session n’a pas démarré. Vérifiez votre e-mail pour continuer.',
              connection: 'Un problème est survenu. Vérifiez votre connexion et réessayez.',
              googleFailed: 'Échec Google. Réessayez dans un instant.'
            }
          };

  const misc =
    locale === 'en'
      ? {
          loadingProgress: 'Loading your progress...',
          iqReadyTitle: 'IQ profile generated',
          iqReadyBody: 'Your IQ profile is ready.',
          iqReadySubtitle:
            'You can unlock the full IQ-style report now, or add scholarship details to turn this cognitive profile into matched grants and next steps.',
          iqReadyHighlights: [
            'IQ-style score context saved',
            'Brain Archetype prepared',
            'Matched grants can be revealed next'
          ] as [string, string, string],
          getReportCta: 'Get my IQ report now',
          revealGrantsCta: 'Reveal matched grants',
          startAgain: 'Start again',
          checkingProfile: 'Checking your saved scholarship profile...',
          preparingReportAccess: 'Preparing your report access...',
          strategyAccount: {
            savingStrategy: 'Saving your strategy',
            updatingProfile: 'Updating your scholarship profile...',
            sessionFoundHint:
              'We found your account, so there is no need to enter email again. Your new IQ result and scholarship answers are being saved.',
            matchesFound: 'Matches found',
            saveBeforeUnlock: 'Save them before unlocking your report.',
            finalStep: 'Final step',
            saveMatchesBody:
              'We found your matched grants from your IQ profile and scholarship details. Enter your email so your grants, award amounts, deadlines, and reading path stay attached to your account.',
            emailLabel: 'Email',
            emailPlaceholder: 'you@example.com',
            noPasswordHint:
              'No password needed now. If you ever want one, you can set it later through forgot password.',
            savingMatches: 'Saving matches...',
            saveAndUnlock: 'Save and unlock report',
            errors: {
              invalidEmail: 'Enter a valid email address.',
              profileUpdateFailed: 'Could not update your scholarship profile.',
              generic: 'Something went wrong. Check your connection and try again.'
            }
          }
        }
      : locale === 'es'
        ? {
            loadingProgress: 'Cargando tu progreso...',
            iqReadyTitle: 'Perfil de CI generado',
            iqReadyBody: 'Tu perfil de CI está listo.',
            iqReadySubtitle:
              'Puedes desbloquear el informe completo tipo CI ahora o añadir datos de becas para convertir este perfil en coincidencias y próximos pasos.',
            iqReadyHighlights: [
              'Contexto de puntuación tipo CI guardado',
              'Arquetipo cerebral preparado',
              'Las becas coincidentes se pueden revelar después'
            ] as [string, string, string],
            getReportCta: 'Obtener mi informe de CI',
            revealGrantsCta: 'Ver becas coincidentes',
            startAgain: 'Empezar de nuevo',
            checkingProfile: 'Comprobando tu perfil de becas guardado...',
            preparingReportAccess: 'Preparando el acceso al informe...',
            strategyAccount: {
              savingStrategy: 'Guardando tu estrategia',
              updatingProfile: 'Actualizando tu perfil de becas...',
              sessionFoundHint:
                'Encontramos tu cuenta; no hace falta volver a introducir el correo. Se guardan tu nuevo resultado de CI y tus respuestas de becas.',
              matchesFound: 'Coincidencias encontradas',
              saveBeforeUnlock: 'Guárdalas antes de desbloquear el informe.',
              finalStep: 'Paso final',
              saveMatchesBody:
                'Encontramos becas coincidentes según tu perfil de CI y tus datos. Introduce tu correo para que premios, plazos y lecturas queden en tu cuenta.',
              emailLabel: 'Correo electrónico',
              emailPlaceholder: 'tu@ejemplo.com',
              noPasswordHint:
                'No hace falta contraseña ahora. Si la quieres más tarde, usa «olvidé mi contraseña».',
              savingMatches: 'Guardando coincidencias...',
              saveAndUnlock: 'Guardar y desbloquear informe',
              errors: {
                invalidEmail: 'Introduce un correo válido.',
                profileUpdateFailed: 'No se pudo actualizar tu perfil de becas.',
                generic: 'Algo salió mal. Comprueba la conexión e inténtalo de nuevo.'
              }
            }
          }
        : {
            loadingProgress: 'Chargement de votre progression...',
            iqReadyTitle: 'Profil de QI généré',
            iqReadyBody: 'Votre profil de QI est prêt.',
            iqReadySubtitle:
              'Vous pouvez débloquer le rapport type QI complet maintenant ou ajouter des détails de bourses pour obtenir des correspondances et des prochaines étapes.',
            iqReadyHighlights: [
              'Contexte de score type QI enregistré',
              'Archétype cérébral préparé',
              'Les bourses correspondantes peuvent être affichées ensuite'
            ] as [string, string, string],
            getReportCta: 'Obtenir mon rapport de QI',
            revealGrantsCta: 'Afficher les bourses correspondantes',
            startAgain: 'Recommencer',
            checkingProfile: 'Vérification de votre profil de bourses enregistré...',
            preparingReportAccess: 'Préparation de l’accès au rapport...',
            strategyAccount: {
              savingStrategy: 'Enregistrement de votre stratégie',
              updatingProfile: 'Mise à jour de votre profil de bourses...',
              sessionFoundHint:
                'Nous avons trouvé votre compte : pas besoin de saisir l’e-mail à nouveau. Votre nouveau résultat de QI et vos réponses sont enregistrés.',
              matchesFound: 'Correspondances trouvées',
              saveBeforeUnlock: 'Enregistrez-les avant de débloquer le rapport.',
              finalStep: 'Dernière étape',
              saveMatchesBody:
                'Nous avons trouvé des bourses selon votre profil de QI et vos détails. Saisissez votre e-mail pour conserver montants, délais et parcours de lecture.',
              emailLabel: 'E-mail',
              emailPlaceholder: 'vous@exemple.com',
              noPasswordHint:
                'Pas de mot de passe pour l’instant. Vous pourrez en définir un plus tard via « mot de passe oublié ».',
              savingMatches: 'Enregistrement des correspondances...',
              saveAndUnlock: 'Enregistrer et débloquer le rapport',
              errors: {
                invalidEmail: 'Saisissez une adresse e-mail valide.',
                profileUpdateFailed: 'Impossible de mettre à jour votre profil de bourses.',
                generic: 'Un problème est survenu. Vérifiez votre connexion et réessayez.'
              }
            }
          };

  return {
    intents,
    highlights,
    startTest:
      locale === 'en'
        ? 'Start IQ test'
        : locale === 'es'
          ? 'Iniciar test de CI'
          : 'Commencer le test de QI',
    startSubline:
      locale === 'en'
        ? '30 questions, then scholarship matching details.'
        : locale === 'es'
          ? '30 preguntas y luego datos de coincidencia de becas.'
          : '30 questions, puis détails de correspondance des bourses.',
    introAside: intro,
    emailGate: email,
    ...misc
  };
}

const COPY: Record<IqLocale, IqContextualFunnelCopy> = {
  en: buildLocaleCopy(EN_INTENTS, 'en'),
  es: buildLocaleCopy(ES_INTENTS, 'es'),
  fr: buildLocaleCopy(FR_INTENTS, 'fr')
};

export function getIqContextualFunnelCopy(locale: IqLocale): IqContextualFunnelCopy {
  return COPY[locale];
}
