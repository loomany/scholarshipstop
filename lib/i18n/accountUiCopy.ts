import type { LocalizedUiLocale } from '@/lib/i18n/localizedHref';

export const ACCOUNT_CANONICAL_PATH = '/account';

export type AccountUiCopy = {
  pageTitle: string;
  backToScholarships: string;
  savedRedirectNote: string;
};

/** Locale-aware account URL (`/account`, `/es/account`, `/fr/account`). */
export function localizedAccountPath(locale: LocalizedUiLocale): string {
  if (locale === 'en') return ACCOUNT_CANONICAL_PATH;
  return `/${locale}${ACCOUNT_CANONICAL_PATH}`;
}

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
