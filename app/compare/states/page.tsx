import type { Metadata } from 'next';

import { getCanonical } from '@/lib/seo/canonical';
import { parseCompareIndexSearchParams } from '@/lib/seo/compareIndexFilters';
import { StateCompareHubPageBody } from '@/app/compare/states/stateCompareHubPageBody';

export const revalidate = 3600;

const EN_BASE_PATH = '/compare/states';
const baseTitle = 'State vs State';
const baseDescription =
  'Browse published state-vs-state scholarship comparisons with searchable cards and quick sorting.';

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

export default async function StateBattlesPage({
  searchParams
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  return <StateCompareHubPageBody searchParams={searchParams} locale="en" />;
}
