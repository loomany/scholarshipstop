import { US_STATE_CODE_TO_NAME } from '@/lib/constants/usStates';

const DEFAULT_US_COUNTRY_LABEL = 'United States';

/**
 * Provider HQ line from US state code (`providers.state`).
 * Returns "Country, State" (e.g. "United States, Illinois"). If only a standalone
 * country were stored elsewhere, pass it here in the future; today the DB only
 * has US state codes or null.
 *
 * @returns `null` when unknown — omit the location row instead of placeholders.
 */
export function formatProviderHqLocationLine(
  usStateCode: string | null | undefined
): string | null {
  const code = usStateCode?.trim().toUpperCase();
  if (!code || code.length !== 2) return null;
  const stateName = US_STATE_CODE_TO_NAME[code];
  if (!stateName) return null;
  return `${DEFAULT_US_COUNTRY_LABEL}, ${stateName}`;
}
