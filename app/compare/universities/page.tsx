import type { Metadata } from 'next';

import { getCanonical } from '@/lib/seo/canonical';
import { parseCompareIndexSearchParams } from '@/lib/seo/compareIndexFilters';
import { UniversityCompareHubPageBody } from '@/app/compare/universities/universityCompareHubPageBody';

export const revalidate = 3600;

const EN_BASE_PATH = '/compare/universities';
const baseTitle = 'University vs University';
const baseDescription =
  'Browse published university-vs-university scholarship comparisons with searchable cards and quick sorting.';

export function generateMetadata({
  searchParams
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}): Metadata {
  const queryState = parseCompareIndexSearchParams(searchParams);
  const hasNonCanonicalView =
    queryState.page > 1 || queryState.q.length > 0 || queryState.sort !== 'latest';
  const canonical = getCanonical(EN_BASE_PATH);

  return {
    title: `${baseTitle} | ScholarshipTop`,
    description: baseDescription,
    openGraph: {
      title: `${baseTitle} | ScholarshipTop`,
      description: baseDescription,
      url: canonical
    },
    alternates: { canonical },
    ...(hasNonCanonicalView
      ? {
          robots: {
            index: false,
            follow: true
          }
        }
      : {})
  };
}

export default async function UniversityBattlesPage({
  searchParams
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  return (
    <UniversityCompareHubPageBody searchParams={searchParams} locale="en" />
  );
}
