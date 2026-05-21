import type { IqLocale } from '@/lib/iq/i18n/iqLocales';

export type IqPaywallCopy = {
  badge: string;
  title: string;
  body: string;
  lockedIqScore: string;
  lockedArchetype: string;
  previewTitle: string;
  previewBody: string;
  domainPreview: string;
  lockedBadge: string;
  unlockEyebrow: string;
  unlockTitle: string;
  unlockBody: string;
  unlockBullets: [string, string, string];
  checkoutPending: string;
  checkoutCta: string;
  checkoutFootnote: string;
  startAgain: string;
  statLabels: {
    iqStyleScore: string;
    percentileContext: string;
    brainArchetype: string;
  };
};

const COPY: Record<IqLocale, IqPaywallCopy> = {
  en: {
    badge: 'IQ report ready',
    title: 'Your cognitive report has been generated.',
    body: 'Your 30 timed answers produced an IQ-style score, percentile context, five-domain profile, and Brain Archetype. Unlock the full report for a one-time $9.99 payment.',
    lockedIqScore: 'IQ-style score',
    lockedArchetype: 'Brain Archetype',
    previewTitle: 'Preview included',
    previewBody:
      'Your assessment is complete. The exact score, archetype, domain interpretation, and strength profile are prepared behind the unlock screen.',
    domainPreview: 'Domain preview',
    lockedBadge: 'Locked',
    unlockEyebrow: 'Full interpretation locked',
    unlockTitle: 'Unlock your complete IQ profile',
    unlockBody:
      'Reveal your exact score context, domain ranking, Brain Archetype, strengths profile, and plain-English explanation.',
    unlockBullets: [
      'Exact IQ-style score band and percentile context',
      'Five-domain breakdown with strongest area',
      'Brain Archetype and strengths interpretation'
    ],
    checkoutPending: 'Opening checkout...',
    checkoutCta: 'Unlock full IQ report - $9.99',
    checkoutFootnote: 'One-time payment. Secure LemonSqueezy checkout.',
    startAgain: 'Start again',
    statLabels: {
      iqStyleScore: 'IQ-style score',
      percentileContext: 'Percentile context',
      brainArchetype: 'Brain Archetype'
    }
  },
  es: {
    badge: 'Informe de CI listo',
    title: 'Tu informe cognitivo se ha generado.',
    body: 'Tus 30 respuestas cronometradas produjeron una puntuación tipo CI, contexto de percentil, perfil en cinco dominios y arquetipo cerebral. Desbloquea el informe completo con un pago único de 9,99 $.',
    lockedIqScore: 'Puntuación tipo CI',
    lockedArchetype: 'Arquetipo cerebral',
    previewTitle: 'Vista previa incluida',
    previewBody:
      'La evaluación está completa. La puntuación exacta, el arquetipo, la interpretación por dominios y el perfil de fortalezas están listos tras el desbloqueo.',
    domainPreview: 'Vista previa de dominios',
    lockedBadge: 'Bloqueado',
    unlockEyebrow: 'Interpretación completa bloqueada',
    unlockTitle: 'Desbloquea tu perfil de CI completo',
    unlockBody:
      'Muestra el contexto exacto de tu puntuación, el ranking por dominios, el arquetipo cerebral, el perfil de fortalezas y una explicación clara.',
    unlockBullets: [
      'Banda de puntuación tipo CI y contexto de percentil',
      'Desglose en cinco dominios con tu área más fuerte',
      'Arquetipo cerebral e interpretación de fortalezas'
    ],
    checkoutPending: 'Abriendo pago...',
    checkoutCta: 'Desbloquear informe completo — 9,99 $',
    checkoutFootnote: 'Pago único. Pago seguro con LemonSqueezy.',
    startAgain: 'Empezar de nuevo',
    statLabels: {
      iqStyleScore: 'Puntuación tipo CI',
      percentileContext: 'Contexto de percentil',
      brainArchetype: 'Arquetipo cerebral'
    }
  },
  fr: {
    badge: 'Rapport de QI prêt',
    title: 'Votre rapport cognitif a été généré.',
    body: 'Vos 30 réponses chronométrées ont produit un score type QI, un contexte de percentile, un profil en cinq domaines et un archétype cérébral. Débloquez le rapport complet pour un paiement unique de 9,99 $.',
    lockedIqScore: 'Score type QI',
    lockedArchetype: 'Archétype cérébral',
    previewTitle: 'Aperçu inclus',
    previewBody:
      'L’évaluation est terminée. Le score exact, l’archétype, l’interprétation par domaine et le profil de forces sont prêts derrière l’écran de déblocage.',
    domainPreview: 'Aperçu des domaines',
    lockedBadge: 'Verrouillé',
    unlockEyebrow: 'Interprétation complète verrouillée',
    unlockTitle: 'Débloquez votre profil de QI complet',
    unlockBody:
      'Affichez le contexte exact du score, le classement par domaine, l’archétype cérébral, le profil de forces et une explication claire.',
    unlockBullets: [
      'Bande de score type QI et contexte de percentile',
      'Répartition en cinq domaines avec le domaine le plus fort',
      'Archétype cérébral et interprétation des forces'
    ],
    checkoutPending: 'Ouverture du paiement...',
    checkoutCta: 'Débloquer le rapport complet — 9,99 $',
    checkoutFootnote: 'Paiement unique. Paiement sécurisé LemonSqueezy.',
    startAgain: 'Recommencer',
    statLabels: {
      iqStyleScore: 'Score type QI',
      percentileContext: 'Contexte de percentile',
      brainArchetype: 'Archétype cérébral'
    }
  }
};

export function getIqPaywallCopy(locale: IqLocale): IqPaywallCopy {
  return COPY[locale];
}
