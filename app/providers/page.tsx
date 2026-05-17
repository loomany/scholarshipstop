import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';

import { ProvidersHubPageContent } from '@/components/providers/ProvidersHubPageContent';
import { parseProvidersHubCountryParam } from '@/lib/providers/providersHubCountryFilter';
import type { ProvidersHubSearchParams } from '@/lib/providers/providersHubSearchParams';
import {
  providersHubNationalIsSeoIndexable,
  searchQueryFromParams,
  parseProvidersHubStateQueryParam
} from '@/lib/providers/providersHubSearchParams';
import {
  buildProvidersHubHref,
  parseProvidersHubPageParam
} from '@/lib/providers/providersHubUrl';
import { SEO_ROUTE_STATE_SLUG_TO_CODE } from '@/lib/scholarships/seoTags/routeSegmentMaps';
import { getCanonical } from '@/lib/seo/canonical';

export type { ProvidersHubSearchParams };

export const revalidate = 300;

const baseDescription =
  'Explore scholarship provider profiles with linked scholarships, source status, data completeness, and verification guidance.';
const baseTitle = 'Scholarship Providers';

export async function generateMetadata({
  searchParams
}: {
  searchParams: ProvidersHubSearchParams;
}): Promise<Metadata> {
  const canonicalUrl = getCanonical('/providers');
  const isCanonicalListing = providersHubNationalIsSeoIndexable(searchParams);
  return {
    title: baseTitle,
    description: baseDescription,
    alternates: { canonical: canonicalUrl },
    ...(isCanonicalListing
      ? {}
      : { robots: { index: false, follow: true } }),
    openGraph: {
      title: baseTitle,
      description: baseDescription,
      url: canonicalUrl,
      type: 'website'
    }
  };
}

type PageProps = {
  searchParams: ProvidersHubSearchParams;
};

export default async function ProvidersHubPage({ searchParams }: PageProps) {
  const countryBucket = parseProvidersHubCountryParam(searchParams.country);
  const currentPage = parseProvidersHubPageParam(searchParams.page);
  const q = searchQueryFromParams(searchParams.q);
  let stateFromQuery = parseProvidersHubStateQueryParam(searchParams.state) ?? '';
  if (countryBucket === 'other') {
    stateFromQuery = '';
  }

  if (stateFromQuery) {
    permanentRedirect(
      buildProvidersHubHref({
        q: q ?? undefined,
        state: stateFromQuery,
        country: countryBucket,
        page: currentPage > 1 ? currentPage : undefined
      })
    );
  }

  const qTrim = q?.trim();
  if (qTrim && !qTrim.includes(' ')) {
    const qSlug = qTrim.toLowerCase();
    const code = SEO_ROUTE_STATE_SLUG_TO_CODE[qSlug];
    if (code) {
      permanentRedirect(
        buildProvidersHubHref({
          state: code,
          country: countryBucket,
          page: currentPage > 1 ? currentPage : undefined
        })
      );
    }
  }

  return (
    <ProvidersHubPageContent
      searchParams={searchParams}
      pathStateCode=""
      stateSlug={null}
    />
  );
}
