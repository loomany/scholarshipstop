import type { IqLocale } from '@/lib/iq/i18n/iqLocales';

export type IqHomeMetadata = {
  title: string;
  description: string;
  ogLocale: string;
  ogSiteName: string;
  ogImageAlt: string;
};

export type IqAssessmentMetadata = {
  title: string;
  description: string;
};

export type IqReportMetadata = {
  title: string;
  description: string;
};

const HOME: Record<IqLocale, IqHomeMetadata> = {
  en: {
    title: 'Online IQ Test | IQ-Style Score and Cognitive Profile',
    description:
      'Take a short online IQ-style test inspired by modern psychometrics. Get a cognitive profile across reasoning, spatial intelligence, verbal logic, numerical logic, and decision speed.',
    ogLocale: 'en_US',
    ogSiteName: 'Online IQ Test',
    ogImageAlt: 'Online IQ Test cognitive profile report'
  },
  es: {
    title: 'Test de CI online | Puntuación tipo CI y perfil cognitivo',
    description:
      'Haz un test de CI breve inspirado en psicometría moderna. Obtén un perfil cognitivo en razonamiento, inteligencia espacial, lógica verbal, lógica numérica y velocidad de decisión.',
    ogLocale: 'es_ES',
    ogSiteName: 'Test de CI online',
    ogImageAlt: 'Informe de perfil cognitivo del test de CI online'
  },
  fr: {
    title: 'Test de QI en ligne | Score type QI et profil cognitif',
    description:
      'Passez un test de QI court inspiré de la psychométrie moderne. Obtenez un profil cognitif : raisonnement, intelligence spatiale, logique verbale, logique numérique et vitesse de décision.',
    ogLocale: 'fr_FR',
    ogSiteName: 'Test de QI en ligne',
    ogImageAlt: 'Rapport de profil cognitif du test de QI en ligne'
  }
};

const ASSESSMENT: Record<IqLocale, IqAssessmentMetadata> = {
  en: {
    title: 'Start IQ Test | 30-Question Online IQ Score',
    description:
      'Begin the 30-question timed IQ-style assessment. Measure reasoning, spatial intelligence, verbal logic, numerical logic, and decision speed.'
  },
  es: {
    title: 'Iniciar test de CI | 30 preguntas y puntuación online',
    description:
      'Empieza la evaluación cronometrada de 30 preguntas tipo CI. Mide razonamiento, inteligencia espacial, lógica verbal, lógica numérica y velocidad de decisión.'
  },
  fr: {
    title: 'Commencer le test de QI | 30 questions et score en ligne',
    description:
      'Lancez l’évaluation chronométrée de 30 questions type QI. Mesurez raisonnement, intelligence spatiale, logique verbale, logique numérique et vitesse de décision.'
  }
};

const REPORT: Record<IqLocale, IqReportMetadata> = {
  en: {
    title: 'Your IQ Report',
    description: 'Unlocked IQ-style cognitive report.'
  },
  es: {
    title: 'Tu informe de CI',
    description: 'Informe cognitivo tipo CI desbloqueado.'
  },
  fr: {
    title: 'Votre rapport de QI',
    description: 'Rapport cognitif type QI débloqué.'
  }
};

export function getIqHomeMetadata(locale: IqLocale): IqHomeMetadata {
  return HOME[locale];
}

export function getIqAssessmentMetadata(locale: IqLocale): IqAssessmentMetadata {
  return ASSESSMENT[locale];
}

export function getIqReportMetadata(locale: IqLocale): IqReportMetadata {
  return REPORT[locale];
}
