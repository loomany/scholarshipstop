import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';

import {
  METADATA_NOT_FOUND,
  resolveStage2PilotLocaleFromParams
} from '@/lib/i18n/metadataRouteParams';
import { isStage2PilotLocale } from '@/lib/i18n/pilotRoutes';

const TITLE_BY_LOCALE: Record<'es' | 'fr', string> = {
  es: 'Iniciar sesión',
  fr: 'Connexion'
};

export function generateMetadata({
  params
}: {
  params?: { locale?: string };
}): Metadata {
  const locale = resolveStage2PilotLocaleFromParams(params);
  if (!locale) return METADATA_NOT_FOUND;
  return {
    title: TITLE_BY_LOCALE[locale],
    robots: { index: false, follow: true },
    alternates: {
      canonical: `/${locale}/signin`
    }
  };
}

export default function LocalizedSignInLayout({
  children,
  params
}: {
  children: ReactNode;
  params: { locale: string };
}) {
  if (!isStage2PilotLocale(params.locale)) notFound();
  return children;
}
