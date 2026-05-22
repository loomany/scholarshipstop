export const PROVIDER_PILOT_SLUGS_BATCH_1 = [
  'loyola-university-chicago',
  'harvard-university',
  'university-of-michigan'
] as const;

export const PROVIDER_PILOT_SLUGS_BATCH_2 = [
  'princeton-university',
  'columbia-university'
] as const;

export const PROVIDER_PILOT_SLUGS = [
  ...PROVIDER_PILOT_SLUGS_BATCH_1,
  ...PROVIDER_PILOT_SLUGS_BATCH_2
] as const;

export type ProviderPilotSlug = (typeof PROVIDER_PILOT_SLUGS)[number];

export const PROVIDER_PILOT_BATCH_1_MAX_ROWS = 6;
export const PROVIDER_PILOT_BATCH_2_MAX_ROWS = 4;

const PILOT_SET = new Set<string>(PROVIDER_PILOT_SLUGS);

export function isProviderPilotSlug(value: string): value is ProviderPilotSlug {
  return PILOT_SET.has(value.trim().toLowerCase());
}

export type ProviderPilotBatchId = '5d-1' | '5d-2' | 'all';

export function providerPilotSlugsForBatch(batch: ProviderPilotBatchId): readonly string[] {
  if (batch === '5d-2') return PROVIDER_PILOT_SLUGS_BATCH_2;
  if (batch === 'all') return PROVIDER_PILOT_SLUGS;
  return PROVIDER_PILOT_SLUGS_BATCH_1;
}
