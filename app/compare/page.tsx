import type { Metadata } from 'next';

import { CompareIndexPageContent } from '@/components/compare/CompareIndexPageContent';
import { parseCompareIndexSearchParams } from '@/lib/seo/compareIndexFilters';
import { buildStage2EnglishPilotAlternates } from '@/lib/i18n/englishAlternates';
import { getCanonical } from '@/lib/seo/canonical';

export const revalidate = 3600;

const baseDescription =
  'Compare scholarships, grants, award types, state scholarship markets, and university scholarship matchups with practical decision guides.';

export function generateMetadata({
  searchParams
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}): Metadata {
  const queryState = parseCompareIndexSearchParams(searchParams);
  const hasNonCanonicalView =
    queryState.page > 1 ||
    queryState.q.length > 0 ||
    queryState.category !== 'all' ||
    queryState.sort !== 'latest';
  const canonical = getCanonical('/compare');

  return {
    title: 'Compare Scholarships, Grants, and Award Types',
    description: baseDescription,
    openGraph: {
      title: 'Compare Scholarships, Grants, and Award Types | ScholarshipTop',
      description: baseDescription,
      url: canonical
    },
    alternates: buildStage2EnglishPilotAlternates('/compare'),
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

export default async function CompareHubPage({
  searchParams
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  return <CompareIndexPageContent searchParams={searchParams} locale="en" />;
}
