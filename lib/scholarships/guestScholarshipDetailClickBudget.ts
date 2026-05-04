import { getScopedScholarshipStorageKey } from '@/app/scholarships/userScopedStorage';

/** Guests never get free navigations from this counter — the wall opens on first grant click. */
const GUEST_FREE_DETAIL_NAVIGATIONS = 0;

/** Signed-in users without subscription: scholarship detail previews before subscription wall. */
export const AUTH_NO_SUB_FREE_DETAIL_VIEWS = 10;

const GUEST_STORAGE_KEY = 'scholarshipGuestDetailFreeClicksUsed';

/** Separate from guest key so counts never mix. */
const AUTH_NO_SUBSCRIPTION_STORAGE_BASE = 'scholarshipAuthNoSubDetailViewsUsed';

export type ScholarshipDetailClickBudgetMode =
  | 'guest'
  | 'signed-in-no-subscription';

function storageKeyForMode(mode: ScholarshipDetailClickBudgetMode): string {
  return mode === 'guest'
    ? GUEST_STORAGE_KEY
    : getScopedScholarshipStorageKey(AUTH_NO_SUBSCRIPTION_STORAGE_BASE);
}

function freeNavigationsForMode(
  mode: ScholarshipDetailClickBudgetMode
): number {
  return mode === 'signed-in-no-subscription'
    ? AUTH_NO_SUB_FREE_DETAIL_VIEWS
    : GUEST_FREE_DETAIL_NAVIGATIONS;
}

export function resolveScholarshipDetailClickBudgetMode(options: {
  isAuthenticated: boolean;
  hasSubscription: boolean;
  /**
   * When `false`, subscription/session is still loading on the client — avoid
   * treating a signed-in user as `guest` (0 free detail opens).
   */
  authResolved?: boolean;
}): ScholarshipDetailClickBudgetMode | null {
  if (options.authResolved === false) return null;
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
  const cap = freeNavigationsForMode(mode);
  const next = getScholarshipDetailFreeClicksUsed(mode) + 1;
  localStorage.setItem(storageKeyForMode(mode), String(Math.min(next, cap)));
}

/** Remaining detail opens for signed-in users without subscription (0 once blocked). */
export function getAuthNoSubScholarshipDetailViewsRemaining(): number {
  const used = getScholarshipDetailFreeClicksUsed('signed-in-no-subscription');
  return Math.max(0, AUTH_NO_SUB_FREE_DETAIL_VIEWS - used);
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
