import type { IqLocale } from '@/lib/iq/i18n/iqLocales';

export type IqFooterLinkKey =
  | 'home'
  | 'about'
  | 'help'
  | 'privacy'
  | 'terms'
  | 'refund'
  | 'faq';

export type IqFooterCopy = {
  navAria: string;
  homeAria: string;
  links: Record<IqFooterLinkKey, string>;
  paths: Record<IqFooterLinkKey, string>;
};

const COPY: Record<IqLocale, Omit<IqFooterCopy, 'paths'>> = {
  en: {
    navAria: 'IQ product footer',
    homeAria: 'IQ Profile - Home',
    links: {
      home: 'Home',
      about: 'About',
      help: 'Help',
      privacy: 'Privacy Policy',
      terms: 'Terms of Service',
      refund: 'Refund Policy',
      faq: 'FAQ'
    }
  },
  es: {
    navAria: 'Pie de página del producto IQ',
    homeAria: 'Perfil IQ — Inicio',
    links: {
      home: 'Inicio',
      about: 'Acerca de',
      help: 'Ayuda',
      privacy: 'Política de privacidad',
      terms: 'Términos del servicio',
      refund: 'Política de reembolso',
      faq: 'Preguntas frecuentes'
    }
  },
  fr: {
    navAria: 'Pied de page produit IQ',
    homeAria: 'Profil IQ — Accueil',
    links: {
      home: 'Accueil',
      about: 'À propos',
      help: 'Aide',
      privacy: 'Politique de confidentialité',
      terms: 'Conditions d’utilisation',
      refund: 'Politique de remboursement',
      faq: 'FAQ'
    }
  }
};

const PATHS: IqFooterCopy['paths'] = {
  home: '/',
  about: '/about',
  help: '/help',
  privacy: '/privacy-policy',
  terms: '/terms',
  refund: '/refund-policy',
  faq: '/faq'
};

export function getIqFooterCopy(locale: IqLocale): IqFooterCopy {
  return { ...COPY[locale], paths: PATHS };
}
