import type { LocalizedUiLocale } from '@/lib/i18n/localizedHref';

export type GuestGrantSignupModalCopy = {
  title: string;
  intro: string;
  cta: string;
  footer: string;
};

const EN: GuestGrantSignupModalCopy = {
  title: 'Create a free account to view scholarship details',
  intro: 'To continue, create your free account. It takes 10 seconds.',
  cta: 'Create Free Account',
  footer: 'Free account • 10 seconds'
};

const ES: GuestGrantSignupModalCopy = {
  title: 'Crea una cuenta gratuita para ver los detalles de la beca',
  intro: 'Para continuar, crea tu cuenta gratuita. Solo te llevará 10 segundos.',
  cta: 'Crear cuenta gratuita',
  footer: 'Cuenta gratuita • 10 segundos'
};

const FR: GuestGrantSignupModalCopy = {
  title: 'Créez un compte gratuit pour voir les détails de la bourse',
  intro: 'Pour continuer, créez votre compte gratuit. Cela prend 10 secondes.',
  cta: 'Créer un compte gratuit',
  footer: 'Compte gratuit • 10 secondes'
};

export function getGuestGrantSignupModalCopy(
  locale: LocalizedUiLocale
): GuestGrantSignupModalCopy {
  if (locale === 'es') return ES;
  if (locale === 'fr') return FR;
  return EN;
}
