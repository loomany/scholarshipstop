/**
 * Stage 4D.1 — Curated CMS resource pilot slugs (from audit inventory 2026-05-21).
 * Do not auto-expand; changes require audit + smoke update.
 */
export const RESOURCE_PILOT_SLUGS = [
  'avoid-scholarship-scams-targeting-families',
  'types-of-scholarships-usa-explained',
  'how-to-write-a-winning-scholarship-essay',
  'how-to-proofread-scholarship-essay',
  'how-to-write-a-thank-you-letter-after-winning-a-scholarship',
  'how-to-get-recommendation-letters-for-scholarships',
  'four-year-scholarship-plan-college',
  'track-scholarship-deadlines-usa',
  'best-scholarship-tracker-templates-students',
  'verify-scholarship-emails-usa',
  'trustworthy-scholarship-review-online',
  'scholarship-faq-low-gpa-students',
  'scholarship-faq-comparing-multiple-offers',
  'scholarship-faq-no-recommendation-letters',
  'scholarship-faq-applying-late',
  'organize-scholarship-applications-by-difficulty',
  'organize-scholarship-applications-notion',
  'how-to-track-scholarships-international-students',
  'how-to-find-scholarships-for-international-students',
  'how-to-write-scholarship-essay-as-international-student',
  'how-to-get-full-scholarship-usa',
  'graduate-scholarship-application-checklist',
  'verify-scholarship-eligibility-usa',
  'scholarship-faq-school-students-applying-early',
  'scholarship-faq-parents-worried-scams'
] as const;

export type ResourcePilotSlug = (typeof RESOURCE_PILOT_SLUGS)[number];

const PILOT_SET = new Set<string>(RESOURCE_PILOT_SLUGS);

export function isResourcePilotSlug(slug: string | null | undefined): slug is ResourcePilotSlug {
  if (!slug?.trim()) return false;
  return PILOT_SET.has(slug.trim().toLowerCase());
}
