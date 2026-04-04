const KEY = 'scholarshipViewedIds';

function isBrowser() {
  return typeof window !== 'undefined';
}

export function getViewedScholarshipIds(): string[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
}

/** Помечает стипендию как открытую (детальная страница). */
export function markScholarshipViewed(id: string): string[] {
  const current = getViewedScholarshipIds();
  if (current.includes(id)) return current;
  const next = [...current, id];
  if (isBrowser()) {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  }
  return next;
}

export function isScholarshipViewed(id: string): boolean {
  return getViewedScholarshipIds().includes(id);
}
