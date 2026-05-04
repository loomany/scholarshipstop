/**
 * Hub listing budgets for compare (and similar). Provider profile clicks are unlimited.
 * `guest` scope: global localStorage keys.
 * `account` scope: same caps, keys scoped per signed-in user (see `userScopedStorage`).
 */

import { getScopedScholarshipStorageKey } from '@/app/scholarships/userScopedStorage';

const COMPARE_KEY = 'scholarshipGuestCompareHubNavigationsUsed';

/** Free navigations before the trial modal (11th click is blocked). */
const FREE_COMPARE_NAVIGATIONS = 10;

export type HubBudgetScope = 'guest' | 'account';

function compareStorageKey(scope: HubBudgetScope): string {
  return scope === 'account'
    ? getScopedScholarshipStorageKey(COMPARE_KEY)
    : COMPARE_KEY;
}

function readCount(key: string, cap: number): number {
  if (typeof window === 'undefined') return 0;
  const raw = localStorage.getItem(key);
  const n = parseInt(raw ?? '0', 10);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, cap);
}

function writeCount(key: string, value: number, cap: number): void {
  localStorage.setItem(key, String(Math.min(value, cap)));
}

export function getGuestCompareHubNavigationsUsed(
  scope: HubBudgetScope = 'guest'
): number {
  return readCount(compareStorageKey(scope), FREE_COMPARE_NAVIGATIONS);
}

export function shouldBlockGuestCompareHubNavigation(
  scope: HubBudgetScope = 'guest'
): boolean {
  // Signed-in users should not hit guest hub paywalls.
  if (scope === 'account') return false;
  return getGuestCompareHubNavigationsUsed(scope) >= FREE_COMPARE_NAVIGATIONS;
}

export function recordGuestCompareHubNavigation(
  scope: HubBudgetScope = 'guest'
): void {
  if (scope === 'account') return;
  const next = getGuestCompareHubNavigationsUsed(scope) + 1;
  writeCount(compareStorageKey(scope), next, FREE_COMPARE_NAVIGATIONS);
}
