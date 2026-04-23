import type { Scholarship } from '@/app/scholarships/scholarshipsData';
import { getScholarshipCatalog } from '@/lib/scholarships/scholarshipCatalog';

const INTERNATIONAL_FRIENDLY_CITIZENSHIP_RE =
  /international|f-1|f1|foreign|non.u\.s|non-us|global student|visa holder|outside the u\.s/i;

const INTERNATIONAL_FRIENDLY_TEXT_RE =
  /international student|foreign student|f-1|f1 visa|foreign national|students outside|non-u\.s\. citizen|non us citizen|eligible.*international/i;

/**
 * Keep card/detail subscription locks aligned with the broad “International Friendly”
 * audience filter. This is best-effort, not legal/visa advice.
 */
export function isInternationalFriendlyScholarship(s: Scholarship): boolean {
  const cat = getScholarshipCatalog(s);
  if (cat.eligibilityIds.includes('international_students')) return true;

  const cit = (s.citizenshipStatuses ?? [])
    .map((x) => String(x).toLowerCase())
    .join(' ');
  if (INTERNATIONAL_FRIENDLY_CITIZENSHIP_RE.test(cit)) return true;

  const blob = [
    s.title,
    s.description,
    s.summaryShort,
    s.whoCanApplyText,
    s.eligibilityText,
    s.requirementsTextClean
  ]
    .filter(Boolean)
    .join('\n')
    .toLowerCase();

  return INTERNATIONAL_FRIENDLY_TEXT_RE.test(blob);
}
