import { notFound } from 'next/navigation';

import { LocalizedProductionPage } from '@/components/i18n/LocalizedProductionPage';
import { buildLocalizedPilotMetadata } from '@/lib/i18n/localizedMetadata';
import {
  METADATA_NOT_FOUND,
  resolveStage2PilotLocaleFromParams
} from '@/lib/i18n/metadataRouteParams';
import { isStage2PilotLocale } from '@/lib/i18n/pilotRoutes';
import {
  getLocalizedPilotPageBySegments,
  listLocalizedPilotPages
} from '@/lib/i18n/staticTranslations';

type PageProps = {
  params: {
    locale: string;
    slugPath?: string[];
  };
  searchParams?: Record<string, string | string[] | undefined>;
};

export const dynamicParams = false;
export const revalidate = 3600;

export function generateStaticParams() {
  return listLocalizedPilotPages().map((page) => ({
    locale: page.locale,
    slugPath:
      page.canonicalPath === '/'
        ? []
        : page.canonicalPath.split('/').filter(Boolean)
  }));
}

export function generateMetadata({
  params,
  searchParams
}: {
  params?: { locale?: string; slugPath?: string[] };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const locale = resolveStage2PilotLocaleFromParams(params);
  if (!locale) return METADATA_NOT_FOUND;

  const page = getLocalizedPilotPageBySegments(locale, params?.slugPath);
  if (!page) return METADATA_NOT_FOUND;

  return buildLocalizedPilotMetadata({ page, searchParams });
}

export default function LocalizedPilotRoute({
  params,
  searchParams
}: PageProps) {
  if (!isStage2PilotLocale(params.locale)) notFound();

  const page = getLocalizedPilotPageBySegments(params.locale, params.slugPath);
  if (!page) notFound();
  return <LocalizedProductionPage page={page} searchParams={searchParams} />;
}
