import type { LocalizedUiLocale } from '@/lib/i18n/localizedHref';

export type AccountUiCopy = {
  pageTitle: string;
  backToScholarships: string;
  savedRedirectNote: string;
};

const EN: AccountUiCopy = {
  pageTitle: 'Account',
  backToScholarships: '← Back to scholarships',
  savedRedirectNote: 'Saved scholarships open in the hub.'
};

const ES: AccountUiCopy = {
  pageTitle: 'Cuenta',
  backToScholarships: '← Volver a becas',
  savedRedirectNote: 'Las becas guardadas se abren en el hub.'
};

const FR: AccountUiCopy = {
  pageTitle: 'Compte',
  backToScholarships: '← Retour aux bourses',
  savedRedirectNote: 'Les bourses enregistrées s’ouvrent dans le hub.'
};

export function getAccountUiCopy(locale: LocalizedUiLocale): AccountUiCopy {
  if (locale === 'es') return ES;
  if (locale === 'fr') return FR;
  return EN;
}
