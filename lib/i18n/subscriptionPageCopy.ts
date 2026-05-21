import type { LocalizedUiLocale } from '@/lib/i18n/localizedHref';

export type SubscriptionPlanFeature = {
  text: string;
  emphasized?: boolean;
};

export type SubscriptionPlanCopy = {
  title: string;
  buttonLabel: string;
  price: string;
  priceSuffix: string;
  billing: string;
  features: SubscriptionPlanFeature[];
  mostPopularBadge?: string;
  mostPopularAriaLabel?: string;
  bestValueBadge?: string;
  bestValueAriaLabel?: string;
};

export type SubscriptionPricingUiCopy = {
  pageTitle: string;
  metaTitle: string;
  metaDescription: string;
  paymentDisclaimer: string;
  plans: {
    monthly: SubscriptionPlanCopy;
    quarterly: SubscriptionPlanCopy;
    yearly: SubscriptionPlanCopy;
  };
  defaultCurrentPlanLabel: string;
  cancel: string;
  cancelAriaLabel: string;
  cancelGroupAriaLabel: string;
  redirecting: string;
  updateBillingInfo: string;
  resumeSubscription: string;
  resuming: string;
  openBillingPortal: string;
  openBillingInLemon: string;
  planChangeFailed: string;
  checkoutFailed: string;
  cancelFailed: string;
  resumeFailed: string;
  somethingWentWrong: string;
};

const EN: SubscriptionPricingUiCopy = {
  pageTitle: 'Unlock Premium Precision',
  metaTitle: 'Unlock Premium Precision',
  metaDescription:
    'Compare Monthly, Quarterly, and Yearly plans. Unlock premium scholarships, IQ strategy, essay mentor tools, and smart filters.',
  paymentDisclaimer:
    'Payments are securely processed by LemonSqueezy, our Merchant of Record.',
  plans: {
    monthly: {
      title: 'Monthly',
      buttonLabel: 'Start Plan',
      price: '$14.99',
      priceSuffix: '/mo',
      billing: 'Billed $14.99 every month.',
      features: [
        { text: 'Unlock Premium Scholarships' },
        { text: 'Unlock IQ Strategy Report', emphasized: true },
        { text: 'Access "Easy Apply" & "International"' },
        { text: 'Unblur all grant names & links' },
        { text: 'Unlimited Smart Filters' }
      ]
    },
    quarterly: {
      title: 'Quarterly',
      buttonLabel: 'Start Plan',
      price: '$9.66',
      priceSuffix: '/mo',
      billing: 'Billed $29 every 3 months.',
      mostPopularBadge: '⭐ Most Popular',
      mostPopularAriaLabel: 'Most popular plan',
      features: [
        { text: 'Everything in Monthly, plus:' },
        { text: 'Unlock AI Essay Mentor', emphasized: true },
        { text: 'IQ-based grant strategy + essay next steps' },
        { text: 'Smart Interview & Voice Input' },
        { text: 'Unlimited essay generations' },
        { text: 'Instant email alerts for new matches' },
        { text: 'Save 35% compared to monthly' }
      ]
    },
    yearly: {
      title: 'Yearly',
      buttonLabel: 'Start Plan',
      price: '$7.40',
      priceSuffix: '/mo',
      billing: 'Billed $89 every year.',
      bestValueBadge: '✨ Best Value',
      bestValueAriaLabel: 'Best value plan',
      features: [
        { text: 'Everything in Quarterly, plus:' },
        { text: 'Unlock AI Essay Mentor', emphasized: true },
        { text: 'Full IQ report with matched grants, awards, and deadlines' },
        { text: 'Best price per month' },
        { text: 'Priority AI processing' },
        { text: 'Priority email alerts for new matches' },
        { text: 'Full access for the entire application season' },
        { text: 'Save 50% compared to monthly' }
      ]
    }
  },
  defaultCurrentPlanLabel: 'Active Plan',
  cancel: 'Cancel',
  cancelAriaLabel: 'Cancel subscription',
  cancelGroupAriaLabel: 'Current plan. Cancel ends renewal at period end.',
  redirecting: 'Redirecting...',
  updateBillingInfo: 'Update Billing Info',
  resumeSubscription: 'Resume Subscription',
  resuming: 'Resuming…',
  openBillingPortal: 'Open billing portal',
  openBillingInLemon: 'Open billing in Lemon',
  planChangeFailed: 'Plan change failed. Please try again.',
  checkoutFailed: 'Failed to start checkout.',
  cancelFailed: 'Could not cancel subscription.',
  resumeFailed: 'Could not resume subscription.',
  somethingWentWrong: 'Something went wrong. Please try again.'
};

