import type { AppSubscriptionPlan } from '@/lib/payments/subscriptionEntitlements';
import type { LocalizedUiLocale } from '@/lib/i18n/localizedHref';
import { FIELD_OF_STUDY_LABEL_ES, FIELD_OF_STUDY_LABEL_FR } from '@/lib/i18n/accountFieldOfStudyLabels';
import { CITIZENSHIP_OPTIONS } from '@/lib/constants/onboardingCitizenshipAndLocation';
import {
  FIELD_OF_STUDY_OPTIONS,
  SCHOOL_LEVEL_OPTIONS
} from '@/lib/constants/scholarshipProfileOptions';
import {
  SCHOLARSHIP_GPA_BUCKET_OPTIONS,
  SCHOLARSHIP_GPA_OPTIONS,
  SCHOLARSHIP_GPA_PREFER_NOT_TO_SAY
} from '@/lib/constants/scholarshipGpaOptions';

export type AccountProfileUiCopy = {
  sections: { personal: string; education: string; eligibility: string };
  labels: {
    firstName: string;
    lastName: string;
    email: string;
    birthMonth: string;
    birthDay: string;
    birthYear: string;
    schoolLevel: string;
    fieldOfStudy: string;
    citizenship: string;
    gpa: string;
    stateRegion: string;
    studyDestinations: string;
    studyIn: string;
    applicantCountry: string;
    usState: string;
  };
  placeholders: {
    schoolLevel: string;
    fieldOfStudy: string;
    citizenship: string;
    applicantCountry: string;
    gpaPreferNot: string;
  };
  emailStatus: { verified: string; unverified: string };
  resendConfirmation: string;
  resendSending: string;
  logOut: string;
  emailVerified: string;
  emailUnverified: string;
  emailConfirmedBadge: string;
  emailNotConfirmedBadge: string;
  emailConfirmInboxHint: string;
  save: string;
  saving: string;
  savedOk: string;
  savedHint: string;
  citizenshipNotSpecified: string;
  noMatchesFound: string;
  usStateHint: string;
  studyDestination: {
    chooseCountries: string;
    searchCountries: string;
    clearAll: string;
    pickUpTo: (max: number) => string;
    moreCount: (count: number) => string;
    noMatches: string;
    save: string;
    ariaTrigger: string;
    ariaListbox: string;
  };
  subscriptionPlanBadges: {
    free: string;
    trial: string;
    monthly_pro: string;
    quarterly_pro: string;
    yearly_pro: string;
    trialMonthly: string;
    trialQuarterly: string;
    trialYearly: string;
    canceledSuffix: string;
  };
  subscriptionStatusHeading: string;
  trialCountdown: string;
  stopSearchingHeadline: string;
  upgrade: string;
  save24: string;
  save52: string;
  quarterly: string;
  yearly: string;
  currentPlan: string;
  bestValue: string;
  manageSubscription: string;
  yearlyValueBlurb: string;
  pausedBillingNote: string;
  premiumPerks: readonly string[];
  freePlanPerks: readonly string[];
  grantNotify: {
    heading: string;
    description: string;
    channels: readonly {
      id: string;
      shortLabel: string;
      emailPromptOff: string;
      emailPromptOn: string;
    }[];
    sendTest: string;
    sendingTest: string;
    testOk: string;
    testErr: string;
  };
  subscriptionUi: {
    paymentFailed: {
      badge: string;
      title: string;
      subtitle: string;
      button: string;
    };
    paused: {
      badge: string;
      title: string;
      subtitle: string;
      button: string;
    };
    trial: { title: string; button: string };
    monthly: { title: string; subtitle: string };
    quarterly: { title: string; subtitle: string };
    yearly: { title: string; subtitle: string };
    none: {
      title: string;
      subtitle: string;
      button: string;
      buttonSubtext: string;
      badge: string;
    };
  };
};

