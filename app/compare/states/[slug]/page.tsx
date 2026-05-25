import type { Metadata } from 'next';

import { StateCompareDetailPageBody } from '@/app/compare/states/stateCompareDetailPageBody';
import { resolveAiMetaDescription } from '@/lib/seo/aiMetaDescriptionService';
import {
  fetchPublishedStateComparePageBySlug,
  stateContentJsonAsRecord
} from '@/lib/seo/stateCompareServer';
import { getCanonical } from '@/lib/seo/canonical';
import {
  getCompareSeoQualityPolicy,
  MIN_DYNAMIC_COMPARE_VISIBLE_WORDS
} from '@/lib/seo/compareSeoQualityPolicy';
import { countVisibleWords } from '@/lib/seo/visibleText';

const COMPARE_YEAR = 2026;
export const revalidate = 300;

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const row = await fetchPublishedStateComparePageBySlug(slug.trim().toLowerCase());
  const path = `/compare/states/${encodeURIComponent(slug.trim().toLowerCase())}`;
  const canonical = getCanonical(path);
  if (!row) {
    return {
      title: 'State vs State',
      robots: { index: false, follow: false }
    };
  }
  const title =
    row.page.meta_title?.trim() ||
    `${row.stateA.name} vs ${row.stateB.name}: Scholarship Climate ${COMPARE_YEAR}`;
  const fallbackDescription =
    row.page.meta_description?.trim() ||
    `Compare scholarship climate, grant volume, and top universities in ${row.stateA.name} and ${row.stateB.name}.`;
  const description =
    (await resolveAiMetaDescription({
      canonicalPath: path,
      routeKind: 'compare_state',
      title,
      fallbackDescription,
      context: {
        slug: slug.trim().toLowerCase(),
        stateA: row.stateA.name,
        stateB: row.stateB.name
      },
      priority: 6
    })) ?? fallbackDescription;
  const content = stateContentJsonAsRecord(row.page.content_json);
  const faq = content['faq'];
  const quality = getCompareSeoQualityPolicy({
    stablePublicRoute: true,
    hasQueryParams: false,
    hasSearchIntent: true,
    hasUniqueComparisonTable: true,
    hasVisibleFaq: Array.isArray(faq) && faq.length > 0,
    hasRelatedInternalLinks: true,
    meaningfulFactCount: Object.keys(content).length,
    visibleWordCount: countVisibleWords(
      title,
      description,
      row.page.ai_verdict,
      content
    ),
    minimumVisibleWords: MIN_DYNAMIC_COMPARE_VISIBLE_WORDS
  });
  return {
    title,
    description,
    alternates: { canonical },
    robots: quality.indexable
      ? { index: true, follow: true }
      : { index: false, follow: true },
    openGraph: { title, description, url: canonical }
  };
}

export default async function StateComparePage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: raw } = await params;
  return StateCompareDetailPageBody({ slug: raw, locale: 'en' });
}