const ES: SubscriptionPricingUiCopy = {
  pageTitle: 'Desbloquea precisión premium',
  metaTitle: 'Desbloquea precisión premium',
  metaDescription:
    'Compara planes mensual, trimestral y anual. Desbloquea becas premium, estrategia IQ, mentor de ensayos y filtros inteligentes.',
  paymentDisclaimer:
    'Los pagos se procesan de forma segura con LemonSqueezy, nuestro Merchant of Record.',
  plans: {
    monthly: {
      title: 'Mensual',
      buttonLabel: 'Empezar plan',
      price: '$14.99',
      priceSuffix: '/mes',
      billing: 'Facturación de $14.99 cada mes.',
      features: [
        { text: 'Desbloquea becas premium' },
        { text: 'Desbloquea el informe de estrategia IQ', emphasized: true },
        { text: 'Acceso a «Easy Apply» e «International»' },
        { text: 'Muestra todos los nombres y enlaces de becas' },
        { text: 'Filtros inteligentes ilimitados' }
      ]
    },
    quarterly: {
      title: 'Trimestral',
      buttonLabel: 'Empezar plan',
      price: '$9.66',
      priceSuffix: '/mes',
      billing: 'Facturación de $29 cada 3 meses.',
      mostPopularBadge: '⭐ Más popular',
      mostPopularAriaLabel: 'Plan más popular',
      features: [
        { text: 'Todo lo del plan mensual, más:' },
        { text: 'Desbloquea IQ Essay Mentor', emphasized: true },
        { text: 'Estrategia de becas basada en IQ + próximos pasos del ensayo' },
        { text: 'Entrevista inteligente y entrada por voz' },
        { text: 'Generaciones de ensayos ilimitadas' },
        { text: 'Alertas instantáneas por correo de nuevas coincidencias' },
        { text: 'Ahorra un 35 % frente al plan mensual' }
      ]
    },
    yearly: {
      title: 'Anual',
      buttonLabel: 'Empezar plan',
      price: '$7.40',
      priceSuffix: '/mes',
      billing: 'Facturación de $89 al año.',
      bestValueBadge: '✨ Mejor valor',
      bestValueAriaLabel: 'Plan de mejor valor',
      features: [
        { text: 'Todo lo del plan trimestral, más:' },
        { text: 'Desbloquea IQ Essay Mentor', emphasized: true },
        { text: 'Informe IQ completo con becas, premios y fechas límite' },
        { text: 'Mejor precio por mes' },
        { text: 'Procesamiento IA prioritario' },
        { text: 'Alertas prioritarias por correo de nuevas coincidencias' },
        { text: 'Acceso completo durante toda la temporada de solicitudes' },
        { text: 'Ahorra un 50 % frente al plan mensual' }
      ]
    }
  },
  defaultCurrentPlanLabel: 'Plan activo',
  cancel: 'Cancelar',
  cancelAriaLabel: 'Cancelar suscripción',
  cancelGroupAriaLabel:
    'Plan actual. Cancelar finaliza la renovación al terminar el periodo.',
  redirecting: 'Redirigiendo...',
  updateBillingInfo: 'Actualizar datos de facturación',
  resumeSubscription: 'Reanudar suscripción',
  resuming: 'Reanudando…',
  openBillingPortal: 'Abrir portal de facturación',
  openBillingInLemon: 'Abrir facturación en Lemon',
  planChangeFailed: 'No se pudo cambiar el plan. Inténtalo de nuevo.',
  checkoutFailed: 'No se pudo iniciar el pago.',
  cancelFailed: 'No se pudo cancelar la suscripción.',
  resumeFailed: 'No se pudo reanudar la suscripción.',
  somethingWentWrong: 'Algo salió mal. Inténtalo de nuevo.'
};

