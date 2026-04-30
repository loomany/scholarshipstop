import type { RelatedScholarshipStored } from '@/lib/content-hub/articleScholarshipMatching/types';
import { compareScholarshipsByDeadlineState } from '@/lib/scholarships/scholarshipDeadlineState';

function hasDeadlineText(item: RelatedScholarshipStored): boolean {
  return Boolean(item.deadline_text?.trim());
}

/** Contextual related blocks keep all rows, but stale deadlines should not lead. */
export function sortPreferDeadlineFirst(
  items: RelatedScholarshipStored[]
): RelatedScholarshipStored[] {
  return [...items].sort((a, b) => {
    const deadlineStateOrder = compareScholarshipsByDeadlineState(
      { deadline_text: a.deadline_text },
      { deadline_text: b.deadline_text }
    );
    if (deadlineStateOrder !== 0) return deadlineStateOrder;
    const da = hasDeadlineText(a) ? 1 : 0;
    const db = hasDeadlineText(b) ? 1 : 0;
    if (da !== db) return db - da;
    return 0;
  });
}
