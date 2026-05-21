import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import ScholarshipsSlugPathPageBody from '@/app/scholarships/scholarshipsSlugPathPageBody';
import { getScholarshipDetailServer } from '@/lib/scholarships/scholarshipDetailServer';
import { resolveScholarshipSlugPath } from '@/lib/scholarships/seoScholarshipResolve';
import { gateLocalizedScholarshipDetailOrNotFound } from '@/lib/i18n/localizedScholarshipDetailGate';
import { hubPathToTab } from '@/app/scholarships/scholarshipHubPath';
import { buildScholarshipHubRouteMetadata } from '@/app/scholarships/scholarshipHubPageMetadata';
import { normalizeScholarshipDynamicParam } from '@/app/scholarships/scholarshipLongTailPresets';
import { scholarshipHubQueryStringFromNextSearchParamsRecord } from '@/app/scholarships/scholarshipHubCanonicalQueryString';
import { isSeoNoiseQuery } from '@/app/scholarships/scholarshipSeoNoiseQuery';
import { buildLocalizedAlternates } from '@/lib/i18n/alternates';
import { hrefForLocalizedUiRequired } from '@/lib/i18n/localizedHref';
import {
  isStage2PilotLocale,
  STAGE2_PILOT_LOCALES,
  type Stage2PilotLocale
} from '@/lib/i18n/pilotRoutes';
import type { SupportedLocale } from '@/lib/i18n/types';
import { getScholarshipsHubUiCopy } from '@/lib/i18n/scholarshipsHubUiCopy';
import { getLocalizedCanonical } from '@/lib/seo/canonical';

export const revalidate = 300;

type PageProps = {
  params: { locale: string; slugPath?: string[] };
  searchParams?: Record<string, string | string[] | undefined>;
};

const SCHOLARSHIPS_ROOT_DESCRIPTION =
  'Browse the ScholarshipTop catalog to find scholarships by deadline, award amount, eligibility, field of study, GPA, and student background.';

export async function generateMetadata({
  params,
  searchParams
}: PageProps): Promise<Metadata> {
  if (!isStage2PilotLocale(params.locale)) {
    return { title: 'Page not found', robots: { index: false, follow: false } };
  }
  const locale = params.locale as Stage2PilotLocale;
  const segments = (params.slugPath ?? []).map((s) =>
    normalizeScholarshipDynamicParam(decodeURIComponent(s))
  );
  const localizedRoot = hrefForLocalizedUiRequired(locale, '/scholarships');

  if (hubPathToTab(segments)) {
    const meta = await buildScholarshipHubRouteMetadata({
      hubSegment: segments[1]!,
      searchParams
    });
    return {
      ...meta,
      alternates: {
        canonical: `${localizedRoot}/hub/${encodeURIComponent(segments[1]!)}`
      }
    };
  }

  const hasNonCanonicalQuery = isSeoNoiseQuery(searchParams);
  if (segments.length > 0 && !hubPathToTab(segments)) {
    const resolved = resolveScholarshipSlugPath(segments);
    if (resolved.kind === 'scholarship_detail' && segments.length === 1) {
      const scholarship = await getScholarshipDetailServer(segments[0]!);
      if (!scholarship) {
        return { title: 'Page not found', robots: { index: false, follow: false } };
      }
      await gateLocalizedScholarshipDetailOrNotFound(locale, scholarship.id);
    }
    return {
      robots: hasNonCanonicalQuery
        ? { index: false, follow: true }
        : { index: false, follow: true }
    };
  }

  const ui = getScholarshipsHubUiCopy(locale);
  const alternates = buildLocalizedAlternates({
    canonicalPath: '/scholarships',
    currentLocale: locale,
    availableLocales: ['en', ...STAGE2_PILOT_LOCALES] as SupportedLocale[],
    defaultUrl: getLocalizedCanonical('/scholarships', 'en')
  });
  return {
    title: ui.defaultPageTitle,
    description: SCHOLARSHIPS_ROOT_DESCRIPTION,
    alternates,
    robots: hasNonCanonicalQuery
      ? { index: false, follow: true }
      : { index: true, follow: true }
  };
}

export default function LocalizedScholarshipsCatchAllPage({
  params,
  searchParams
}: PageProps) {
  if (!isStage2PilotLocale(params.locale)) notFound();
  const locale = params.locale as Stage2PilotLocale;
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
      locale={locale}
    />
  );
}
