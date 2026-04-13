/**
 * Old WordPress-era URLs used long title slugs (often with a `-2019` suffix) at the site root.
 * Current catalog rows typically use shorter canonical `scholarships.slug` values.
 *
 * Used by middleware (root → /scholarships/…) and by {@link fetchScholarshipBySlugOrId} fallback.
 */
const LEGACY_SLUG_ALIASES: Record<string, string> = {
  // Search Console sample: /study-in-canada-vanier-…-2019/ → seed / catalog id in repo
  'study-in-canada-vanier-canadian-scholarships-for-international-students-2019':
    'vanier-canada-graduate-scholarships',
  'study-in-canada-vanier-canadian-scholarships-for-international-students':
    'vanier-canada-graduate-scholarships'
};

/**
 * Ordered slug candidates to try against `scholarships.slug` (first match wins).
 */
export function legacyScholarshipSlugCandidates(raw: string): string[] {
  const s = decodeURIComponent(raw.trim());
  const out: string[] = [];
  const push = (x: string) => {
    if (x && !out.includes(x)) out.push(x);
  };

  const stripped = s.replace(/-2019$/i, '');
  const aliasFull = LEGACY_SLUG_ALIASES[s];
  if (aliasFull) push(aliasFull);
  if (stripped !== s) {
    const aliasStripped = LEGACY_SLUG_ALIASES[stripped];
    if (aliasStripped) push(aliasStripped);
    push(stripped);
  }
  push(s);
  return out;
}

/** Best canonical `scholarships.slug` for a legacy slug (root or `/scholarships/...`). */
export function preferredScholarshipSlugForLegacySlug(segment: string): string {
  return legacyScholarshipSlugCandidates(segment)[0]!;
}
