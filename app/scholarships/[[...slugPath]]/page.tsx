import type { Metadata } from 'next';

import ScholarshipsSlugPathPageBody from '@/app/scholarships/scholarshipsSlugPathPageBody';
import { hubPathToTab } from '@/app/scholarships/scholarshipHubPath';
import { buildScholarshipHubRouteMetadata } from '@/app/scholarships/scholarshipHubPageMetadata';
import { normalizeScholarshipDynamicParam } from '@/app/scholarships/scholarshipLongTailPresets';
import { scholarshipHubQueryStringFromNextSearchParamsRecord } from '@/app/scholarships/scholarshipHubCanonicalQueryString';
import { isSeoNoiseQuery } from '@/app/scholarships/scholarshipSeoNoiseQuery';
import { getCanonical } from '@/lib/seo/canonical';
import { buildStage2EnglishPilotAlternates } from '@/lib/i18n/englishAlternates';
import { generateScholarshipSlugLayoutMetadata } from '@/app/scholarships/scholarshipSlugLayoutMetadata';

export const revalidate = 300;

type PageProps = { params: { slugPath?: string[] } };

const SCHOLARSHIPS_ROOT_DESCRIPTION =
  'Browse the ScholarshipTop catalog to find scholarships by deadline, award amount, eligibility, field of study, GPA, and student background.';

export async function generateMetadata({
  params,
  searchParams
}: PageProps & {
  searchParams?: Record<string, string | string[] | undefined>;
}): Promise<Metadata> {
  const segments = (params.slugPath ?? []).map((s) =>
    normalizeScholarshipDynamicParam(decodeURIComponent(s))
  );
  if (hubPathToTab(segments)) {
    return buildScholarshipHubRouteMetadata({
      hubSegment: segments[1]!,
      searchParams
    });
  }
  const hasNonCanonicalQuery = isSeoNoiseQuery(searchParams);
  if (segments.length > 0) {
    const layoutMeta = await generateScholarshipSlugLayoutMetadata(params);
    if (!hasNonCanonicalQuery) {
      return layoutMeta;
    }
    const canonical = getCanonical(`/scholarships/${segments.join('/')}`);
    return {
      ...layoutMeta,
      alternates: {
        ...layoutMeta.alternates,
        canonical
      },
      robots: {
        index: false,
        follow: true
      }
    };
  }

  const canonical = getCanonical('/scholarships');
  return {
    title: 'Find Scholarships',
    description: SCHOLARSHIPS_ROOT_DESCRIPTION,
    alternates: buildStage2EnglishPilotAlternates('/scholarships'),
    openGraph: {
      title: 'Find Scholarships',
      description: SCHOLARSHIPS_ROOT_DESCRIPTION,
      url: canonical,
      type: 'website'
    },
    ...(hasNonCanonicalQuery
      ? {
          robots: {
            index: false,
            follow: true
          }
        }
      : {
          robots: {
            index: true,
            follow: true
          }
        })
  };
}

export default async function ScholarshipsCatchAllPage({
  params,
  searchParams
}: PageProps & {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const rawSegments = params.slugPath ?? [];
  const segments = rawSegments.map((s) =>
    normalizeScholarshipDynamicParam(decodeURIComponent(s))
  );

  return (
    <ScholarshipsSlugPathPageBody
      segments={segments}
      searchParamsString={scholarshipHubQueryStringFromNextSearchParamsRecord(
        searchParams
      )}
    />
  );
}
