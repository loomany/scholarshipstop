/**
 * When a thin SEO listing is noindex, point canonical at the nearest broader URL.
 */
export function widenScholarshipSeoPath(canonicalPath: string): string | null {
  const parts = canonicalPath.split('/').filter(Boolean);
  if (parts.length <= 1) return null;
  return parts.slice(0, -1).join('/');
}
