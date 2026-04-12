import type { Metadata } from 'next';

import ScholarshipsSlugPathPageBody from '@/app/scholarships/scholarshipsSlugPathPageBody';
import { normalizeScholarshipDynamicParam } from '@/app/scholarships/scholarshipLongTailPresets';

export const revalidate = 300;

type PageProps = { params: { slugPath?: string[] } };

export function generateMetadata({
  params,
  searchParams
}: PageProps & {
  searchParams?: Record<string, string | string[] | undefined>;
}): Metadata {
  const segments = (params.slugPath ?? []).map((s) =>
    normalizeScholarshipDynamicParam(decodeURIComponent(s))
  );
  if (segments.length > 0) return {};

  const hasNonCanonicalQuery =
    Boolean(searchParams?.q) ||
    Boolean(searchParams?.category) ||
    Boolean(searchParams?.sort) ||
    Boolean(searchParams?.page) ||
    Boolean(searchParams?.deadline) ||
    Boolean(searchParams?.tab);

  return {
    title: 'Find Scholarships',
    alternates: { canonical: '/scholarships' },
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

export default async function ScholarshipsCatchAllPage({ params }: PageProps) {
  const rawSegments = params.slugPath ?? [];
  const segments = rawSegments.map((s) =>
    normalizeScholarshipDynamicParam(decodeURIComponent(s))
  );

  return <ScholarshipsSlugPathPageBody segments={segments} />;
}
