import { getScopedScholarshipStorageKey } from '@/app/scholarships/userScopedStorage';

export const SUBMITTED_SCHOLARSHIPS_KEY = 'scholarshipSubmitted';

function isBrowser() {
  return typeof window !== 'undefined';
}

export function getSubmittedScholarshipIds(): string[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(
      getScopedScholarshipStorageKey(SUBMITTED_SCHOLARSHIPS_KEY)
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

export function addSubmittedScholarship(id: string): string[] {
  const current = getSubmittedScholarshipIds();
  if (current.includes(id)) return current;
  const next = [...current, id];
  if (isBrowser()) {
    window.localStorage.setItem(
      getScopedScholarshipStorageKey(SUBMITTED_SCHOLARSHIPS_KEY),
      JSON.stringify(next)
    );
  }
  return next;
}

export function removeSubmittedScholarship(id: string): string[] {
  const next = getSubmittedScholarshipIds().filter((x) => x !== id);
  if (isBrowser()) {
    window.localStorage.setItem(
      getScopedScholarshipStorageKey(SUBMITTED_SCHOLARSHIPS_KEY),
      JSON.stringify(next)
    );
  }
  return next;
}

export function isScholarshipSubmitted(id: string): boolean {
  return getSubmittedScholarshipIds().includes(id);
}
