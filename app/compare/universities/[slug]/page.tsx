import type { Metadata } from 'next';

import { UniversityCompareDetailPageBody } from '@/app/compare/universities/universityCompareDetailPageBody';
import { resolveAiMetaDescription } from '@/lib/seo/aiMetaDescriptionService';
import {
  contentJsonAsRecord,
  fetchPublishedComparePageBySlug
} from '@/lib/seo/universityCompareServer';
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
  const row = await fetchPublishedComparePageBySlug(slug.trim().toLowerCase());
  const path = `/compare/universities/${encodeURIComponent(slug.trim().toLowerCase())}`;
  const canonical = getCanonical(path);
  if (!row) {
    return {
      title: 'University vs University',
      robots: { index: false, follow: false }
    };
  }
  const title =
    row.page.meta_title?.trim() ||
    `${row.instA.name} vs ${row.instB.name}: Scholarship Comparison ${COMPARE_YEAR}`;
  const fallbackDescription =
    row.page.meta_description?.trim() ||
    `Compare scholarships and aid signals for ${row.instA.name} and ${row.instB.name}.`;
  const description =
    (await resolveAiMetaDescription({
      canonicalPath: path,
      routeKind: 'compare_university',
      title,
      fallbackDescription,
      context: {
        slug: slug.trim().toLowerCase(),
        institutionA: row.instA.name,
        institutionB: row.instB.name
      },
      priority: 6
    })) ?? fallbackDescription;
  const content = contentJsonAsRecord(row.page.content_json);
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

export default async function UniversityComparePage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: raw } = await params;
  return UniversityCompareDetailPageBody({ slug: raw, locale: 'en' });
}
