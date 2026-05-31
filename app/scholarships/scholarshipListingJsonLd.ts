import {
  scholarshipPublicPath,
  type Scholarship
} from '@/app/scholarships/scholarshipsData';
import type { ScholarshipListResult } from '@/lib/scholarships/scholarshipListServer';
import {
  buildBreadcrumbListJsonLd,
  buildItemListJsonLd,
  buildWebPageJsonLd,
  type JsonLdBreadcrumbItem
} from '@/lib/seo/jsonLd';
import { getURL } from '@/utils/helpers';

type ScholarshipListingJsonLdInput = {
  name: string;
  description: string;
  path: string;
  result: Pick<ScholarshipListResult, 'scholarships' | 'seoFallback'>;
  breadcrumbs?: JsonLdBreadcrumbItem[] | null;
};

export function buildScholarshipListingJsonLd({
  name,
  description,
  path,
  result,
  breadcrumbs = null
}: ScholarshipListingJsonLdInput): Record<string, unknown> | null {
  const scholarships = result.scholarships ?? [];
  if (scholarships.length === 0) return null;
  if (result.seoFallback?.used) return null;

  const pageUrl = getURL(path.replace(/^\//, ''));
  const graph: Record<string, unknown>[] = [];

  const breadcrumbLd = breadcrumbs?.length ? buildBreadcrumbListJsonLd(breadcrumbs) : null;
  if (breadcrumbLd) graph.push(breadcrumbLd);

  graph.push(
    buildWebPageJsonLd({
      name,
      description,
      url: pageUrl
    })
  );

  const itemListLd = buildItemListJsonLd({
    name,
    description,
    url: pageUrl,
    items: scholarships.map((scholarship: Scholarship) => ({
      name: scholarship.title,
      url: getURL(scholarshipPublicPath(scholarship).replace(/^\//, ''))
    }))
  });
  if (itemListLd) graph.push(itemListLd);

  if (graph.length === 0) return null;
  if (graph.length === 1) return graph[0]!;

  return {
    '@context': 'https://schema.org',
    '@graph': graph
  };
}

export function buildStateScholarshipBreadcrumbs(input: {
  stateLabel: string;
  stateSlug: string;
  homeLabel?: string;
  scholarshipsHubLabel?: string;
}): JsonLdBreadcrumbItem[] {
  return [
    { name: input.homeLabel ?? 'Home', path: '/' },
    { name: input.scholarshipsHubLabel ?? 'Scholarships', path: '/scholarships' },
    {
      name: input.stateLabel,
      path: `/scholarships/${input.stateSlug}`
    }
  ];
}

export function buildUniversityScholarshipBreadcrumbs(input: {
  stateLabel: string;
  stateSlug: string;
  universityName: string;
  universitySlug: string;
}): JsonLdBreadcrumbItem[] {
  return [
    { name: 'Home', path: '/' },
    { name: 'Scholarships', path: '/scholarships' },
    {
      name: input.stateLabel,
      path: `/scholarships/${input.stateSlug}`
    },
    {
      name: input.universityName,
      path: `/scholarships/${input.stateSlug}/${input.universitySlug}`
    }
  ];
}
