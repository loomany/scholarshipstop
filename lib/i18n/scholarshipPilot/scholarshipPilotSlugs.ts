export const SCHOLARSHIP_DETAIL_PILOT_SLUGS = [
  'climate-stripes-scholarship-14487'
] as const;

export type ScholarshipDetailPilotSlug =
  (typeof SCHOLARSHIP_DETAIL_PILOT_SLUGS)[number];

export const SCHOLARSHIP_DETAIL_PILOT_STAGE_MAX_ROWS = 2;

const PILOT_SLUG_SET = new Set<string>(SCHOLARSHIP_DETAIL_PILOT_SLUGS);

export function isScholarshipDetailPilotSlug(
  slug: string | null | undefined
): slug is ScholarshipDetailPilotSlug {
  if (!slug) return false;
  return PILOT_SLUG_SET.has(slug.trim().toLowerCase());
}
