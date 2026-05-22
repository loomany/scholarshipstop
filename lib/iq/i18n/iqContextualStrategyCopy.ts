import type { IqLocale } from '@/lib/iq/i18n/iqLocales';

export type IqContextualStrategyCopy = {
  badge: string;
  brainArchetypeEyebrow: string;
  hookSuffix: string;
  estimatedIqRange: string;
  topCognitiveDomain: string;
  topStrengths: string;
  strategySummary: string;
  restartTitle: string;
  restartBody: string;
  restartCta: string;
  recommendedGrants: string;
  matchesLabel: (count: number) => string;
  strongMatch: string;
  matchPercent: (pct: number) => string;
  emptyGrants: string;
  unlockMatchedGrants: string;
  viewScholarships: string;
  recommendedReading: string;
  improveEssays: string;
  essayToolsTitle: string;
  essayDraftTitle: string;
  awardVaries: string;
  premiumEyebrow: string;
  premiumTitle: string;
  premiumBody: string;
  premiumBullets: [string, string];
  premiumCta: string;
};

const EN: IqContextualStrategyCopy = {
  badge: 'Personalized strategy report',
  brainArchetypeEyebrow: 'Brain Archetype',
  hookSuffix:
    'Your assessment and goal profile point to a strategy built around your strongest cognitive signals, not generic scholarship advice.',
  estimatedIqRange: 'Estimated IQ range',
  topCognitiveDomain: 'Top cognitive domain',
  topStrengths: 'Top strengths',
  strategySummary: 'Strategy summary',
  restartTitle: 'Want to start the test again?',
  restartBody:
    'Retake the IQ assessment and refill the scholarship details that affect your grants. Your account profile will update with the new answers.',
  restartCta: 'Start IQ test again',
  recommendedGrants: 'Recommended grants',
  matchesLabel: (count) => `${count} matches`,
  strongMatch: 'Strong match',
  matchPercent: (pct) => `${pct}% match`,
  emptyGrants:
    'We could not load live grants in this preview. Open the scholarship hub to see your saved recommendation set.',
  unlockMatchedGrants: 'Unlock matched grants',
  viewScholarships: 'View scholarships',
  recommendedReading: 'Recommended reading path',
  improveEssays: 'Improve essays',
  essayToolsTitle: 'Open essay improvement tools',
  essayDraftTitle: 'Start a scholarship essay draft',
  awardVaries: 'Award varies',
  premiumEyebrow: 'Premium report ready',
  premiumTitle: 'Unlock your matched grants',
  premiumBody:
    'Your score is analyzed. Upgrade to reveal the grants, award amounts, deadlines, and essay moves most likely to turn this profile into funded applications.',
  premiumBullets: [
    'Reveal 4 matched grants with money amounts and deadlines',
    'Unlock your strategy summary, reading path, and essay next steps'
  ],
  premiumCta: 'Unlock my matched grants'
};

const ES: IqContextualStrategyCopy = {
  badge: 'Informe de estrategia personalizado',
  brainArchetypeEyebrow: 'Arquetipo cerebral',
  hookSuffix:
    'Tu evaluación y objetivos apuntan a una estrategia basada en tus señales cognitivas más fuertes, no en consejos genéricos de becas.',
  estimatedIqRange: 'Rango estimado de CI',
  topCognitiveDomain: 'Dominio cognitivo principal',
  topStrengths: 'Fortalezas principales',
  strategySummary: 'Resumen de estrategia',
  restartTitle: '¿Quieres repetir el test?',
  restartBody:
    'Vuelve a hacer la evaluación de CI y actualiza los datos de becas que afectan a tus coincidencias. Tu perfil de cuenta se actualizará con las nuevas respuestas.',
  restartCta: 'Repetir test de CI',
  recommendedGrants: 'Becas recomendadas',
  matchesLabel: (count) => `${count} coincidencias`,
  strongMatch: 'Coincidencia fuerte',
  matchPercent: (pct) => `${pct}% de coincidencia`,
  emptyGrants:
    'No pudimos cargar becas en vivo en esta vista previa. Abre el hub de becas para ver tu conjunto guardado.',
  unlockMatchedGrants: 'Desbloquear becas coincidentes',
  viewScholarships: 'Ver becas',
  recommendedReading: 'Ruta de lectura recomendada',
  improveEssays: 'Mejorar ensayos',
  essayToolsTitle: 'Abrir herramientas de ensayos',
  essayDraftTitle: 'Empezar borrador de ensayo de beca',
  awardVaries: 'Premio variable',
  premiumEyebrow: 'Informe premium listo',
  premiumTitle: 'Desbloquea tus becas coincidentes',
  premiumBody:
    'Tu puntuación está analizada. Mejora el plan para ver becas, importes, plazos y pasos de ensayo que conviertan este perfil en solicitudes financiadas.',
  premiumBullets: [
    'Muestra 4 becas coincidentes con importes y plazos',
    'Desbloquea resumen de estrategia, lecturas y próximos pasos de ensayo'
  ],
  premiumCta: 'Desbloquear mis becas coincidentes'
};

const FR: IqContextualStrategyCopy = {
  badge: 'Rapport de stratégie personnalisé',
  brainArchetypeEyebrow: 'Archétype cérébral',
  hookSuffix:
    'Votre évaluation et vos objectifs orientent une stratégie fondée sur vos signaux cognitifs les plus forts, pas des conseils génériques sur les bourses.',
  estimatedIqRange: 'Fourchette de QI estimée',
  topCognitiveDomain: 'Domaine cognitif principal',
  topStrengths: 'Forces principales',
  strategySummary: 'Résumé de stratégie',
  restartTitle: 'Recommencer le test ?',
  restartBody:
    'Repassez l’évaluation de QI et mettez à jour les détails de bourses qui influencent vos correspondances. Votre profil de compte sera mis à jour.',
  restartCta: 'Recommencer le test de QI',
  recommendedGrants: 'Bourses recommandées',
  matchesLabel: (count) => `${count} correspondances`,
  strongMatch: 'Forte correspondance',
  matchPercent: (pct) => `${pct}% de correspondance`,
  emptyGrants:
    'Impossible de charger des bourses en direct dans cet aperçu. Ouvrez le hub des bourses pour voir votre ensemble enregistré.',
  unlockMatchedGrants: 'Débloquer les bourses correspondantes',
  viewScholarships: 'Voir les bourses',
  recommendedReading: 'Parcours de lecture recommandé',
  improveEssays: 'Améliorer les essais',
  essayToolsTitle: 'Ouvrir les outils d’essais',
  essayDraftTitle: 'Commencer un brouillon d’essai de bourse',
  awardVaries: 'Montant variable',
  premiumEyebrow: 'Rapport premium prêt',
  premiumTitle: 'Débloquez vos bourses correspondantes',
  premiumBody:
    'Votre score est analysé. Passez à l’offre pour voir les bourses, montants, délais et pistes d’essai les plus utiles pour financer vos candidatures.',
  premiumBullets: [
    'Afficher 4 bourses avec montants et délais',
    'Débloquer résumé de stratégie, lecture et prochaines étapes d’essai'
  ],
  premiumCta: 'Débloquer mes bourses correspondantes'
};

const COPY: Record<IqLocale, IqContextualStrategyCopy> = {
  en: EN,
  es: ES,
  fr: FR
};

export function getIqContextualStrategyCopy(locale: IqLocale): IqContextualStrategyCopy {
  return COPY[locale];
}
