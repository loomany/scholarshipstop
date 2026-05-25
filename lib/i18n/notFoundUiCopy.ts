import type { Stage2PilotLocale } from '@/lib/i18n/pilotRoutes';

export type NotFoundUiCopy = {
  title: string;
  body: string;
  home: string;
};

const COPY: Record<'en' | Stage2PilotLocale, NotFoundUiCopy> = {
  en: {
    title: 'Page not found',
    body: 'The page you are looking for does not exist or has been moved.',
    home: 'Back to home'
  },
  es: {
    title: 'Página no encontrada',
    body: 'La página que buscas no existe o se ha movido.',
    home: 'Volver al inicio'
  },
  fr: {
    title: 'Page introuvable',
    body: 'La page que vous recherchez n’existe pas ou a été déplacée.',
    home: 'Retour à l’accueil'
  }
};

export function getNotFoundUiCopy(
  locale: 'en' | Stage2PilotLocale
): NotFoundUiCopy {
  return COPY[locale];
}
