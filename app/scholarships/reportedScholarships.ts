const KEY = 'scholarshipReported';

function isBrowser() {
  return typeof window !== 'undefined';
}

export function getReportedScholarshipIds(): string[] {
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

export function toggleReportedScholarship(id: string): string[] {
  const current = getReportedScholarshipIds();
  const next = current.includes(id)
    ? current.filter((x) => x !== id)
    : [...current, id];
  if (isBrowser()) {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  }
  return next;
}

export function isScholarshipReported(id: string): boolean {
  return getReportedScholarshipIds().includes(id);
}
