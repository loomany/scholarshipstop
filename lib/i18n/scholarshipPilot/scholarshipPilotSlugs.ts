import { SCHOLARSHIP_SCALEUP_BATCH_SLUGS } from '@/lib/i18n/scholarshipPilot/scaleUpBatchSlugs';
import { SCHOLARSHIP_SCALEUP_BATCH_V2_SLUGS } from '@/lib/i18n/scholarshipPilot/scaleUpBatchSlugsV2';
import { SCHOLARSHIP_SCALEUP_BATCH_11_SLUGS } from '@/lib/i18n/scholarshipPilot/scaleUpBatch11Slugs';

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

/** Stage 5E-2 / overnight scale-up through batch 5 (56 scholarships). */
export const SCHOLARSHIP_DETAIL_PILOT_SLUGS_V1 = [
  ...SCHOLARSHIP_DETAIL_PILOT_SLUGS_BATCH_1,
  ...SCHOLARSHIP_DETAIL_PILOT_SLUGS_BATCH_2,
  ...SCHOLARSHIP_SCALEUP_BATCH_SLUGS
] as const;

export const SCHOLARSHIP_DETAIL_PILOT_SLUGS = [
  ...SCHOLARSHIP_DETAIL_PILOT_SLUGS_V1,
  ...SCHOLARSHIP_SCALEUP_BATCH_V2_SLUGS,
  ...SCHOLARSHIP_SCALEUP_BATCH_11_SLUGS
] as const;

/** Pilot slug allowlist (string union avoided — 50+ scale-up slugs). */
export type ScholarshipDetailPilotSlug = string;

export const SCHOLARSHIP_DETAIL_PILOT_BATCH_1_MAX_ROWS = 2;
export const SCHOLARSHIP_DETAIL_PILOT_BATCH_2_MAX_ROWS = 10;

const PILOT_SLUG_SET = new Set<string>(SCHOLARSHIP_DETAIL_PILOT_SLUGS);

export function isScholarshipDetailPilotSlug(
  slug: string | null | undefined
): boolean {
  if (!slug) return false;
  return PILOT_SLUG_SET.has(slug.trim().toLowerCase());
}

export type ScholarshipPilotBatchId = '5e-1' | '5e-2' | 'all';

export type ScholarshipScaleupBatchNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

export const SCHOLARSHIP_SCALEUP_BATCH_MAX_ROWS = 20;
export const SCHOLARSHIP_SCALEUP_BATCH_MAX_SLUGS = 10;

export function scholarshipPilotSlugsForBatch(
  batch: ScholarshipPilotBatchId
): readonly string[] {
  if (batch === '5e-1') return SCHOLARSHIP_DETAIL_PILOT_SLUGS_BATCH_1;
  if (batch === '5e-2') return SCHOLARSHIP_DETAIL_PILOT_SLUGS_BATCH_2;
  return SCHOLARSHIP_DETAIL_PILOT_SLUGS;
}

export { scaleupBatchSlugs } from '@/lib/i18n/scholarshipPilot/scaleUpBatchSlugs';
