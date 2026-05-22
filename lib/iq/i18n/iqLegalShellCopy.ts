import type { IqLocale } from '@/lib/iq/i18n/iqLocales';

export type IqLegalShellCopy = {
  eyebrow: string;
  backToIq: string;
};

const COPY: Record<IqLocale, IqLegalShellCopy> = {
  en: { eyebrow: 'IQ Profile', backToIq: 'Back to IQ Profile' },
  es: { eyebrow: 'Perfil de CI', backToIq: 'Volver al perfil de CI' },
  fr: { eyebrow: 'Profil de QI', backToIq: 'Retour au profil de QI' }
};

export function getIqLegalShellCopy(locale: IqLocale): IqLegalShellCopy {
  return COPY[locale];
}

export type IqLegalPageKey = 'faq' | 'help' | 'about' | 'terms' | 'privacy' | 'refund';

export type IqLegalMetadataEntry = { title: string; description: string };

const LEGAL_META: Record<IqLegalPageKey, Record<IqLocale, IqLegalMetadataEntry>> = {
  faq: {
    en: {
      title: 'IQ Profile FAQ',
      description: 'Frequently asked questions about IQ Profile.'
    },
    es: {
      title: 'Preguntas frecuentes — Perfil de CI',
      description: 'Preguntas habituales sobre el perfil de CI.'
    },
    fr: {
      title: 'FAQ — Profil de QI',
      description: 'Questions fréquentes sur le profil de QI.'
    }
  },
  help: {
    en: {
      title: 'IQ Profile Help',
      description: 'Help using IQ Profile and your cognitive report.'
    },
    es: {
      title: 'Ayuda — Perfil de CI',
      description: 'Ayuda para usar el perfil de CI y tu informe cognitivo.'
    },
    fr: {
      title: 'Aide — Profil de QI',
      description: 'Aide pour utiliser le profil de QI et votre rapport cognitif.'
    }
  },
  about: {
    en: {
      title: 'About IQ Profile',
      description: 'What IQ Profile measures and how to interpret results.'
    },
    es: {
      title: 'Acerca del perfil de CI',
      description: 'Qué mide el perfil de CI y cómo interpretar los resultados.'
    },
    fr: {
      title: 'À propos du profil de QI',
      description: 'Ce que mesure le profil de QI et comment interpréter les résultats.'
    }
  },
  terms: {
    en: {
      title: 'IQ Profile Terms',
      description: 'Terms of use for IQ Profile.'
    },
    es: {
      title: 'Términos — Perfil de CI',
      description: 'Términos de uso del perfil de CI.'
    },
    fr: {
      title: 'Conditions — Profil de QI',
      description: 'Conditions d’utilisation du profil de QI.'
    }
  },
  privacy: {
    en: {
      title: 'IQ Profile Privacy',
      description: 'Privacy policy for IQ Profile.'
    },
    es: {
      title: 'Privacidad — Perfil de CI',
      description: 'Política de privacidad del perfil de CI.'
    },
    fr: {
      title: 'Confidentialité — Profil de QI',
      description: 'Politique de confidentialité du profil de QI.'
    }
  },
  refund: {
    en: {
      title: 'IQ Profile Refund Policy',
      description: 'Refund policy for IQ Profile purchases.'
    },
    es: {
      title: 'Reembolsos — Perfil de CI',
      description: 'Política de reembolso de compras del perfil de CI.'
    },
    fr: {
      title: 'Remboursements — Profil de QI',
      description: 'Politique de remboursement des achats du profil de QI.'
    }
  }
};

export function getIqLegalMetadata(
  page: IqLegalPageKey,
  locale: IqLocale
): IqLegalMetadataEntry {
  return LEGAL_META[page][locale];
}
