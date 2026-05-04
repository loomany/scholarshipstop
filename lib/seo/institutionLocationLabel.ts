import { US_STATE_CODE_TO_NAME } from '@/lib/constants/usStates';

function resolveInstitutionRegionLabel(
  stateRaw: string | null | undefined
): string | null {
  const trimmed = stateRaw?.trim();
  if (!trimmed) return null;
  const upper = trimmed.toUpperCase();
  if (upper.length === 2 && US_STATE_CODE_TO_NAME[upper]) {
    return US_STATE_CODE_TO_NAME[upper];
  }
  return trimmed;
}

/**
 * State / province label for compare card header row (e.g. "Texas").
 *
 * @returns `null` when unknown — omit the right side.
 */
export function formatInstitutionStateLabel(inst: {
  state?: string | null;
}): string | null {
  return resolveInstitutionRegionLabel(inst.state);
}

/**
 * One-line campus / mailing location for compare cards and headings.
 * Uses a US state code → full name map when `state` is a two-letter code.
 *
 * @returns `null` when nothing useful is present — omit the location column.
 */
export function formatInstitutionLocationLine(inst: {
  city?: string | null;
  state?: string | null;
  country?: string | null;
}): string | null {
  const city = inst.city?.trim() || null;
  const region = resolveInstitutionRegionLabel(inst.state);
  const country = inst.country?.trim() || null;

  const parts: string[] = [];
  if (city) parts.push(city);
  if (region) parts.push(region);
  if (country) parts.push(country);

  if (parts.length === 0) return null;
  return parts.join(', ');
}
