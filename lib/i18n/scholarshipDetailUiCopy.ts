import type { LocalizedUiLocale } from '@/lib/i18n/localizedHref';

export type ScholarshipDetailUiCopy = {
  backToMatches: string;
  scholarshipsHub: string;
  notFound: string;
  failedToLoad: string;
  deadline: string;
  deadlineSecondary: string;
  deadlinePassedNotice: string;
  awardAmount: string;
  applicants: string;
  requirements: string;
  whoCanApply: string;
  verifyEligibilityNote: string;
  sponsorAndApplication: string;
  applyNow: string;
  applyPremiumTitle: string;
  applyLoadingAria: string;
  save: string;
  saved: string;
  saveAria: string;
  removeSavedAria: string;
  notRelevant: string;
  notRelevantAria: string;
  restoreToMatches: string;
  restoreAria: string;
  lastVerifiedPrefix: string;
  confirmOfficialNote: string;
  showMore: string;
  showLess: string;
  studyInPrefix: string;
  studyInMulti: (count: number) => string;
  providerWebsite: string;
  signInToUnlock: string;
  language: string;
};

const EN: ScholarshipDetailUiCopy = {
  backToMatches: '← Back to Matches',
  scholarshipsHub: 'Scholarships',
  notFound: 'Scholarship not found',
  failedToLoad: 'Failed to load scholarships',
  deadline: 'Deadline',
  deadlineSecondary: 'Scholarship deadline',
  deadlinePassedNotice:
    'Deadline may have passed. Check the official provider page before applying.',
  awardAmount: 'Award amount',
  applicants: 'Scholarship applicants',
  requirements: 'Requirements',
  whoCanApply: 'Who can apply',
  verifyEligibilityNote:
    'Always verify the full eligibility rules on the official source before you apply.',
  sponsorAndApplication: 'Sponsor & application',
  applyNow: 'Apply now',
  applyPremiumTitle: 'Premium subscription required to apply on the official site',
  applyLoadingAria: 'Loading apply link',
  save: 'Save',
  saved: 'Saved ✓',
  saveAria: 'Save scholarship',
  removeSavedAria: 'Remove from saved',
  notRelevant: 'Not relevant',
  notRelevantAria: 'Hide scholarship from matches',
  restoreToMatches: 'Restore to matches',
  restoreAria: 'Restore scholarship to matches',
  lastVerifiedPrefix: 'Information last verified',
  confirmOfficialNote:
    'Always confirm deadlines, requirements, and application details on the official page before you apply.',
  showMore: 'Show more',
  showLess: 'Show less',
  studyInPrefix: 'Study in:',
  studyInMulti: (count) => `Study in: ${count} countries`,
  providerWebsite: 'Provider website',
  signInToUnlock: 'Sign in to unlock',
  language: 'Language'
};

const ES: ScholarshipDetailUiCopy = {
  backToMatches: '← Volver a coincidencias',
  scholarshipsHub: 'Becas',
  notFound: 'Beca no encontrada',
  failedToLoad: 'No se pudieron cargar las becas',
  deadline: 'Fecha límite',
  deadlineSecondary: 'Fecha límite de la beca',
  deadlinePassedNotice:
    'La fecha límite puede haber vencido. Consulta la página oficial del proveedor antes de postular.',
  awardAmount: 'Monto del premio',
  applicants: 'Postulantes',
  requirements: 'Requisitos',
  whoCanApply: 'Quién puede postular',
  verifyEligibilityNote:
    'Verifica siempre las reglas de elegibilidad en la fuente oficial antes de postular.',
  sponsorAndApplication: 'Patrocinador y postulación',
  applyNow: 'Postular ahora',
  applyPremiumTitle:
    'Se requiere suscripción premium para postular en el sitio oficial',
  applyLoadingAria: 'Cargando enlace de postulación',
  save: 'Guardar',
  saved: 'Guardada ✓',
  saveAria: 'Guardar beca',
  removeSavedAria: 'Quitar de guardadas',
  notRelevant: 'No relevante',
  notRelevantAria: 'Ocultar beca de coincidencias',
  restoreToMatches: 'Restaurar en coincidencias',
  restoreAria: 'Restaurar beca en coincidencias',
  lastVerifiedPrefix: 'Información verificada por última vez',
  confirmOfficialNote:
    'Confirma siempre plazos, requisitos y detalles de postulación en la página oficial antes de postular.',
  showMore: 'Ver más',
  showLess: 'Ver menos',
  studyInPrefix: 'Estudiar en:',
  studyInMulti: (count) => `Estudiar en: ${count} países`,
  providerWebsite: 'Sitio del proveedor',
  signInToUnlock: 'Inicia sesión para desbloquear',
  language: 'Idioma'
};

const FR: ScholarshipDetailUiCopy = {
  backToMatches: '← Retour aux correspondances',
  scholarshipsHub: 'Bourses',
  notFound: 'Bourse introuvable',
  failedToLoad: 'Impossible de charger les bourses',
  deadline: 'Date limite',
  deadlineSecondary: 'Date limite de la bourse',
  deadlinePassedNotice:
    'La date limite est peut-être dépassée. Vérifiez la page officielle du fournisseur avant de postuler.',
  awardAmount: 'Montant de la bourse',
  applicants: 'Candidats',
  requirements: 'Exigences',
  whoCanApply: 'Qui peut postuler',
  verifyEligibilityNote:
    'Vérifiez toujours les règles d’éligibilité sur la source officielle avant de postuler.',
  sponsorAndApplication: 'Commanditaire et candidature',
  applyNow: 'Postuler',
  applyPremiumTitle:
    'Abonnement premium requis pour postuler sur le site officiel',
  applyLoadingAria: 'Chargement du lien de candidature',
  save: 'Enregistrer',
  saved: 'Enregistrée ✓',
  saveAria: 'Enregistrer la bourse',
  removeSavedAria: 'Retirer des enregistrées',
  notRelevant: 'Non pertinent',
  notRelevantAria: 'Masquer la bourse des correspondances',
  restoreToMatches: 'Restaurer dans les correspondances',
  restoreAria: 'Restaurer la bourse dans les correspondances',
  lastVerifiedPrefix: 'Informations vérifiées pour la dernière fois',
  confirmOfficialNote:
    'Confirmez toujours les dates limites, exigences et détails sur la page officielle avant de postuler.',
  showMore: 'Afficher plus',
  showLess: 'Afficher moins',
  studyInPrefix: 'Étudier en :',
  studyInMulti: (count) => `Étudier en : ${count} pays`,
  providerWebsite: 'Site du fournisseur',
  signInToUnlock: 'Connectez-vous pour débloquer',
  language: 'Langue'
};

export function getScholarshipDetailUiCopy(locale: LocalizedUiLocale): ScholarshipDetailUiCopy {
  if (locale === 'es') return ES;
  if (locale === 'fr') return FR;
  return EN;
}