const FR: SubscriptionPricingUiCopy = {
  pageTitle: 'Débloquez la précision premium',
  metaTitle: 'Débloquez la précision premium',
  metaDescription:
    'Comparez les formules mensuelle, trimestrielle et annuelle. Débloquez bourses premium, stratégie IQ, mentor d’essais et filtres intelligents.',
  paymentDisclaimer:
    'Les paiements sont traités en toute sécurité par LemonSqueezy, notre Merchant of Record.',
  plans: {
    monthly: {
      title: 'Mensuel',
      buttonLabel: 'Commencer',
      price: '$14.99',
      priceSuffix: '/mois',
      billing: 'Facturation de 14,99 $ chaque mois.',
      features: [
        { text: 'Débloquez les bourses premium' },
        { text: 'Débloquez le rapport de stratégie IQ', emphasized: true },
        { text: 'Accès à « Easy Apply » et « International »' },
        { text: 'Affichez tous les noms et liens des bourses' },
        { text: 'Filtres intelligents illimités' }
      ]
    },
    quarterly: {
      title: 'Trimestriel',
      buttonLabel: 'Commencer',
      price: '$9.66',
      priceSuffix: '/mois',
      billing: 'Facturation de 29 $ tous les 3 mois.',
      mostPopularBadge: '⭐ Le plus populaire',
      mostPopularAriaLabel: 'Formule la plus populaire',
      features: [
        { text: 'Tout le Mensuel, plus :' },
        { text: 'Débloquez IQ Essay Mentor', emphasized: true },
        { text: 'Stratégie de bourses basée sur l’IQ + prochaines étapes d’essai' },
        { text: 'Entretien intelligent et saisie vocale' },
        { text: 'Générations d’essais illimitées' },
        { text: 'Alertes e-mail instantanées pour les nouvelles correspondances' },
        { text: 'Économisez 35 % par rapport au mensuel' }
      ]
    },
    yearly: {
      title: 'Annuel',
      buttonLabel: 'Commencer',
      price: '$7.40',
      priceSuffix: '/mois',
      billing: 'Facturation de 89 $ par an.',
      bestValueBadge: '✨ Meilleur rapport qualité-prix',
      bestValueAriaLabel: 'Formule au meilleur rapport qualité-prix',
      features: [
        { text: 'Tout le Trimestriel, plus :' },
        { text: 'Débloquez IQ Essay Mentor', emphasized: true },
        { text: 'Rapport IQ complet avec bourses, prix et dates limites' },
        { text: 'Meilleur prix par mois' },
        { text: 'Traitement IA prioritaire' },
        { text: 'Alertes e-mail prioritaires pour les nouvelles correspondances' },
        { text: 'Accès complet pour toute la saison des candidatures' },
        { text: 'Économisez 50 % par rapport au mensuel' }
      ]
    }
  },
  defaultCurrentPlanLabel: 'Formule active',
  cancel: 'Annuler',
  cancelAriaLabel: 'Annuler l’abonnement',
  cancelGroupAriaLabel:
    'Formule actuelle. L’annulation met fin au renouvellement à la fin de la période.',
  redirecting: 'Redirection…',
  updateBillingInfo: 'Mettre à jour la facturation',
  resumeSubscription: 'Reprendre l’abonnement',
  resuming: 'Reprise…',
  openBillingPortal: 'Ouvrir le portail de facturation',
  openBillingInLemon: 'Ouvrir la facturation dans Lemon',
  planChangeFailed: 'Échec du changement de formule. Réessayez.',
  checkoutFailed: 'Impossible de démarrer le paiement.',
  cancelFailed: 'Impossible d’annuler l’abonnement.',
  resumeFailed: 'Impossible de reprendre l’abonnement.',
  somethingWentWrong: 'Une erreur s’est produite. Réessayez.'
};

const COPY_BY_LOCALE: Record<LocalizedUiLocale, SubscriptionPricingUiCopy> = {
  en: EN,
  es: ES,
  fr: FR
};

export function getSubscriptionPricingUiCopy(
  locale: LocalizedUiLocale
): SubscriptionPricingUiCopy {
  return COPY_BY_LOCALE[locale];
}

/** Maps English status labels from billing helpers to localized UI copy. */
export function translateSubscriptionPlanStatusLabel(
  englishLabel: string,
  locale: LocalizedUiLocale
): string {
  if (locale === 'en') return englishLabel;
  const copy = getSubscriptionPricingUiCopy(locale);
  const table: Record<string, string> = {
    'Payment failed': locale === 'es' ? 'Pago fallido' : 'Paiement échoué',
    Paused: locale === 'es' ? 'En pausa' : 'En pause',
    Unpaid: locale === 'es' ? 'Impagado' : 'Impayé',
    Expired: locale === 'es' ? 'Caducado' : 'Expiré',
    Inactive: locale === 'es' ? 'Inactivo' : 'Inactif',
    'Active Plan': copy.defaultCurrentPlanLabel,
    Active: locale === 'es' ? 'Activo' : 'Actif',
    Trialing: locale === 'es' ? 'En prueba' : 'Essai',
    Trial: locale === 'es' ? 'Prueba' : 'Essai',
    Cancelled: locale === 'es' ? 'Cancelado' : 'Annulé',
    'Free Plan': locale === 'es' ? 'Plan gratuito' : 'Formule gratuite',
    Monthly: copy.plans.monthly.title,
    Quarterly: copy.plans.quarterly.title,
    Yearly: copy.plans.yearly.title
  };
  if (table[englishLabel]) return table[englishLabel]!;
  const parts = englishLabel.split(' · ');
  if (parts.length === 2) {
    const left = table[parts[0]!] ?? parts[0]!;
    const right = table[parts[1]!] ?? parts[1]!;
    return `${left} · ${right}`;
  }
  return englishLabel;
}

export const SUBSCRIPTION_CANONICAL_PATH = '/subscription';

export function localizedSubscriptionPath(locale: LocalizedUiLocale): string {
  if (locale === 'en') return SUBSCRIPTION_CANONICAL_PATH;
  return `/${locale}${SUBSCRIPTION_CANONICAL_PATH}`;
}