const EN_GRANT_CHANNELS = [
  {
    id: 'best',
    shortLabel: 'Best recommendations',
    emailPromptOff: 'Get emails when we add strong new Best recommendations for you?',
    emailPromptOn:
      'Email alerts for Best recommendations are on — we will notify you about new picks.'
  },
  {
    id: 'saved_filters',
    shortLabel: 'Saved filters',
    emailPromptOff: 'Get emails when new scholarships match your saved filters?',
    emailPromptOn:
      'Email alerts for Saved filters are on — we will email you when new matches appear.'
  },
  {
    id: 'easy_apply',
    shortLabel: 'Easy apply',
    emailPromptOff: 'Get emails about new Easy apply opportunities?',
    emailPromptOn:
      'Email alerts for Easy apply are on — we will send you fresh quick-apply picks.'
  },
  {
    id: 'hot_deadlines',
    shortLabel: 'Hot deadlines',
    emailPromptOff: 'Get emails about approaching Hot deadlines?',
    emailPromptOn:
      'Email alerts for Hot deadlines are on — we will highlight time-sensitive grants.'
  }
] as const;

const EN: AccountProfileUiCopy = {
  sections: {
    personal: 'Personal info',
    education: 'Education',
    eligibility: 'Eligibility'
  },
  labels: {
    firstName: 'First name',
    lastName: 'Last name',
    email: 'Email',
    birthMonth: 'Birth month',
    birthDay: 'Birth day',
    birthYear: 'Birth year',
    schoolLevel: 'Current school level',
    fieldOfStudy: 'Field of study',
    citizenship: 'Citizenship status',
    gpa: 'GPA',
    stateRegion: 'State / region',
    studyDestinations: 'Preferred study destinations',
    studyIn: 'Study in',
    applicantCountry: 'Applicant country',
    usState: 'U.S. state'
  },
  placeholders: {
    schoolLevel: 'Select your school level',
    fieldOfStudy: 'Select your field of study',
    citizenship: 'Select citizenship status',
    applicantCountry: 'Select or type applicant country',
    gpaPreferNot: 'Prefer not to say (optional)'
  },
  emailStatus: { verified: 'Verified', unverified: 'Unverified' },
  resendConfirmation: 'Resend confirmation email',
  resendSending: 'Sending…',
  logOut: 'Log out',
  emailVerified: 'Verified',
  emailUnverified: 'Unverified',
  emailConfirmedBadge: 'Confirmed',
  emailNotConfirmedBadge: 'Not confirmed',
  emailConfirmInboxHint:
    'Check your inbox for the confirmation link. You can still browse; some actions may stay limited until you confirm.',
  save: 'Save',
  saving: 'Saving…',
  savedOk: 'Saved.',
  savedHint: 'Saved to your account. We use this for scholarship matching.',
  citizenshipNotSpecified: 'Citizenship not specified',
  noMatchesFound: 'No matches found.',
  usStateHint: 'Used for state-specific scholarships inside the U.S.',
  studyDestination: {
    chooseCountries: 'Choose countries (optional)',
    searchCountries: 'Search countries',
    clearAll: 'Clear all',
    pickUpTo: (max) =>
      `Pick up to ${max}. Leave empty if you have no preference yet.`,
    moreCount: (count) => `+${count} more`,
    noMatches: 'No matches.',
    save: 'Save',
    ariaTrigger:
      'Study in — choose destination countries (optional). Opens a list to pick one or more.',
    ariaListbox: 'Study in — destination countries'
  },
  subscriptionPlanBadges: {
    free: 'Free Plan',
    trial: '3-Day Trial',
    monthly_pro: 'Monthly Pro',
    quarterly_pro: 'Quarterly Pro',
    yearly_pro: 'Yearly Pro',
    trialMonthly: '3-Day Trial · Monthly',
    trialQuarterly: '3-Day Trial · Quarterly',
    trialYearly: '3-Day Trial · Yearly',
    canceledSuffix: '(Canceled)'
  },
  subscriptionStatusHeading: 'Subscription status',
  trialCountdown: 'Trial countdown',
  stopSearchingHeadline: 'Stop Searching. Start Winning.',
  upgrade: 'Upgrade',
  save24: 'Save 24%',
  save52: 'Save 52%',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
  currentPlan: 'Current plan',
  bestValue: 'Best Value',
  manageSubscription: 'Manage Subscription',
  yearlyValueBlurb: 'Best long-term value for consistent access all year.',
  pausedBillingNote:
    'Premium tools stay paused until you resume your subscription from the billing portal.',
  premiumPerks: [
    'Unlimited Scholarship Matches',
    'AI-Powered Application Assistant',
    'Early Access to New Grants'
  ],
  freePlanPerks: [
    'AI-Precision Matching: We filter out the noise. See only grants you actually qualify for.',
    'Precision Filters: Field of study, nationality, intent—sort instantly without the headache.',
    'Time-Saver: Stop wasting 20+ hours on manual research every single week.'
  ],
  grantNotify: {
    heading: 'Grant email alerts',
    description: 'Choose what we can email you about. You can change this anytime.',
    channels: EN_GRANT_CHANNELS,
    sendTest: 'Send test grant email',
    sendingTest: 'Sending test…',
    testOk: 'Check inbox',
    testErr: 'Could not send — check Resend env'
  },
  subscriptionUi: {
    paymentFailed: {
      badge: 'Payment Failed',
      title: 'Update Billing To Restore Access',
      subtitle:
        'We could not renew your subscription after the trial ended. Update your card to unlock access again.',
      button: 'Subscription Manager'
    },
    paused: {
      badge: 'Paused',
      title: 'Subscription on hold',
      subtitle:
        'Your subscription is currently paused. You can resume it anytime to regain full access.',
      button: 'Resume Access'
    },
    trial: {
      title: 'Keep Premium Access Active',
      button: 'Subscription Manager'
    },
    monthly: {
      title: 'Premium Precision Active',
      subtitle: 'You are saving 20+ hours of manual research this month.'
    },
    quarterly: { title: 'Smart Searching, Better Results', subtitle: '' },
    yearly: {
      title: 'Elite Access Unlocked',
      subtitle: 'You have top-tier priority for all AI-curated matches.'
    },
    none: {
      badge: 'Free Plan',
      title: 'Unlock Premium Access',
      subtitle: 'Start 3-Day Free Trial, then as low as $12/mo.',
      button: 'Subscription Manager',
      buttonSubtext: 'Full access. No commitment. Cancel anytime.'
    }
  }
};

