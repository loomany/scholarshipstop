import type { MoreFiltersJson } from '@/lib/scholarships/scholarshipListApiCodec';
import { moreFiltersFromJson, moreFiltersToJson } from '@/lib/scholarships/scholarshipListApiCodec';
import type { MoreFiltersState } from '@/app/scholarships/moreFilters';

export const SAVED_FILTERS_STORAGE_KEY = 'scholarshiptop_saved_filters_v1';

export function readSavedFiltersFromStorage(
  bounds: {
    amountMin: number;
    amountMax: number;
    applicantsMin: number;
    applicantsMax: number;
  }
): MoreFiltersState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SAVED_FILTERS_STORAGE_KEY);
    if (!raw?.trim()) return null;
    const parsed = JSON.parse(raw) as MoreFiltersJson;
    return moreFiltersFromJson(parsed, bounds);
  } catch {
    return null;
  }
}

export function writeSavedFiltersToStorage(state: MoreFiltersState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      SAVED_FILTERS_STORAGE_KEY,
      JSON.stringify(moreFiltersToJson(state))
    );
  } catch {
    // ignore quota / private mode
  }
}

export function clearSavedFiltersFromStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(SAVED_FILTERS_STORAGE_KEY);
  } catch {
    // ignore
  }
}
