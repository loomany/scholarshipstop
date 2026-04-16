import type { RelatedScholarshipStored } from '@/lib/content-hub/articleScholarshipMatching/types';

function hasDeadlineText(item: RelatedScholarshipStored): boolean {
  return Boolean(item.deadline_text?.trim());
}

/** Prefer rows with a visible deadline line (catalog-backed). */
export function sortPreferDeadlineFirst(
  items: RelatedScholarshipStored[]
): RelatedScholarshipStored[] {
  return [...items].sort((a, b) => {
    const da = hasDeadlineText(a) ? 1 : 0;
    const db = hasDeadlineText(b) ? 1 : 0;
    if (da !== db) return db - da;
    return 0;
  });
}
