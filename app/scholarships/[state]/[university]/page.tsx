import type { Metadata } from 'next';

import ScholarshipsSlugPathPageBody from '@/app/scholarships/scholarshipsSlugPathPageBody';
import { normalizeScholarshipDynamicParam } from '@/app/scholarships/scholarshipLongTailPresets';
import { generateScholarshipSlugLayoutMetadata } from '@/app/scholarships/scholarshipSlugLayoutMetadata';
import UniversityHubPageContent from '@/components/scholarships/UniversityHubPageContent';
import {
  buildUniversityHubFaqJsonLd,
  resolveUniversityHubFaqItems
} from '@/lib/scholarships/universityHubJsonLd';
import {
  fetchProviderAiFaqBySlug,
  fetchScholarshipsForUniversitySlug,
  fetchUniversityHubRow
} from '@/lib/scholarships/universityHubServer';
import { getURL } from '@/utils/helpers';

export const revalidate = 300;

const SEO_YEAR = 2026;

type PageParams = { state: string; university: string };

function normalizeParams(raw: PageParams): { state: string; university: string } {
  return {
    state: normalizeScholarshipDynamicParam(decodeURIComponent(raw.state)),
    university: normalizeScholarshipDynamicParam(decodeURIComponent(raw.university))
  };
}

export async function generateMetadata({
  params
}: {
  params: PageParams;
}): Promise<Metadata> {
  const { state, university } = normalizeParams(params);
  const hub = await fetchUniversityHubRow(state, university);

  if (!hub) {
    return generateScholarshipSlugLayoutMetadata({
      slugPath: [state, university]
    });
  }

  const path = `/scholarships/${hub.stateSlug}/${hub.slug}`;
  const title = `Fully Funded Scholarships at ${hub.displayName}, ${hub.stateName} ${SEO_YEAR}`;
  const description = `Find ${hub.scholarshipCount || 'active'} scholarships and grants linked to ${hub.displayName} in ${hub.stateName}. Compare ${SEO_YEAR} deadlines, requirements, and award amounts—then apply on the official provider site.`;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      type: 'website'
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description
    },
    robots: { index: true, follow: true }
  };
}

export default async function UniversityScholarshipsPage({
  params
}: {
  params: PageParams;
}) {
  const { state, university } = normalizeParams(params);
  const hub = await fetchUniversityHubRow(state, university);

  if (!hub) {
    return (
      <ScholarshipsSlugPathPageBody segments={[state, university]} />
    );
  }

  const [{ scholarships, error }, providerFaq] = await Promise.all([
    fetchScholarshipsForUniversitySlug(hub.slug),
    fetchProviderAiFaqBySlug(hub.slug)
  ]);

  const canonicalPath = `/scholarships/${hub.stateSlug}/${hub.slug}`;
  const faqItems = resolveUniversityHubFaqItems({
    universityDisplayName: hub.displayName,
    stateName: hub.stateName,
    scholarships,
    providerFaq
  });
  const jsonLd = buildUniversityHubFaqJsonLd(
    faqItems,
    getURL(canonicalPath.replace(/^\//, ''))
  );

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <UniversityHubPageContent
        hub={hub}
        scholarships={scholarships}
        loadError={error}
        faqItems={faqItems}
      />
    </>
  );
}