const ES: AccountProfileUiCopy = {
  ...EN,
  sections: {
    personal: 'Información personal',
    education: 'Educación',
    eligibility: 'Elegibilidad'
  },
  labels: {
    firstName: 'Nombre',
    lastName: 'Apellido',
    email: 'Correo electrónico',
    birthMonth: 'Mes de nacimiento',
    birthDay: 'Día de nacimiento',
    birthYear: 'Año de nacimiento',
    schoolLevel: 'Nivel escolar actual',
    fieldOfStudy: 'Campo de estudio',
    citizenship: 'Estado de ciudadanía',
    gpa: 'GPA',
    stateRegion: 'Estado / región',
    studyDestinations: 'Destinos de estudio preferidos',
    studyIn: 'Estudiar en',
    applicantCountry: 'País del solicitante',
    usState: 'Estado de EE. UU.'
  },
  placeholders: {
    schoolLevel: 'Selecciona tu nivel escolar',
    fieldOfStudy: 'Selecciona tu campo de estudio',
    citizenship: 'Selecciona estado de ciudadanía',
    applicantCountry: 'Selecciona o escribe tu país',
    gpaPreferNot: 'Prefiero no decir (opcional)'
  },
  emailStatus: { verified: 'Verificado', unverified: 'Sin verificar' },
  resendConfirmation: 'Reenviar correo de confirmación',
  logOut: 'Cerrar sesión',
  emailVerified: 'Verificado',
  emailUnverified: 'Sin verificar',
  emailConfirmedBadge: 'Confirmado',
  emailNotConfirmedBadge: 'Sin confirmar',
  emailConfirmInboxHint:
    'Revisa tu bandeja de entrada para el enlace de confirmación. Puedes seguir navegando; algunas acciones pueden limitarse hasta confirmar.',
  save: 'Guardar',
  saving: 'Guardando…',
  savedOk: 'Guardado.',
  savedHint: 'Guardado en tu cuenta. Lo usamos para recomendar becas.',
  citizenshipNotSpecified: 'Ciudadanía no especificada',
  noMatchesFound: 'Sin coincidencias.',
  usStateHint: 'Para becas específicas de un estado dentro de EE. UU.',
  studyDestination: {
    chooseCountries: 'Elegir países (opcional)',
    searchCountries: 'Buscar países',
    clearAll: 'Borrar todo',
    pickUpTo: (max) =>
      `Elige hasta ${max}. Déjalo vacío si aún no tienes preferencia.`,
    moreCount: (count) => `+${count} más`,
    noMatches: 'Sin coincidencias.',
    save: 'Guardar',
    ariaTrigger:
      'Estudiar en — elegir países de destino (opcional). Abre una lista para elegir uno o más.',
    ariaListbox: 'Estudiar en — países de destino'
  },
  subscriptionPlanBadges: {
    free: 'Plan gratuito',
    trial: 'Prueba de 3 días',
    monthly_pro: 'Pro mensual',
    quarterly_pro: 'Pro trimestral',
    yearly_pro: 'Pro anual',
    trialMonthly: 'Prueba 3 días · Mensual',
    trialQuarterly: 'Prueba 3 días · Trimestral',
    trialYearly: 'Prueba 3 días · Anual',
    canceledSuffix: '(Cancelado)'
  },
  subscriptionStatusHeading: 'Estado de suscripción',
  trialCountdown: 'Cuenta regresiva de prueba',
  stopSearchingHeadline: 'Deja de buscar. Empieza a ganar.',
  upgrade: 'Mejorar plan',
  save24: 'Ahorra 24%',
  save52: 'Ahorra 52%',
  quarterly: 'Trimestral',
  yearly: 'Anual',
  currentPlan: 'Plan actual',
  bestValue: 'Mejor valor',
  manageSubscription: 'Gestionar suscripción',
  yearlyValueBlurb: 'El mejor valor a largo plazo para acceso constante todo el año.',
  pausedBillingNote:
    'Las herramientas premium permanecen en pausa hasta que reanudes tu suscripción desde el portal de facturación.',
  premiumPerks: [
    'Coincidencias de becas ilimitadas',
    'Asistente de solicitudes con IA',
    'Acceso anticipado a nuevas becas'
  ],
  freePlanPerks: [
    'Coincidencia precisa con IA: filtramos el ruido. Solo becas para las que puedes calificar.',
    'Filtros precisos: campo, nacionalidad, intención—ordena al instante.',
    'Ahorra tiempo: deja de perder 20+ horas en investigación manual cada semana.'
  ],
  grantNotify: {
    heading: 'Alertas de becas por correo',
    description: 'Elige sobre qué podemos enviarte correos. Puedes cambiarlo cuando quieras.',
    channels: [
      {
        id: 'best',
        shortLabel: 'Mejores recomendaciones',
        emailPromptOff: '¿Recibir correos cuando añadamos nuevas mejores recomendaciones?',
        emailPromptOn:
          'Alertas de mejores recomendaciones activadas: te avisaremos de nuevas opciones.'
      },
      {
        id: 'saved_filters',
        shortLabel: 'Filtros guardados',
        emailPromptOff: '¿Correos cuando haya becas nuevas que coincidan con tus filtros guardados?',
        emailPromptOn:
          'Alertas de filtros guardados activadas: te enviaremos nuevas coincidencias.'
      },
      {
        id: 'easy_apply',
        shortLabel: 'Solicitud fácil',
        emailPromptOff: '¿Correos sobre nuevas oportunidades de solicitud fácil?',
        emailPromptOn:
          'Alertas de solicitud fácil activadas: enviaremos nuevas opciones rápidas.'
      },
      {
        id: 'hot_deadlines',
        shortLabel: 'Fechas límite urgentes',
        emailPromptOff: '¿Correos sobre fechas límite próximas?',
        emailPromptOn:
          'Alertas de fechas límite activadas: destacaremos becas urgentes.'
      }
    ],
    sendTest: 'Enviar correo de prueba',
    sendingTest: 'Enviando…',
    testOk: 'Revisa tu bandeja',
    testErr: 'No se pudo enviar — revisa Resend'
  },
  subscriptionUi: {
    paymentFailed: {
      badge: 'Pago fallido',
      title: 'Actualiza la facturación para restaurar el acceso',
      subtitle:
        'No pudimos renovar tu suscripción tras la prueba. Actualiza tu tarjeta para desbloquear el acceso.',
      button: 'Gestor de suscripción'
    },
    paused: {
      badge: 'En pausa',
      title: 'Suscripción en espera',
      subtitle:
        'Tu suscripción está en pausa. Puedes reanudarla cuando quieras para recuperar el acceso completo.',
      button: 'Reanudar acceso'
    },
    trial: {
      title: 'Mantén activo el acceso Premium',
      button: 'Gestor de suscripción'
    },
    monthly: {
      title: 'Precisión Premium activa',
      subtitle: 'Estás ahorrando más de 20 horas de investigación manual este mes.'
    },
    quarterly: {
      title: 'Búsqueda inteligente, mejores resultados',
      subtitle: ''
    },
    yearly: {
      title: 'Acceso élite desbloqueado',
      subtitle: 'Tienes prioridad máxima en todas las coincidencias curadas por IA.'
    },
    none: {
      badge: 'Plan gratuito',
      title: 'Desbloquea acceso Premium',
      subtitle: 'Prueba gratis 3 días, luego desde $12/mes.',
      button: 'Gestor de suscripción',
      buttonSubtext: 'Acceso completo. Sin compromiso. Cancela cuando quieras.'
    }
  }
};

