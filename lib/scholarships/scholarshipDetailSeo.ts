import { breadcrumbCategoryLabel } from '@/app/scholarships/scholarshipCategories';
import {
  getScholarshipDeadlineDisplayParts,
  resolveScholarshipCardAwardDisplay,
  scholarshipPublicPath,
  type Scholarship
} from '@/app/scholarships/scholarshipsData';
import {
  buildBreadcrumbListJsonLd,
  buildFaqPageJsonLd,
  buildWebPageJsonLd,
  type JsonLdBreadcrumbItem
} from '@/lib/seo/jsonLd';
import { buildScholarshipDetailSeoTitle } from '@/lib/seo/scholarshipDetailSeoTitle';
import {
  getHeroSummary,
  getUsefulFaqForOnPageDisplay
} from '@/lib/scholarships/scholarshipUiModel';
import { resolveScholarshipCategorySlug } from '@/lib/scholarships/similarScholarships';

function trimMetaDescription(value: string): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length > 160
    ? `${normalized.slice(0, 157).trimEnd()}...`
    : normalized;
}

export function buildScholarshipDetailMetaDescription(s: Scholarship): string {
  const seo = s.seoExcerpt?.trim();
  if (seo && seo.length >= 40) return trimMetaDescription(seo);

  const fromShort = s.summaryShort?.trim();
  if (fromShort && fromShort.length >= 40) {
    return trimMetaDescription(fromShort);
  }

  const title = s.title?.trim() || 'This scholarship';
  const award = (s.amount || s.awardAmount)?.trim();
  const provider = s.provider?.trim();
  const deadline = s.deadline?.trim();
  const parts = [
    provider ? `${provider} details` : `${title} details`,
    award ? `award ${award}` : null,
    deadline && deadline !== 'вЂ”' && deadline !== '-'
      ? `deadline ${deadline}`
      : null,
    'eligibility, documents, and provider application path'
  ].filter(Boolean);

  return trimMetaDescription(`${title}: ${parts.join(', ')}.`);
}

function scholarshipDetailBreadcrumbs(s: Scholarship): JsonLdBreadcrumbItem[] {
  const path = scholarshipPublicPath(s);
  const categorySlug = resolveScholarshipCategorySlug(s);
  const breadcrumbs: JsonLdBreadcrumbItem[] = [
    { name: 'Home', path: '/' },
    { name: 'Scholarships', path: '/scholarships' }
  ];

  if (categorySlug) {
    breadcrumbs.push({
      name: breadcrumbCategoryLabel(categorySlug),
      path: `/scholarships/category/${categorySlug}`
    });
  }

  breadcrumbs.push({ name: s.title?.trim() || 'Scholarship', path });
  return breadcrumbs;
}

export function buildScholarshipDetailJsonLd(
  scholarship: Scholarship
): Array<Record<string, unknown> | null> {
  const path = scholarshipPublicPath(scholarship);
  const title = buildScholarshipDetailSeoTitle(scholarship);
  const description = buildScholarshipDetailMetaDescription(scholarship);
  const { primary: deadlinePrimary } =
    getScholarshipDeadlineDisplayParts(scholarship);
  const awardLine = resolveScholarshipCardAwardDisplay(scholarship).line;
  const faqItems = getUsefulFaqForOnPageDisplay(scholarship, {
    heroSummary: getHeroSummary(scholarship),
    awardLine,
    deadlinePrimary
  });

  return [
    buildBreadcrumbListJsonLd(scholarshipDetailBreadcrumbs(scholarship)),
    buildWebPageJsonLd({
      name: title,
      url: path,
      description,
      dateModified:
        scholarship.lastVerifiedAt ||
        scholarship.updatedAt ||
        scholarship.createdAt ||
        null
    }),
    buildFaqPageJsonLd(faqItems, path)
  ];
}
