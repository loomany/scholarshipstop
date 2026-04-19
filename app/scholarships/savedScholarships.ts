import { getScopedScholarshipStorageKey } from '@/app/scholarships/userScopedStorage';

export const SAVED_SCHOLARSHIPS_KEY = 'savedScholarships';

function isBrowser() {
  return typeof window !== 'undefined';
}

export function getSavedScholarshipIds(): string[] {
  if (!isBrowser()) return [];

  try {
    const raw = window.localStorage.getItem(
      getScopedScholarshipStorageKey(SAVED_SCHOLARSHIPS_KEY)
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

export function saveScholarship(id: string): string[] {
  const current = getSavedScholarshipIds();
  if (current.includes(id)) return current;
  const next = [...current, id];
  if (isBrowser()) {
    window.localStorage.setItem(
      getScopedScholarshipStorageKey(SAVED_SCHOLARSHIPS_KEY),
      JSON.stringify(next)
    );
  }
  return next;
}

/** Alias for UI copy that names the profile save action explicitly. */
export function saveScholarshipToUserProfile(id: string): string[] {
  return saveScholarship(id);
}

export function removeScholarship(id: string): string[] {
  const next = getSavedScholarshipIds().filter((item) => item !== id);
  if (isBrowser()) {
    window.localStorage.setItem(
      getScopedScholarshipStorageKey(SAVED_SCHOLARSHIPS_KEY),
      JSON.stringify(next)
    );
  }
  return next;
}

export function isScholarshipSaved(id: string): boolean {
  return getSavedScholarshipIds().includes(id);
}