const FR: AccountProfileUiCopy = {
  ...EN,
  sections: {
    personal: 'Informations personnelles',
    education: 'Formation',
    eligibility: 'Éligibilité'
  },
  labels: {
    firstName: 'Prénom',
    lastName: 'Nom',
    email: 'E-mail',
    birthMonth: 'Mois de naissance',
    birthDay: 'Jour de naissance',
    birthYear: 'Année de naissance',
    schoolLevel: 'Niveau scolaire actuel',
    fieldOfStudy: 'Domaine d’études',
    citizenship: 'Statut de citoyenneté',
    gpa: 'GPA',
    stateRegion: 'État / région',
    studyDestinations: 'Destinations d’études préférées',
    studyIn: 'Étudier en',
    applicantCountry: 'Pays du candidat',
    usState: 'État américain'
  },
  placeholders: {
    schoolLevel: 'Sélectionnez votre niveau scolaire',
    fieldOfStudy: 'Sélectionnez votre domaine d’études',
    citizenship: 'Sélectionnez le statut de citoyenneté',
    applicantCountry: 'Sélectionnez ou saisissez votre pays',
    gpaPreferNot: 'Je préfère ne pas répondre (facultatif)'
  },
  emailStatus: { verified: 'Vérifié', unverified: 'Non vérifié' },
  resendConfirmation: 'Renvoyer l’e-mail de confirmation',
  logOut: 'Se déconnecter',
  emailVerified: 'Vérifié',
  emailUnverified: 'Non vérifié',
  emailConfirmedBadge: 'Confirmé',
  emailNotConfirmedBadge: 'Non confirmé',
  emailConfirmInboxHint:
    'Consultez votre boîte mail pour le lien de confirmation. Vous pouvez continuer à parcourir le site ; certaines actions restent limitées tant que vous n’avez pas confirmé.',
  save: 'Enregistrer',
  saving: 'Enregistrement…',
  savedOk: 'Enregistré.',
  savedHint: 'Enregistré sur votre compte. Utilisé pour les recommandations de bourses.',
  citizenshipNotSpecified: 'Citoyenneté non précisée',
  noMatchesFound: 'Aucune correspondance.',
  usStateHint: 'Pour les bourses propres à un État aux États-Unis.',
  studyDestination: {
    chooseCountries: 'Choisir des pays (facultatif)',
    searchCountries: 'Rechercher des pays',
    clearAll: 'Tout effacer',
    pickUpTo: (max) =>
      `Choisissez jusqu’à ${max}. Laissez vide si vous n’avez pas encore de préférence.`,
    moreCount: (count) => `+${count} de plus`,
    noMatches: 'Aucune correspondance.',
    save: 'Enregistrer',
    ariaTrigger:
      'Étudier en — choisir les pays de destination (facultatif). Ouvre une liste pour en sélectionner un ou plusieurs.',
    ariaListbox: 'Étudier en — pays de destination'
  },
  subscriptionPlanBadges: {
    free: 'Forfait gratuit',
    trial: 'Essai 3 jours',
    monthly_pro: 'Pro mensuel',
    quarterly_pro: 'Pro trimestriel',
    yearly_pro: 'Pro annuel',
    trialMonthly: 'Essai 3 jours · Mensuel',
    trialQuarterly: 'Essai 3 jours · Trimestriel',
    trialYearly: 'Essai 3 jours · Annuel',
    canceledSuffix: '(Annulé)'
  },
  subscriptionStatusHeading: 'Statut de l’abonnement',
  trialCountdown: 'Compte à rebours d’essai',
  stopSearchingHeadline: 'Arrêtez de chercher. Commencez à gagner.',
  upgrade: 'Passer au plan supérieur',
  save24: 'Économisez 24 %',
  save52: 'Économisez 52 %',
  quarterly: 'Trimestriel',
  yearly: 'Annuel',
  currentPlan: 'Forfait actuel',
  bestValue: 'Meilleur rapport qualité-prix',
  manageSubscription: 'Gérer l’abonnement',
  yearlyValueBlurb:
    'La meilleure valeur à long terme pour un accès constant toute l’année.',
  pausedBillingNote:
    'Les outils premium restent en pause jusqu’à la reprise de l’abonnement via le portail de facturation.',
  premiumPerks: [
    'Correspondances de bourses illimitées',
    'Assistant de candidature IA',
    'Accès anticipé aux nouvelles bourses'
  ],
  freePlanPerks: [
    'Correspondance IA précise : nous filtrons le bruit. Voyez seulement les bourses éligibles.',
    'Filtres précis : domaine, nationalité, objectif—tri instantané.',
    'Gain de temps : évitez 20+ heures de recherche manuelle chaque semaine.'
  ],
  grantNotify: {
    heading: 'Alertes bourses par e-mail',
    description: 'Choisissez ce que nous pouvons vous envoyer. Modifiable à tout moment.',
    channels: [
      {
        id: 'best',
        shortLabel: 'Meilleures recommandations',
        emailPromptOff:
          'Recevoir des e-mails lors de nouvelles meilleures recommandations ?',
        emailPromptOn:
          'Alertes meilleures recommandations activées : nous vous informerons des nouveautés.'
      },
      {
        id: 'saved_filters',
        shortLabel: 'Filtres enregistrés',
        emailPromptOff:
          'E-mails lorsque de nouvelles bourses correspondent à vos filtres ?',
        emailPromptOn:
          'Alertes filtres enregistrés activées : nous vous enverrons les nouvelles correspondances.'
      },
      {
        id: 'easy_apply',
        shortLabel: 'Candidature facile',
        emailPromptOff: 'E-mails sur les nouvelles candidatures faciles ?',
        emailPromptOn:
          'Alertes candidature facile activées : nouvelles opportunités rapides.'
      },
      {
        id: 'hot_deadlines',
        shortLabel: 'Dates limites urgentes',
        emailPromptOff: 'E-mails sur les dates limites proches ?',
        emailPromptOn:
          'Alertes dates limites activées : nous mettrons en avant l’urgence.'
      }
    ],
    sendTest: 'Envoyer un e-mail test',
    sendingTest: 'Envoi…',
    testOk: 'Vérifiez votre boîte mail',
    testErr: 'Échec d’envoi — vérifiez Resend'
  },
  subscriptionUi: {
    paymentFailed: {
      badge: 'Échec du paiement',
      title: 'Mettez à jour la facturation pour rétablir l’accès',
      subtitle:
        'Nous n’avons pas pu renouveler votre abonnement après l’essai. Mettez à jour votre carte.',
      button: 'Gestion de l’abonnement'
    },
    paused: {
      badge: 'En pause',
      title: 'Abonnement en attente',
      subtitle:
        'Votre abonnement est en pause. Reprenez-le pour retrouver l’accès complet.',
      button: 'Reprendre l’accès'
    },
    trial: {
      title: 'Gardez l’accès Premium actif',
      button: 'Gestion de l’abonnement'
    },
    monthly: {
      title: 'Précision Premium active',
      subtitle: 'Vous économisez plus de 20 heures de recherche manuelle ce mois-ci.'
    },
    quarterly: {
      title: 'Recherche intelligente, meilleurs résultats',
      subtitle: ''
    },
    yearly: {
      title: 'Accès élite débloqué',
      subtitle: 'Priorité maximale pour toutes les correspondances IA.'
    },
    none: {
      badge: 'Forfait gratuit',
      title: 'Débloquez l’accès Premium',
      subtitle: 'Essai gratuit 3 jours, puis à partir de 12 $/mois.',
      button: 'Gestion de l’abonnement',
      buttonSubtext: 'Accès complet. Sans engagement. Annulez à tout moment.'
    }
  }
};

