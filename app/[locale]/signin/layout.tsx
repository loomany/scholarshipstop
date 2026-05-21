import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';

import { isStage2PilotLocale } from '@/lib/i18n/pilotRoutes';

const TITLE_BY_LOCALE: Record<'es' | 'fr', string> = {
  es: 'Iniciar sesión',
  fr: 'Connexion'
};

export function generateMetadata({
  params
}: {
  params: { locale: string };
}): Metadata {
  if (!isStage2PilotLocale(params.locale)) {
    return { title: 'Page not found', robots: { index: false, follow: false } };
  }
  return {
    title: TITLE_BY_LOCALE[params.locale],
    robots: { index: false, follow: true },
    alternates: {
      canonical: `/${params.locale}/signin`
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
