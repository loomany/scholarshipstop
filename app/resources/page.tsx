import type { Metadata } from 'next';

import { ResourcesIndexPageContent } from '@/components/content-hub/ResourcesIndexPageContent';
import { parseResourcesIndexSearchParams } from '@/lib/content-hub/resourcesIndexFilters';
import {
  RESOURCES_PAGE_TITLE,
  RESOURCES_SECTION_PATH
} from '@/lib/content-hub/resourcesSection';
import { buildStage2EnglishPilotAlternates } from '@/lib/i18n/englishAlternates';
import { getCanonical } from '@/lib/seo/canonical';
import { DEFAULT_OPEN_GRAPH_IMAGES } from '@/lib/seo/socialImage';

export const revalidate = 300;

const baseTitle = `${RESOURCES_PAGE_TITLE} — Guides & Tips`;
const baseDescription =
  'Guides and expert tips to help you find scholarships, write stronger applications, and stay organized.';

export function generateMetadata({
  searchParams
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}): Metadata {
  const queryState = parseResourcesIndexSearchParams(searchParams);
  const hasNonCanonicalView =
    queryState.page > 1 ||
    queryState.q.length > 0 ||
    queryState.categoryId != null ||
    queryState.subcategoryIds.size > 0 ||
    queryState.sort !== 'latest';
  const canonical = getCanonical(RESOURCES_SECTION_PATH);

  return {
    title: baseTitle,
    description: baseDescription,
    openGraph: {
      title: baseTitle,
      description: baseDescription,
      url: canonical,
      images: DEFAULT_OPEN_GRAPH_IMAGES
    },
    alternates: buildStage2EnglishPilotAlternates(RESOURCES_SECTION_PATH),
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

export default async function ResourcesIndexPage({
  searchParams
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  return <ResourcesIndexPageContent searchParams={searchParams} locale="en" />;
}
