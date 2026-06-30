import type { Metadata } from 'next';

import ScholarshipsSlugPathPageBody from '@/app/scholarships/scholarshipsSlugPathPageBody';
import { buildScholarshipHubRouteMetadata } from '@/app/scholarships/scholarshipHubPageMetadata';
import {
  HUB_PATH_PREFIX,
  hubPathToTab
} from '@/app/scholarships/scholarshipHubPath';
import { normalizeScholarshipDynamicParam } from '@/app/scholarships/scholarshipLongTailPresets';
import { generateScholarshipSlugLayoutMetadata } from '@/app/scholarships/scholarshipSlugLayoutMetadata';
import UniversityHubPageContent from '@/components/scholarships/UniversityHubPageContent';
import {
  buildUniversityHubJsonLdBlocks,
  resolveUniversityHubFaqItems
} from '@/lib/scholarships/universityHubJsonLd';
import { JsonLdScript } from '@/components/seo/JsonLdScript';
import {
  createInitialScholarshipsPayload,
  fetchInitialUniversityHubScholarshipsPayload
} from '@/app/scholarships/scholarshipListServerPayload';
import {
  fetchProviderAiFaqBySlug,
  fetchUniversityHubRow
} from '@/lib/scholarships/universityHubServer';
import { createPublicClient } from '@/utils/supabase/public';
import { scholarshipHubQueryStringFromNextSearchParamsRecord } from '@/app/scholarships/scholarshipHubCanonicalQueryString';
import { getCanonical } from '@/lib/seo/canonical';
import {
  DEFAULT_OPEN_GRAPH_IMAGES,
  DEFAULT_TWITTER_IMAGES
} from '@/lib/seo/socialImage';

export const revalidate = 300;

const SEO_YEAR = 2026;

type PageParams = { state: string; university: string };

function normalizeParams(raw: PageParams): {
  state: string;
  university: string;
} {
  return {
    state: normalizeScholarshipDynamicParam(decodeURIComponent(raw.state)),
    university: normalizeScholarshipDynamicParam(
      decodeURIComponent(raw.university)
    )
  };
}

export async function generateMetadata({
  params,
  searchParams
}: {
  params: PageParams;
  searchParams?: Record<string, string | string[] | undefined>;
}): Promise<Metadata> {
  const { state, university } = normalizeParams(params);
  if (state === HUB_PATH_PREFIX && hubPathToTab([state, university])) {
    return buildScholarshipHubRouteMetadata({
      hubSegment: university,
      searchParams
    });
  }
  const hub = await fetchUniversityHubRow(state, university);

  if (!hub) {
    return generateScholarshipSlugLayoutMetadata({
      slugPath: [state, university]
    });
  }

  const path = `/scholarships/${hub.stateSlug}/${hub.slug}`;
  const canonical = getCanonical(path);
  const title = `Fully Funded Scholarships at ${hub.displayName}, ${hub.stateName} ${SEO_YEAR}`;
  const description = `Find ${hub.scholarshipCount || 'active'} scholarships and grants linked to ${hub.displayName} in ${hub.stateName}. Compare ${SEO_YEAR} deadlines, requirements, and award amounts—then apply on the official provider site.`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'website',
      images: DEFAULT_OPEN_GRAPH_IMAGES
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: DEFAULT_TWITTER_IMAGES
    },
    robots: { index: true, follow: true }
  };
}

export default async function UniversityScholarshipsPage({
  params,
  searchParams
}: {
  params: PageParams;
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const { state, university } = normalizeParams(params);
  if (state === HUB_PATH_PREFIX && hubPathToTab([state, university])) {
    return (
      <ScholarshipsSlugPathPageBody
        segments={[state, university]}
        searchParamsString={scholarshipHubQueryStringFromNextSearchParamsRecord(
          searchParams
        )}
      />
    );
  }
  const hub = await fetchUniversityHubRow(state, university);

  if (!hub) {
    return <ScholarshipsSlugPathPageBody segments={[state, university]} />;
  }

  const supabase = createPublicClient();
  const [{ result: initialListResult, routeScope }, providerFaq] =
    await Promise.all([
      fetchInitialUniversityHubScholarshipsPayload(supabase, hub.slug),
      fetchProviderAiFaqBySlug(hub.slug)
    ]);
  const scholarships = initialListResult.scholarships;
  const initialPayload = createInitialScholarshipsPayload(
    `university-hub:${hub.slug}`,
    initialListResult
  );

  const canonicalPath = `/scholarships/${hub.stateSlug}/${hub.slug}`;
  const pageTitle = `Fully Funded Scholarships at ${hub.displayName}, ${hub.stateName} ${SEO_YEAR}`;
  const pageDescription = `Find ${hub.scholarshipCount || 'active'} scholarships and grants linked to ${hub.displayName} in ${hub.stateName}. Compare ${SEO_YEAR} deadlines, requirements, and award amounts—then apply on the official provider site.`;
  const faqItems = resolveUniversityHubFaqItems({
    universityDisplayName: hub.displayName,
    stateName: hub.stateName,
    scholarships,
    providerFaq
  });
  const jsonLdBlocks = buildUniversityHubJsonLdBlocks({
    pageTitle,
    pageDescription,
    canonicalPath,
    stateLabel: hub.stateName,
    stateSlug: hub.stateSlug,
    universityName: hub.displayName,
    universitySlug: hub.slug,
    scholarships,
    faqItems
  });

  return (
    <>
      <JsonLdScript data={jsonLdBlocks} />
      <UniversityHubPageContent
        hub={hub}
        initialPayload={initialPayload}
        routeScope={routeScope}
        faqItems={faqItems}
      />
    </>
  );
}
