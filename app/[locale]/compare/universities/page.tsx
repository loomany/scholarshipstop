import { notFound } from 'next/navigation';

import { generateMetadata as generateEnglishMetadata } from '@/app/compare/universities/page';
import { UniversityCompareHubPageBody } from '@/app/compare/universities/universityCompareHubPageBody';
import {
  METADATA_NOT_FOUND,
  resolveStage2PilotLocaleFromParams
} from '@/lib/i18n/metadataRouteParams';
import {
  isStage2PilotLocale,
  type Stage2PilotLocale
} from '@/lib/i18n/pilotRoutes';

type PageProps = {
  params: { locale: string };
  searchParams?: Record<string, string | string[] | undefined>;
};

export function generateMetadata(props: {
  params?: { locale?: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const locale = resolveStage2PilotLocaleFromParams(props.params);
  if (!locale) return METADATA_NOT_FOUND;
  return generateEnglishMetadata({ searchParams: props.searchParams });
}

export default function LocalizedUniversityCompareHubPage({
  params,
  searchParams
}: PageProps) {
  if (!isStage2PilotLocale(params.locale)) notFound();
  const locale = params.locale as Stage2PilotLocale;
  return (
    <UniversityCompareHubPageBody searchParams={searchParams} locale={locale} />
  );
}
