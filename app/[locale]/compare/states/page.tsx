import { notFound } from 'next/navigation';

import { generateMetadata as generateEnglishMetadata } from '@/app/compare/states/page';
import { StateCompareHubPageBody } from '@/app/compare/states/stateCompareHubPageBody';
import {
  isStage2PilotLocale,
  type Stage2PilotLocale
} from '@/lib/i18n/pilotRoutes';

type PageProps = {
  params: { locale: string };
  searchParams?: Record<string, string | string[] | undefined>;
};

export function generateMetadata(props: PageProps) {
  if (!isStage2PilotLocale(props.params.locale)) {
    return { title: 'Page not found', robots: { index: false, follow: false } };
  }
  return generateEnglishMetadata(props);
}

export default function LocalizedStateCompareHubPage({
  params,
  searchParams
}: PageProps) {
  if (!isStage2PilotLocale(params.locale)) notFound();
  const locale = params.locale as Stage2PilotLocale;
  return <StateCompareHubPageBody searchParams={searchParams} locale={locale} />;
}
