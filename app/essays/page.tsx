import type { Metadata } from 'next';

import { EssaysIndexPageContent } from '@/components/essays/EssaysIndexPageContent';
import { ESSAYS_SECTION_PATH } from '@/lib/essays/essayHubSection';
import { buildStage2EnglishPilotAlternates } from '@/lib/i18n/englishAlternates';
import { parseEssaysIndexSearchParams } from '@/lib/essays/essaysIndexFilters';
import { getCanonical } from '@/lib/seo/canonical';

export const revalidate = 300;

const baseTitle = 'Scholarship Essay Guides & Examples (2026)';
const baseDescription =
  'Use ScholarshipTop essay guides, examples, outlines, checklists, and prompt-specific advice to plan stronger scholarship applications.';

export function generateMetadata({
  searchParams
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}): Metadata {
  const queryState = parseEssaysIndexSearchParams(searchParams);
  const hasNonCanonicalView =
    queryState.page > 1 ||
    queryState.q.length > 0 ||
    queryState.categoryKey != null ||
    queryState.sort !== 'latest';
  const canonical = getCanonical(ESSAYS_SECTION_PATH);

  return {
    title: baseTitle,
    description: baseDescription,
    openGraph: { title: baseTitle, description: baseDescription, url: canonical },
    alternates: buildStage2EnglishPilotAlternates(ESSAYS_SECTION_PATH),
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

export default async function EssaysIndexPage({
  searchParams
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  return <EssaysIndexPageContent searchParams={searchParams} locale="en" />;
}
