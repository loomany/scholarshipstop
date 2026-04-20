/**
 * Hub listing budgets for providers / compare.
 * `guest` scope: global localStorage keys.
 * `account` scope: same caps, keys scoped per signed-in user (see `userScopedStorage`).
 */

import { getScopedScholarshipStorageKey } from '@/app/scholarships/userScopedStorage';

const PROVIDER_KEY = 'scholarshipGuestProviderHubNavigationsUsed';
const COMPARE_KEY = 'scholarshipGuestCompareHubNavigationsUsed';

/** Free navigations before the trial modal (3rd click is blocked). */
const FREE_PROVIDER_NAVIGATIONS = 2;
const FREE_COMPARE_NAVIGATIONS = 2;

export type HubBudgetScope = 'guest' | 'account';

function providerStorageKey(scope: HubBudgetScope): string {
  return scope === 'account'
    ? getScopedScholarshipStorageKey(PROVIDER_KEY)
    : PROVIDER_KEY;
}

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

export function getGuestProviderHubNavigationsUsed(
  scope: HubBudgetScope = 'guest'
): number {
  return readCount(providerStorageKey(scope), FREE_PROVIDER_NAVIGATIONS);
}

export function shouldBlockGuestProviderHubNavigation(
  scope: HubBudgetScope = 'guest'
): boolean {
  return getGuestProviderHubNavigationsUsed(scope) >= FREE_PROVIDER_NAVIGATIONS;
}

export function recordGuestProviderHubNavigation(
  scope: HubBudgetScope = 'guest'
): void {
  const next = getGuestProviderHubNavigationsUsed(scope) + 1;
  writeCount(providerStorageKey(scope), next, FREE_PROVIDER_NAVIGATIONS);
}

export function getGuestCompareHubNavigationsUsed(
  scope: HubBudgetScope = 'guest'
): number {
  return readCount(compareStorageKey(scope), FREE_COMPARE_NAVIGATIONS);
}

export function shouldBlockGuestCompareHubNavigation(
  scope: HubBudgetScope = 'guest'
): boolean {
  return getGuestCompareHubNavigationsUsed(scope) >= FREE_COMPARE_NAVIGATIONS;
}

export function recordGuestCompareHubNavigation(
  scope: HubBudgetScope = 'guest'
): void {
  const next = getGuestCompareHubNavigationsUsed(scope) + 1;
  writeCount(compareStorageKey(scope), next, FREE_COMPARE_NAVIGATIONS);
}
