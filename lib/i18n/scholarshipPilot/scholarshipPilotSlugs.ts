export const SCHOLARSHIP_DETAIL_PILOT_SLUGS_BATCH_1 = [
  'climate-stripes-scholarship-14487'
] as const;

/** Stage 5E-2 — five additional scholarship detail pilots. */
export const SCHOLARSHIP_DETAIL_PILOT_SLUGS_BATCH_2 = [
  'china-university-of-petroleum-scholarship-1461',
  'creative-arts-scholarship-8932',
  'fintech-innovation-scholarship-8931',
  'healthcare-scholarship-8928',
  'vice-chancellor-s-scholarship-2905'
] as const;

export const SCHOLARSHIP_DETAIL_PILOT_SLUGS = [
  ...SCHOLARSHIP_DETAIL_PILOT_SLUGS_BATCH_1,
  ...SCHOLARSHIP_DETAIL_PILOT_SLUGS_BATCH_2
] as const;

export type ScholarshipDetailPilotSlug =
  (typeof SCHOLARSHIP_DETAIL_PILOT_SLUGS)[number];

export const SCHOLARSHIP_DETAIL_PILOT_BATCH_1_MAX_ROWS = 2;
export const SCHOLARSHIP_DETAIL_PILOT_BATCH_2_MAX_ROWS = 10;

const PILOT_SLUG_SET = new Set<string>(SCHOLARSHIP_DETAIL_PILOT_SLUGS);

export function isScholarshipDetailPilotSlug(
  slug: string | null | undefined
): slug is ScholarshipDetailPilotSlug {
  if (!slug) return false;
  return PILOT_SLUG_SET.has(slug.trim().toLowerCase());
}

export type ScholarshipPilotBatchId = '5e-1' | '5e-2' | 'all';

export function scholarshipPilotSlugsForBatch(
  batch: ScholarshipPilotBatchId
): readonly string[] {
  if (batch === '5e-1') return SCHOLARSHIP_DETAIL_PILOT_SLUGS_BATCH_1;
  if (batch === '5e-2') return SCHOLARSHIP_DETAIL_PILOT_SLUGS_BATCH_2;
  return SCHOLARSHIP_DETAIL_PILOT_SLUGS;
}
