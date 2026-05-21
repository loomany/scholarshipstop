import type { IqLocale } from '@/lib/iq/i18n/iqLocales';
import type { AssessmentResult } from '@/lib/iqAssessmentTypes';

export type IqReportCopy = {
  localPreviewBadge: string;
  unlockedBadge: string;
  title: string;
  disclaimer: string;
  localhostNotice: string;
  startAgain: string;
  totalTime: (formatted: string) => string;
  stats: {
    iqStyleScore: string;
    percentileContext: string;
    brainArchetype: string;
    topPercent: (n: number) => string;
  };
  domainBreakdown: string;
  insights: {
    howToReadTitle: string;
    howToReadText: string;
    strongestTitle: string;
    strongestText: (domainLabel: string) => string;
  };
  reportEmail: string;
  notFound: {
    title: string;
    body: string;
    backCta: string;
  };
};

const COPY: Record<IqLocale, IqReportCopy> = {
  en: {
    localPreviewBadge: 'Local preview unlocked',
    unlockedBadge: 'Full report unlocked',
    title: 'Your IQ-style cognitive profile',
    disclaimer:
      'This educational report summarizes your timed assessment result, domain profile, and Brain Archetype. It is not a clinical diagnosis or licensed psychological assessment.',
    localhostNotice: 'Visible only on localhost. Production stays locked.',
    startAgain: 'Start again',
    totalTime: (formatted) => `Total time ${formatted}`,
    stats: {
      iqStyleScore: 'IQ-style score',
      percentileContext: 'Percentile context',
      brainArchetype: 'Brain Archetype',
      topPercent: (n) => `Top ${n}%`
    },
    domainBreakdown: 'Domain breakdown',
    insights: {
      howToReadTitle: 'How to read this',
      howToReadText:
        'Your score combines accuracy, item difficulty, and timing across the assessment. The domain chart is often more useful than the single number because it shows how your reasoning style is distributed.',
      strongestTitle: 'Your strongest signal',
      strongestText: (domainLabel) =>
        `${domainLabel} appears as your strongest relative area in this run. Use that as a practical clue about how you naturally approach new problems.`
    },
    reportEmail: 'Report email',
    notFound: {
      title: 'Report not found',
      body: 'This report link may be incomplete, unpaid, or no longer available. Contact support if payment was completed.',
      backCta: 'Back to IQ Profile'
    }
  },
  es: {
    localPreviewBadge: 'Vista previa local desbloqueada',
    unlockedBadge: 'Informe completo desbloqueado',
    title: 'Tu perfil cognitivo tipo CI',
    disclaimer:
      'Este informe educativo resume tu evaluación cronometrada, el perfil por dominios y el arquetipo cerebral. No es un diagnóstico clínico ni una evaluación psicológica con licencia.',
    localhostNotice: 'Visible solo en localhost. En producción permanece bloqueado.',
    startAgain: 'Empezar de nuevo',
    totalTime: (formatted) => `Tiempo total ${formatted}`,
    stats: {
      iqStyleScore: 'Puntuación tipo CI',
      percentileContext: 'Contexto de percentil',
      brainArchetype: 'Arquetipo cerebral',
      topPercent: (n) => `Top ${n}%`
    },
    domainBreakdown: 'Desglose por dominios',
    insights: {
      howToReadTitle: 'Cómo leer esto',
      howToReadText:
        'Tu puntuación combina precisión, dificultad de los ítems y tiempo en la evaluación. El gráfico por dominios suele ser más útil que un solo número porque muestra cómo se distribuye tu estilo de razonamiento.',
      strongestTitle: 'Tu señal más fuerte',
      strongestText: (domainLabel) =>
        `${domainLabel} aparece como tu área relativa más fuerte en esta sesión. Úsalo como pista práctica sobre cómo abordas problemas nuevos.`
    },
    reportEmail: 'Correo del informe',
    notFound: {
      title: 'Informe no encontrado',
      body: 'Este enlace puede estar incompleto, sin pago o ya no disponible. Contacta con soporte si completaste el pago.',
      backCta: 'Volver al perfil IQ'
    }
  },
  fr: {
    localPreviewBadge: 'Aperçu local débloqué',
    unlockedBadge: 'Rapport complet débloqué',
    title: 'Votre profil cognitif type QI',
    disclaimer:
      'Ce rapport éducatif résume votre évaluation chronométrée, le profil par domaine et l’archétype cérébral. Ce n’est pas un diagnostic clinique ni une évaluation psychologique agréée.',
    localhostNotice: 'Visible uniquement en localhost. En production, le rapport reste verrouillé.',
    startAgain: 'Recommencer',
    totalTime: (formatted) => `Temps total ${formatted}`,
    stats: {
      iqStyleScore: 'Score type QI',
      percentileContext: 'Contexte de percentile',
      brainArchetype: 'Archétype cérébral',
      topPercent: (n) => `Top ${n}%`
    },
    domainBreakdown: 'Répartition par domaines',
    insights: {
      howToReadTitle: 'Comment lire ce rapport',
      howToReadText:
        'Votre score combine précision, difficulté des items et temps. Le graphique par domaine est souvent plus utile qu’un seul chiffre car il montre comment votre style de raisonnement se répartit.',
      strongestTitle: 'Votre signal le plus fort',
      strongestText: (domainLabel) =>
        `${domainLabel} apparaît comme votre domaine relatif le plus fort sur cette session. Utilisez-le comme indice sur votre façon d’aborder de nouveaux problèmes.`
    },
    reportEmail: 'E-mail du rapport',
    notFound: {
      title: 'Rapport introuvable',
      body: 'Ce lien peut être incomplet, non payé ou plus disponible. Contactez le support si le paiement a été effectué.',
      backCta: 'Retour au profil IQ'
    }
  }
};

export function getIqReportCopy(locale: IqLocale): IqReportCopy {
  return COPY[locale];
}

export function resolveIqReportLocale(
  result: AssessmentResult,
  fallback: IqLocale = 'en'
): IqLocale {
  const locale = result.assessmentLocale;
  return locale === 'es' || locale === 'fr' ? locale : fallback;
}