export function getAccountProfileUiCopy(
  locale: LocalizedUiLocale
): AccountProfileUiCopy {
  if (locale === 'es') return ES;
  if (locale === 'fr') return FR;
  return EN;
}

/** Select options: values unchanged, labels localized. */
export function accountSchoolLevelSelectOptions(locale: LocalizedUiLocale) {
  const t = getAccountProfileUiCopy(locale);
  return [
    { value: '', label: t.placeholders.schoolLevel },
    ...SCHOOL_LEVEL_OPTIONS.map((o) => ({
      value: o.value,
      label:
        locale === 'en'
          ? o.label
          : accountProfileOptionLabel('school', o.value, locale, o.label)
    }))
  ];
}

export function accountFieldOfStudySelectOptions(locale: LocalizedUiLocale) {
  const t = getAccountProfileUiCopy(locale);
  return [
    { value: '', label: t.placeholders.fieldOfStudy },
    ...FIELD_OF_STUDY_OPTIONS.map((o) => ({
      value: o.value,
      label:
        locale === 'en'
          ? o.label
          : accountProfileOptionLabel('field', o.value, locale, o.label)
    }))
  ];
}

export function accountCitizenshipSelectOptions(locale: LocalizedUiLocale) {
  const t = getAccountProfileUiCopy(locale);
  return [
    { value: '', label: t.placeholders.citizenship },
    ...CITIZENSHIP_OPTIONS.map((o) => ({
      value: o.value,
      label:
        locale === 'en'
          ? o.label
          : accountProfileOptionLabel('citizenship', o.value, locale, o.label)
    }))
  ];
}

