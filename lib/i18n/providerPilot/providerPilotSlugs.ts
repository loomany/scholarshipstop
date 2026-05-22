/** Stage 5D-2 pilot — exactly 3 providers (6 translation rows). */
export const PROVIDER_PILOT_SLUGS = [
  'loyola-university-chicago',
  'harvard-university',
  'university-of-michigan'
] as const;

export type ProviderPilotSlug = (typeof PROVIDER_PILOT_SLUGS)[number];

export const PROVIDER_PILOT_STAGE_MAX_ROWS = 6;

export function isProviderPilotSlug(value: string): value is ProviderPilotSlug {
  return (PROVIDER_PILOT_SLUGS as readonly string[]).includes(value);
}
