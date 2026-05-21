import { normalizeCanonicalPath } from '@/lib/i18n/paths';
import { localizedPilotHref } from '@/lib/i18n/localizedHref';
import {
  isStage2PilotCanonicalPath,
  type Stage2PilotLocale
} from '@/lib/i18n/pilotRoutes';
import { getLocalizedPilotPage } from '@/lib/i18n/staticTranslations';

export type FooterLinkLocale = 'en' | Stage2PilotLocale;

export type FooterLinkEntry = {
  label: string;
  href: string;
  canonicalPath: string;
  available: boolean;
};

type FooterLinkDefinition = {
  canonicalPath: string;
  labels: Record<FooterLinkLocale, string>;
};

/** Same structure as English footer — canonical paths only. */
const FOOTER_LINK_DEFINITIONS: FooterLinkDefinition[] = [
  {
    canonicalPath: '/',
    labels: { en: 'Home', es: 'Inicio', fr: 'Accueil' }
  },
  {
    canonicalPath: '/about',
    labels: { en: 'About', es: 'Acerca de', fr: 'À propos' }
  },
  {
    canonicalPath: '/how-scholarshiptop-works',
    labels: {
      en: 'How it works',
      es: 'Cómo funciona',
      fr: 'Comment ça marche'
    }
  },
  {
    canonicalPath: '/scholarship-verification-methodology',
    labels: {
      en: 'Verification',
      es: 'Verificación',
      fr: 'Vérification'
    }
  },
  {
    canonicalPath: '/how-we-rank-scholarships',
    labels: {
      en: 'Ranking',
      es: 'Clasificación',
      fr: 'Classement'
    }
  },
  {
    canonicalPath: '/editorial-policy',
    labels: {
      en: 'Editorial Policy',
      es: 'Política editorial',
      fr: 'Politique éditoriale'
    }
  },
  {
    canonicalPath: '/corrections',
    labels: {
      en: 'Corrections',
      es: 'Correcciones',
      fr: 'Corrections'
    }
  },
  {
    canonicalPath: '/financial-aid-disclaimer',
    labels: {
      en: 'Disclaimer',
      es: 'Aviso legal',
      fr: 'Avertissement'
    }
  },
  {
    canonicalPath: '/how-we-make-money',
    labels: {
      en: 'How we make money',
      es: 'Cómo ganamos dinero',
      fr: "Comment nous gagnons de l'argent"
    }
  },
  {
    canonicalPath: '/help',
    labels: { en: 'Help', es: 'Ayuda', fr: 'Aide' }
  },
  {
    canonicalPath: '/privacy-policy',
    labels: {
      en: 'Privacy Policy',
      es: 'Política de privacidad',
      fr: 'Politique de confidentialité'
    }
  },
  {
    canonicalPath: '/terms',
    labels: {
      en: 'Terms of Service',
      es: 'Términos de servicio',
      fr: "Conditions d'utilisation"
    }
  },
  {
    canonicalPath: '/refund-policy',
    labels: {
      en: 'Refund Policy',
      es: 'Política de reembolso',
      fr: 'Politique de remboursement'
    }
  },
  {
    canonicalPath: '/faq',
    labels: {
      en: 'FAQ',
      es: 'Preguntas frecuentes',
      fr: 'FAQ'
    }
  }
];

export const FOOTER_LINK_CANONICAL_PATHS = FOOTER_LINK_DEFINITIONS.map(
  (entry) => entry.canonicalPath
);

function isFooterLinkAvailable(
  locale: FooterLinkLocale,
  canonicalPath: string
): boolean {
  if (!isStage2PilotCanonicalPath(canonicalPath)) return false;
  if (locale === 'en') return true;
  return Boolean(getLocalizedPilotPage(locale, canonicalPath));
}

export function isFooterLinkActive(
  canonicalPath: string,
  pathname: string
): boolean {
  const normalized = normalizeCanonicalPath(pathname);
  if (canonicalPath === '/') return normalized === '/';
  return (
    normalized === canonicalPath || normalized.startsWith(`${canonicalPath}/`)
  );
}

export function getFooterLinks(locale: FooterLinkLocale): FooterLinkEntry[] {
  return FOOTER_LINK_DEFINITIONS.flatMap((definition) => {
    const { canonicalPath, labels } = definition;
    const available = isFooterLinkAvailable(locale, canonicalPath);
    if (!available) return [];

    const href = localizedPilotHref(locale, canonicalPath);
    if (!href || href.includes('/en/')) return [];

    return [
      {
        label: labels[locale],
        href,
        canonicalPath,
        available: true
      }
    ];
  });
}
