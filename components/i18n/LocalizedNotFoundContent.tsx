'use client';

import { NotFoundPageContent } from '@/components/i18n/NotFoundPageContent';
import { getStage2LocaleFromPathname } from '@/lib/i18n/pilotRoutes';
import { usePathname } from 'next/navigation';

/** Root/global 404 — infer locale from URL when not under `app/[locale]/not-found`. */
export function LocalizedNotFoundContent() {
  const pathname = usePathname() ?? '/';
  const locale = getStage2LocaleFromPathname(pathname) ?? 'en';
  return <NotFoundPageContent locale={locale} />;
}
