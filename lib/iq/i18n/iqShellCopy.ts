import type { IqLocale } from '@/lib/iq/i18n/iqLocales';

export type IqShellCopy = {
  languageSwitcherLabel: string;
  languageNames: { en: string; es: string; fr: string };
  productNavAria: string;
  localeShellNotice: string | null;
};

const IQ_SHELL_COPY: Record<IqLocale, IqShellCopy> = {
  en: {
    languageSwitcherLabel: 'Language',
    languageNames: { en: 'English', es: 'Español', fr: 'Français' },
    productNavAria: 'IQ product navigation',
    localeShellNotice: null
  },
  es: {
    languageSwitcherLabel: 'Idioma',
    languageNames: { en: 'English', es: 'Español', fr: 'Français' },
    productNavAria: 'Navegación del producto IQ',
    localeShellNotice:
      'Interfaz en español — las preguntas y el informe completo se traducirán en la siguiente fase.'
  },
  fr: {
    languageSwitcherLabel: 'Langue',
    languageNames: { en: 'English', es: 'Español', fr: 'Français' },
    productNavAria: 'Navigation produit IQ',
    localeShellNotice:
      'Interface en français — les questions et le rapport complet seront traduits à l’étape suivante.'
  }
};

export function getIqShellCopy(locale: IqLocale): IqShellCopy {
  return IQ_SHELL_COPY[locale];
}
