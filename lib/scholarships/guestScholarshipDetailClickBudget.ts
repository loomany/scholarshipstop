const SESSION_KEY = 'scholarshipGuestDetailFreeClicksUsed';

/** Number of free navigations to scholarship detail before the registration modal (3rd click opens it). */
const FREE_DETAIL_NAVIGATIONS = 2;

export function getGuestScholarshipDetailFreeClicksUsed(): number {
  if (typeof window === 'undefined') return 0;
  const raw = sessionStorage.getItem(SESSION_KEY);
  const n = parseInt(raw ?? '0', 10);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, FREE_DETAIL_NAVIGATIONS);
}

/** True when the next primary click on a catalog card should open the registration wall instead of navigating. */
export function shouldBlockGuestScholarshipDetailNavigation(): boolean {
  return getGuestScholarshipDetailFreeClicksUsed() >= FREE_DETAIL_NAVIGATIONS;
}

/** Call when allowing a guest to follow the detail link (increments toward the wall). */
export function recordGuestScholarshipDetailFreeNavigation(): void {
  const next = getGuestScholarshipDetailFreeClicksUsed() + 1;
  sessionStorage.setItem(
    SESSION_KEY,
    String(Math.min(next, FREE_DETAIL_NAVIGATIONS))
  );
}
