import { getScopedScholarshipStorageKey } from '@/app/scholarships/userScopedStorage';

/**
 * @deprecated Guests no longer have a detail-view budget (unlimited catalog detail reads).
 * Kept for any leftover imports / storage keys; not applied by `resolveScholarshipDetailClickBudgetMode`.
 */
export const GUEST_FREE_DETAIL_VIEWS = Number.POSITIVE_INFINITY;

const GUEST_FREE_DETAIL_NAVIGATIONS = Number.POSITIVE_INFINITY;

/** Signed-in users without subscription: scholarship detail previews before subscription wall. */
export const AUTH_NO_SUB_FREE_DETAIL_VIEWS = 10;

const GUEST_STORAGE_KEY = 'scholarshipGuestDetailFreeClicksUsed';

/** Separate from guest key so counts never mix. */
const AUTH_NO_SUBSCRIPTION_STORAGE_BASE = 'scholarshipAuthNoSubDetailViewsUsed';

/**
 * Scholarship ids that already consumed a budgeted detail view — used so we do not show the
 * quota modal on refresh/revisit of an allowed grant when `used >= cap`.
 */
const GUEST_DETAIL_COUNTED_IDS_KEY = 'scholarshipGuestDetailCountedIds';

const AUTH_NO_SUB_DETAIL_COUNTED_IDS_BASE =
  'scholarshipAuthNoSubDetailCountedIds';

function parseScholarshipIdSetJson(raw: string | null): Set<string> {
  if (!raw) return new Set();
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(
      parsed.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).map((x) => x.trim())
    );
  } catch {
    return new Set();
  }
}

function persistScholarshipIdSet(key: string, ids: Set<string>): void {
  const trimmed = [...ids].slice(-120);
  localStorage.setItem(key, JSON.stringify(trimmed));
}

/** Call after incrementing the guest detail budget for this scholarship id. */
export function rememberGuestScholarshipDetailCountedId(id: string): void {
  if (typeof window === 'undefined') return;
  const slug = id.trim();
  if (!slug) return;
  const next = parseScholarshipIdSetJson(
    localStorage.getItem(GUEST_DETAIL_COUNTED_IDS_KEY)
  );
  next.add(slug);
  persistScholarshipIdSet(GUEST_DETAIL_COUNTED_IDS_KEY, next);
}

export function hasGuestSeenScholarshipDetailUnderBudget(id: string): boolean {
  if (typeof window === 'undefined') return false;
  const slug = id.trim();
  if (!slug) return false;
  return parseScholarshipIdSetJson(
    localStorage.getItem(GUEST_DETAIL_COUNTED_IDS_KEY)
  ).has(slug);
}

/** Call after incrementing the signed-in–no-sub detail budget for this scholarship id. */
export function rememberAuthNoSubScholarshipDetailCountedId(id: string): void {
  if (typeof window === 'undefined') return;
  const slug = id.trim();
  if (!slug) return;
  const key = getScopedScholarshipStorageKey(AUTH_NO_SUB_DETAIL_COUNTED_IDS_BASE);
  const next = parseScholarshipIdSetJson(localStorage.getItem(key));
  next.add(slug);
  persistScholarshipIdSet(key, next);
}

export function hasAuthNoSubSeenScholarshipDetailUnderBudget(
  id: string
): boolean {
  if (typeof window === 'undefined') return false;
  const slug = id.trim();
  if (!slug) return false;
  const key = getScopedScholarshipStorageKey(AUTH_NO_SUB_DETAIL_COUNTED_IDS_BASE);
  return parseScholarshipIdSetJson(localStorage.getItem(key)).has(slug);
}

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
   * treating a signed-in user as `guest`.
   */
  authResolved?: boolean;
}): ScholarshipDetailClickBudgetMode | null {
  if (options.authResolved === false) return null;
  // Guests: no detail-view budget — unlimited scholarship detail pages.
  // (Apply URLs / provider contacts remain subscription-gated server-side.)
  if (!options.isAuthenticated) return null;
  if (!options.hasSubscription) return 'signed-in-no-subscription';
  return null;
}

export function getScholarshipDetailFreeClicksUsed(
  mode: ScholarshipDetailClickBudgetMode
): number {
  if (typeof window === 'undefined') return 0;
  const cap = freeNavigationsForMode(mode);
  if (!Number.isFinite(cap)) return 0;
  const raw = localStorage.getItem(storageKeyForMode(mode));
  const n = parseInt(raw ?? '0', 10);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, cap);
}

export function shouldBlockScholarshipDetailNavigation(
  mode: ScholarshipDetailClickBudgetMode
): boolean {
  const cap = freeNavigationsForMode(mode);
  if (!Number.isFinite(cap)) return false;
  return getScholarshipDetailFreeClicksUsed(mode) >= cap;
}

export function recordScholarshipDetailFreeNavigation(
  mode: ScholarshipDetailClickBudgetMode
): void {
  const cap = freeNavigationsForMode(mode);
  if (!Number.isFinite(cap)) return;
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

/** @deprecated Detail page increments the guest budget on load; avoid duplicate calls from link handlers. */
export function recordGuestScholarshipDetailFreeNavigation(): void {
  recordScholarshipDetailFreeNavigation('guest');
}
