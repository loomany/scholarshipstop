import { US_STATE_CODE_TO_NAME } from '@/lib/constants/usStates';

/** Line above card title: e.g. "CALIFORNIA, USA" or national/unknown. */
export function providerHubRegionLine(state: string | null | undefined): string {
  const code = state?.trim().toUpperCase();
  if (!code || code.length !== 2) return 'NATIONAL';
  const full = US_STATE_CODE_TO_NAME[code];
  if (!full) return 'NATIONAL';
  return `${full.toUpperCase()}, USA`;
}
