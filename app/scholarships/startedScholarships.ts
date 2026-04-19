import { getScopedScholarshipStorageKey } from '@/app/scholarships/userScopedStorage';

export const STARTED_SCHOLARSHIPS_KEY = 'scholarshipStarted';

function isBrowser() {
  return typeof window !== 'undefined';
}

export function getStartedScholarshipIds(): string[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(
      getScopedScholarshipStorageKey(STARTED_SCHOLARSHIPS_KEY)
    );
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
}

export function addStartedScholarship(id: string): string[] {
  const current = getStartedScholarshipIds();
  if (current.includes(id)) return current;
  const next = [...current, id];
  if (isBrowser()) {
    window.localStorage.setItem(
      getScopedScholarshipStorageKey(STARTED_SCHOLARSHIPS_KEY),
      JSON.stringify(next)
    );
  }
  return next;
}

export function removeStartedScholarship(id: string): string[] {
  const next = getStartedScholarshipIds().filter((x) => x !== id);
  if (isBrowser()) {
    window.localStorage.setItem(
      getScopedScholarshipStorageKey(STARTED_SCHOLARSHIPS_KEY),
      JSON.stringify(next)
    );
  }
  return next;
}

export function isScholarshipStarted(id: string): boolean {
  return getStartedScholarshipIds().includes(id);
}
