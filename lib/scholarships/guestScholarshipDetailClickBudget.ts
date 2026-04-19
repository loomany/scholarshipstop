import { getScopedScholarshipStorageKey } from '@/app/scholarships/userScopedStorage';

/** Number of free navigations to scholarship detail before the registration modal (3rd click opens it). */
const FREE_DETAIL_NAVIGATIONS = 2;
const AUTH_NO_SUBSCRIPTION_FREE_DETAIL_NAVIGATIONS = 10;

const GUEST_STORAGE_KEY = 'scholarshipGuestDetailFreeClicksUsed';
const AUTH_NO_SUBSCRIPTION_STORAGE_KEY =
  'scholarshipAuthNoSubscriptionDetailFreeClicksUsed';

export type ScholarshipDetailClickBudgetMode =
  | 'guest'
  | 'signed-in-no-subscription';

function storageKeyForMode(mode: ScholarshipDetailClickBudgetMode): string {
  return mode === 'guest'
    ? GUEST_STORAGE_KEY
    : getScopedScholarshipStorageKey(AUTH_NO_SUBSCRIPTION_STORAGE_KEY);
}

function freeNavigationsForMode(mode: ScholarshipDetailClickBudgetMode): number {
  return mode === 'guest'
    ? FREE_DETAIL_NAVIGATIONS
    : AUTH_NO_SUBSCRIPTION_FREE_DETAIL_NAVIGATIONS;
}

export function resolveScholarshipDetailClickBudgetMode(options: {
  isAuthenticated: boolean;
  hasSubscription: boolean;
}): ScholarshipDetailClickBudgetMode | null {
  if (!options.isAuthenticated) return 'guest';
  if (!options.hasSubscription) return 'signed-in-no-subscription';
  return null;
}

export function getScholarshipDetailFreeClicksUsed(
  mode: ScholarshipDetailClickBudgetMode
): number {
  if (typeof window === 'undefined') return 0;
  const raw = localStorage.getItem(storageKeyForMode(mode));
  const n = parseInt(raw ?? '0', 10);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, freeNavigationsForMode(mode));
}

export function shouldBlockScholarshipDetailNavigation(
  mode: ScholarshipDetailClickBudgetMode
): boolean {
  return getScholarshipDetailFreeClicksUsed(mode) >= freeNavigationsForMode(mode);
}

export function recordScholarshipDetailFreeNavigation(
  mode: ScholarshipDetailClickBudgetMode
): void {
  const next = getScholarshipDetailFreeClicksUsed(mode) + 1;
  localStorage.setItem(
    storageKeyForMode(mode),
    String(Math.min(next, freeNavigationsForMode(mode)))
  );
}

export function getGuestScholarshipDetailFreeClicksUsed(): number {
  return getScholarshipDetailFreeClicksUsed('guest');
}

/** True when the next primary click on a catalog card should open the registration wall instead of navigating. */
export function shouldBlockGuestScholarshipDetailNavigation(): boolean {
  return shouldBlockScholarshipDetailNavigation('guest');
}

/** Call when allowing a guest to follow the detail link (increments toward the wall). */
export function recordGuestScholarshipDetailFreeNavigation(): void {
  recordScholarshipDetailFreeNavigation('guest');
}
