import type { Metadata } from 'next';

import ScholarshipsSlugPathPageBody from '@/app/scholarships/scholarshipsSlugPathPageBody';
import { normalizeScholarshipDynamicParam } from '@/app/scholarships/scholarshipLongTailPresets';

export const revalidate = 300;

type PageProps = { params: { slugPath?: string[] } };

function toSearchParamsString(
  searchParams?: Record<string, string | string[] | undefined>
): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (Array.isArray(value)) {
      for (const part of value) {
        if (typeof part === 'string') qs.append(key, part);
      }
      continue;
    }
    if (typeof value === 'string') qs.set(key, value);
  }
  return qs.toString();
}

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
      searchParamsString={toSearchParamsString(searchParams)}
    />
  );
}
