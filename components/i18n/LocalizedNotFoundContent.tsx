'use client';

import { LocaleAwareHomeLink } from '@/components/i18n/LocaleAwareHomeLink';
import { getStage2LocaleFromPathname } from '@/lib/i18n/pilotRoutes';
import { usePathname } from 'next/navigation';

const COPY = {
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
} as const;

export function LocalizedNotFoundContent() {
  const pathname = usePathname() ?? '/';
  const locale = getStage2LocaleFromPathname(pathname) ?? 'en';
  const copy = COPY[locale === 'en' ? 'en' : locale];

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900">{copy.title}</h1>
      <p className="mt-3 text-sm leading-relaxed text-zinc-600">{copy.body}</p>
      <LocaleAwareHomeLink className="mt-8 inline-flex items-center justify-center rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50">
        {copy.home}
      </LocaleAwareHomeLink>
    </div>
  );
}
