/**
 * `seo_generation_queue.canonical_path` values for compare battles use the prefix
 * `compare/states/` or `compare/universities/` (no leading slash). Those URLs must
 * not be emitted as `/scholarships/compare/...`: real routes live under `/compare/...`
 * and are listed in the compare sitemap bucket via dedicated RPCs.
 */
export function normalizeSeoGenerationCanonicalPath(canonicalPath: string): string {
  return canonicalPath.trim().replace(/^\/+/g, '').toLowerCase();
}

/** True when this queue path refers to a compare page (omit from scholarship-prefixed SEO sitemap URLs). */
export function isCompareHubSeoGenerationCanonicalPath(
  canonicalPath: string
): boolean {
  const n = normalizeSeoGenerationCanonicalPath(canonicalPath);
  if (!n) return false;
  if (n === 'compare/states' || n.startsWith('compare/states/')) return true;
  if (n === 'compare/universities' || n.startsWith('compare/universities/'))
    return true;
  return false;
}
