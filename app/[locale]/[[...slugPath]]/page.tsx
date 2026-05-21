import { notFound } from 'next/navigation';

import { LocalizedProductionPage } from '@/components/i18n/LocalizedProductionPage';
import { buildLocalizedPilotMetadata } from '@/lib/i18n/localizedMetadata';
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

export function generateMetadata({ params, searchParams }: PageProps) {
  const page = getLocalizedPilotPageBySegments(
    params.locale,
    params.slugPath
  );
  if (!page) {
    return {
      title: 'Page not found',
      robots: { index: false, follow: false }
    };
  }
  return buildLocalizedPilotMetadata({ page, searchParams });
}

export default function LocalizedPilotRoute({
  params,
  searchParams
}: PageProps) {
  const page = getLocalizedPilotPageBySegments(
    params.locale,
    params.slugPath
  );
  if (!page) notFound();
  return <LocalizedProductionPage page={page} searchParams={searchParams} />;
}