export function accountGpaSelectOptions(locale: LocalizedUiLocale) {
  const t = getAccountProfileUiCopy(locale);
  return [
    { value: SCHOLARSHIP_GPA_PREFER_NOT_TO_SAY, label: t.placeholders.gpaPreferNot },
    ...SCHOLARSHIP_GPA_BUCKET_OPTIONS.map((o) => ({
      value: o.value,
      label:
        locale === 'en'
          ? o.label
          : accountProfileOptionLabel('gpa_bucket', o.value, locale, o.label)
    })),
    ...SCHOLARSHIP_GPA_OPTIONS.map((o) => ({
      value: o.value,
      label:
        locale === 'en'
          ? o.label
          : accountProfileOptionLabel('gpa', o.value, locale, o.label)
    }))
  ];
}

const SCHOOL_LEVEL_ES: Record<string, string> = {
  high_school_freshman: '1.er año de secundaria',
  high_school_sophomore: '2.º año de secundaria',
  high_school_junior: '3.er año de secundaria',
  high_school_senior: 'Último año de secundaria',
  college_1: '1.er año universitario',
  college_2: '2.º año universitario',
  college_3: '3.er año universitario',
  college_4: '4.º año universitario',
  graduate_student: 'Estudiante de posgrado',
  adult_non_traditional: 'Estudiante adulto/no tradicional'
};

