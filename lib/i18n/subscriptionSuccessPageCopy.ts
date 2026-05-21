import type { LocalizedUiLocale } from '@/lib/i18n/localizedHref';

export type SubscriptionSuccessUiCopy = {
  metaTitle: string;
  h1: string;
  body: string;
  browseScholarships: string;
  goToAccount: string;
};

const EN: SubscriptionSuccessUiCopy = {
  metaTitle: 'Thank you for subscribing',
  h1: 'Thank you',
  body: 'Your payment was received. Premium access is activated as soon as our payment partner confirms your subscription — usually within a minute.',
  browseScholarships: 'Browse scholarships',
  goToAccount: 'Go to account'
};

const ES: SubscriptionSuccessUiCopy = {
  metaTitle: 'Gracias por suscribirte',
  h1: 'Gracias',
  body: 'Recibimos tu pago. El acceso Premium se activa en cuanto nuestro socio de pagos confirme la suscripción, normalmente en un minuto.',
  browseScholarships: 'Explorar becas',
  goToAccount: 'Ir a la cuenta'
};

const FR: SubscriptionSuccessUiCopy = {
  metaTitle: 'Merci pour votre abonnement',
  h1: 'Merci',
  body: 'Votre paiement a été reçu. L’accès Premium s’active dès confirmation par notre partenaire de paiement — en général sous une minute.',
  browseScholarships: 'Parcourir les bourses',
  goToAccount: 'Aller au compte'
};

export function getSubscriptionSuccessUiCopy(
  locale: LocalizedUiLocale
): SubscriptionSuccessUiCopy {
  if (locale === 'es') return ES;
  if (locale === 'fr') return FR;
  return EN;
}
