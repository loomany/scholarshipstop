import { getScopedScholarshipStorageKey } from '@/app/scholarships/userScopedStorage';

export const IGNORED_SCHOLARSHIPS_KEY = 'scholarshipIgnored';

function isBrowser() {
  return typeof window !== 'undefined';
}

export function getIgnoredScholarshipIds(): string[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(
      getScopedScholarshipStorageKey(IGNORED_SCHOLARSHIPS_KEY)
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

export function addIgnoredScholarship(id: string): string[] {
  const current = getIgnoredScholarshipIds();
  if (current.includes(id)) return current;
  const next = [...current, id];
  if (isBrowser()) {
    window.localStorage.setItem(
      getScopedScholarshipStorageKey(IGNORED_SCHOLARSHIPS_KEY),
      JSON.stringify(next)
    );
  }
  return next;
}

export function removeIgnoredScholarship(id: string): string[] {
  const next = getIgnoredScholarshipIds().filter((x) => x !== id);
  if (isBrowser()) {
    window.localStorage.setItem(
      getScopedScholarshipStorageKey(IGNORED_SCHOLARSHIPS_KEY),
      JSON.stringify(next)
    );
  }
  return next;
}

export function isScholarshipIgnored(id: string): boolean {
  return getIgnoredScholarshipIds().includes(id);
}
