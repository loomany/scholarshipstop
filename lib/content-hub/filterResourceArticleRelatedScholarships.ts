import type { RelatedScholarshipStored } from '@/lib/content-hub/articleScholarshipMatching/types';
import type { ResourceArticleClassification } from '@/lib/content-hub/resourceTaxonomy';
import { scholarshipDeadlineHasPassed } from '@/lib/scholarships/scholarshipDeadlineState';
import type { Scholarship } from '@/app/scholarships/scholarshipsData';

export function shouldShowResourceArticleIqCta(
  classification: ResourceArticleClassification | null
): boolean {
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
