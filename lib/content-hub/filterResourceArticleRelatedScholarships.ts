import type { RelatedScholarshipStored } from '@/lib/content-hub/articleScholarshipMatching/types';
import { isAiResourcePackSlug } from '@/lib/content-hub/aiResourcePackSlugs';
import type { ResourceArticleClassification } from '@/lib/content-hub/resourceTaxonomy';
import { isIqSitePromoVisible } from '@/lib/iq/iqSitePromoVisibility';
import { scholarshipDeadlineHasPassed } from '@/lib/scholarships/scholarshipDeadlineState';
import type { Scholarship } from '@/app/scholarships/scholarshipsData';

export function shouldShowResourceArticleIqCta(
  classification: ResourceArticleClassification | null,
  slug?: string | null
): boolean {
  if (!isIqSitePromoVisible()) return false;
  if (isAiResourcePackSlug(slug)) return false;
  return classification?.categoryId !== 'ai';
}

export function filterActiveRelatedScholarshipItems(
  items: RelatedScholarshipStored[]
): RelatedScholarshipStored[] {
  return items.filter(
    (item) => !scholarshipDeadlineHasPassed({ deadline_text: item.deadline_text })
  );
}

export function filterActiveHubScholarships(
  scholarships: Scholarship[]
): Scholarship[] {
  return scholarships.filter((s) => !scholarshipDeadlineHasPassed(s));
}
