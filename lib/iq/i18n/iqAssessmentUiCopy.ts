import type { IqLocale } from '@/lib/iq/i18n/iqLocales';

export type IqAssessmentUiCopy = {
  introBadge: string;
  introTitle: string;
  introBody: string;
  introCardItems: string;
  introCardDomains: string;
  introCardScore: string;
  introCardItemsDesc: string;
  introCardDomainsDesc: string;
  introCardScoreDesc: string;
  startTest: string;
  stepOf: (step: number, total: number) => string;
  timeLeft: (countdown: string) => string;
  startAgain: string;
  chooseOneAnswer: string;
  questionNumber: (n: number) => string;
  analyzerTitle: string;
  analyzerMessages: [string, string, string];
  localeSwitchNotice: string;
};

const COPY: Record<IqLocale, IqAssessmentUiCopy> = {
  en: {
    introBadge: '30-question IQ test',
    introTitle: 'Measure your IQ score and cognitive pattern.',
    introBody:
      'Complete a timed, multi-domain IQ test covering abstract reasoning, numerical logic, spatial intelligence, verbal reasoning, and decision speed.',
    introCardItems: '30 items',
    introCardDomains: '5 domains',
    introCardScore: 'IQ score',
    introCardItemsDesc:
      'Carefully calibrated questions designed to assess your true cognitive baseline.',
    introCardDomainsDesc:
      'A comprehensive analysis of logic, spatial reasoning, and processing speed.',
    introCardScoreDesc:
      'Get a detailed performance breakdown and discover your unique Brain Archetype.',
    startTest: 'Start IQ Test',
    stepOf: (step, total) => `Step ${step} of ${total}`,
    timeLeft: (countdown) => `Time left ${countdown}`,
    startAgain: 'Start again',
    chooseOneAnswer: 'Choose one answer',
    questionNumber: (n) => `Question ${n}`,
    analyzerTitle: 'Calculating your IQ score',
    analyzerMessages: [
      'Scoring weighted IQ items...',
      'Calculating IQ percentile...',
      'Mapping Brain Archetype...'
    ],
    localeSwitchNotice:
      'Language changed — your saved answers are kept; question text updates to the new language.'
  },
  es: {
    introBadge: 'Test de CI de 30 preguntas',
    introTitle: 'Mide tu puntuación de CI y tu patrón cognitivo.',
    introBody:
      'Completa un test de CI cronometrado en varios dominios: razonamiento abstracto, lógica numérica, inteligencia espacial, lógica verbal y velocidad de decisión.',
    introCardItems: '30 ítems',
    introCardDomains: '5 dominios',
    introCardScore: 'Puntuación CI',
    introCardItemsDesc:
      'Preguntas calibradas para evaluar tu nivel cognitivo real.',
    introCardDomainsDesc:
      'Análisis integral de lógica, razonamiento espacial y velocidad de procesamiento.',
    introCardScoreDesc:
      'Obtén un desglose detallado y descubre tu arquetipo cerebral único.',
    startTest: 'Iniciar test de CI',
    stepOf: (step, total) => `Paso ${step} de ${total}`,
    timeLeft: (countdown) => `Tiempo restante ${countdown}`,
    startAgain: 'Empezar de nuevo',
    chooseOneAnswer: 'Elige una respuesta',
    questionNumber: (n) => `Pregunta ${n}`,
    analyzerTitle: 'Calculando tu puntuación de CI',
    analyzerMessages: [
      'Puntuando ítems de CI ponderados...',
      'Calculando percentil de CI...',
      'Determinando arquetipo cerebral...'
    ],
    localeSwitchNotice:
      'Idioma cambiado: se conservan tus respuestas; el texto de las preguntas se actualiza al nuevo idioma.'
  },
  fr: {
    introBadge: 'Test de QI — 30 questions',
    introTitle: 'Mesurez votre score de QI et votre profil cognitif.',
    introBody:
      'Passez un test de QI chronométré couvrant le raisonnement abstrait, la logique numérique, l’intelligence spatiale, la logique verbale et la vitesse de décision.',
    introCardItems: '30 items',
    introCardDomains: '5 domaines',
    introCardScore: 'Score de QI',
    introCardItemsDesc:
      'Des questions calibrées pour évaluer votre niveau cognitif réel.',
    introCardDomainsDesc:
      'Analyse complète de la logique, du raisonnement spatial et de la vitesse de traitement.',
    introCardScoreDesc:
      'Obtenez une analyse détaillée et découvrez votre archétype cérébral.',
    startTest: 'Commencer le test de QI',
    stepOf: (step, total) => `Étape ${step} sur ${total}`,
    timeLeft: (countdown) => `Temps restant ${countdown}`,
    startAgain: 'Recommencer',
    chooseOneAnswer: 'Choisissez une réponse',
    questionNumber: (n) => `Question ${n}`,
    analyzerTitle: 'Calcul de votre score de QI',
    analyzerMessages: [
      'Notation des items de QI pondérés...',
      'Calcul du percentile de QI...',
      'Détermination de l’archétype cérébral...'
    ],
    localeSwitchNotice:
      'Langue modifiée — vos réponses enregistrées sont conservées ; le texte des questions passe dans la nouvelle langue.'
  }
};

export function getIqAssessmentUiCopy(locale: IqLocale): IqAssessmentUiCopy {
  return COPY[locale];
}