const SCHOOL_LEVEL_FR: Record<string, string> = {
  high_school_freshman: '1re année de lycée',
  high_school_sophomore: '2e année de lycée',
  high_school_junior: '3e année de lycée',
  high_school_senior: 'Dernière année de lycée',
  college_1: '1re année universitaire',
  college_2: '2e année universitaire',
  college_3: '3e année universitaire',
  college_4: '4e année universitaire',
  graduate_student: 'Étudiant diplômé',
  adult_non_traditional: 'Étudiant adulte/non traditionnel'
};

const CITIZENSHIP_ES: Record<string, string> = {
  us_citizen: 'Ciudadano estadounidense',
  us_permanent_resident: 'Residente permanente de EE. UU. (tarjeta verde)',
  domestic_or_unspecified: 'Sin ciudadanía indicada',
  international_student: 'Estudiante internacional'
};

const CITIZENSHIP_FR: Record<string, string> = {
  us_citizen: 'Citoyen américain',
  us_permanent_resident: 'Résident permanent américain (carte verte)',
  domestic_or_unspecified: 'Citoyenneté non indiquée',
  international_student: 'Étudiant international'
};

function accountProfileOptionLabel(
  group: 'school' | 'citizenship' | 'field' | 'gpa_bucket' | 'gpa',
  value: string,
  locale: LocalizedUiLocale,
  fallback: string
): string {
  if (locale === 'en') return fallback;
  if (group === 'school') {
    return (locale === 'es' ? SCHOOL_LEVEL_ES : SCHOOL_LEVEL_FR)[value] ?? fallback;
  }
  if (group === 'citizenship') {
    return (locale === 'es' ? CITIZENSHIP_ES : CITIZENSHIP_FR)[value] ?? fallback;
  }
  if (group === 'field') {
    return (locale === 'es' ? FIELD_OF_STUDY_LABEL_ES : FIELD_OF_STUDY_LABEL_FR)[
      value
    ] ?? fallback;
  }
  return fallback;
}

/** Maps English subscription badge text from billing to localized labels. */
export function accountLocalizedSubscriptionBadge(
  locale: LocalizedUiLocale,
  plan: AppSubscriptionPlan,
  englishLabel: string
): string {
  if (locale === 'en') return englishLabel;
  const badges = getAccountProfileUiCopy(locale).subscriptionPlanBadges;
  const canceled = /\(Canceled\)\s*$/i.test(englishLabel);
  const base = englishLabel.replace(/\s*\(Canceled\)\s*$/i, '').trim();
  let mapped: string;
  if (base.startsWith('3-Day Trial · ')) {
    if (base.includes('Yearly')) mapped = badges.trialYearly;
    else if (base.includes('Quarterly')) mapped = badges.trialQuarterly;
    else if (base.includes('Monthly')) mapped = badges.trialMonthly;
    else mapped = badges.trial;
  } else {
    mapped = badges[plan] ?? base;
  }
  return canceled ? `${mapped} ${badges.canceledSuffix}` : mapped;
}
