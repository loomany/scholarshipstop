/** Separator for versus URLs: `[slugA]-vs-[slugB]` (slug parts may contain hyphens). */
export const UNIVERSITY_VS_SEPARATOR = '-vs-';

export function parseUniversityVsSlug(raw: string): [string, string] | null {
  const slug = raw.trim().toLowerCase();
  const idx = slug.indexOf(UNIVERSITY_VS_SEPARATOR);
  if (idx <= 0) return null;
  const a = slug.slice(0, idx).trim();
  const b = slug.slice(idx + UNIVERSITY_VS_SEPARATOR.length).trim();
  if (!a || !b || a === b) return null;
  return [a, b];
}

/** Alphabetical canonical slug (locale-aware, en). */
export function canonicalUniversityVsSlug(raw: string): string | null {
  const parsed = parseUniversityVsSlug(raw);
  if (!parsed) return null;
  const [x, y] = parsed;
  const sorted = [x, y].sort((l, r) => l.localeCompare(r, 'en'));
  return `${sorted[0]}${UNIVERSITY_VS_SEPARATOR}${sorted[1]}`;
}

export function universityComparePath(canonicalSlug: string): string {
  return `/compare/universities/${canonicalSlug}`;
}
