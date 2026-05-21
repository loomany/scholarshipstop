import type { PropsWithChildren } from 'react';
import { notFound } from 'next/navigation';

import { LocaleUiPreference } from '@/components/i18n/LocaleUiPreference';
import {
  isStage2PilotLocale,
  type Stage2PilotLocale
} from '@/lib/i18n/pilotRoutes';

type LocaleLayoutProps = PropsWithChildren<{
  params: {
    locale: string;
  };
}>;

export const dynamicParams = false;

export function generateStaticParams() {
  return [{ locale: 'es' }, { locale: 'fr' }];
}

export default function LocaleLayout({ children, params }: LocaleLayoutProps) {
  if (!isStage2PilotLocale(params.locale)) notFound();
  const locale = params.locale as Stage2PilotLocale;
  return (
    <>
      <LocaleUiPreference locale={locale} />
      {children}
    </>
  );
}
