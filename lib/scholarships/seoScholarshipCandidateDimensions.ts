/**
 * SEO candidate dimensions: allowlisted cross-dimension doubles (strong intent)
 * and block garbage (e.g. location + location).
 */

import {
  parsePathSegmentsToTokens,
  type SeoRouteToken
} from '@/lib/scholarships/seoScholarshipRouteTokens';

/**
 * Maps each token to one bucket for pair / triple rules.
 */
export function seoCombinationDimension(t: SeoRouteToken): string {
  switch (t.kind) {
    case 'location':
      return 'location';
    case 'eligibility':
      return 'eligibility';
    case 'education':
      return 'education';
    case 'gpa':
      return 'gpa';
    case 'easy_apply':
      return 'easy_apply';
    case 'deadline':
      return 'deadline';
    case 'verified':
      return 'verified';
    case 'payout':
      return 'payout';
    case 'legacy_preset': {
      const s = t.slug;
      if (s === 'no-essay') return 'easy_apply';
      if (s === 'closing-soon') return 'deadline';
      if (s === 'under-5000' || s === 'under-10000') return 'amount';
      if (s === 'engineering' || s === 'computer-science') return 'category';
      if (s === 'high-school' || s === 'undergraduate') return 'education';
      if (s === 'international-students') return 'international_scope';
      return 'legacy_misc';
    }
    default:
      return 'unknown';
  }
}

function normDimPairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/** Unordered dimension pairs that may form an auto double (cross-intent). */
const ALLOWED_DOUBLE_DIM_KEYS = new Set(
  (
    [
      ['eligibility', 'easy_apply'],
      ['eligibility', 'location'],
      ['education', 'location'],
      ['category', 'location'],
      ['category', 'easy_apply'],
      ['education', 'easy_apply'],
      ['international_scope', 'eligibility'],
      ['international_scope', 'location']
    ] as const
  ).map(([x, y]) => normDimPairKey(x, y))
);

/**
 * True if this two-token route is an allowlisted cross-dimension combo.
 * Blocks same-dimension pairs (location+location, education+education, …).
 */
export function isAllowedSeoDouble(tokens: SeoRouteToken[]): boolean {
  if (tokens.length !== 2) return false;
  const d0 = seoCombinationDimension(tokens[0]!);
  const d1 = seoCombinationDimension(tokens[1]!);
  if (d0 === d1) return false;
  return ALLOWED_DOUBLE_DIM_KEYS.has(normDimPairKey(d0, d1));
}

/** Triples: each dimension at most once (blocks e.g. three states). */
export function tokensHavePairwiseDistinctDimensions(
  tokens: SeoRouteToken[]
): boolean {
  if (tokens.length < 2) return false;
  const dims = tokens.map(seoCombinationDimension);
  return new Set(dims).size === dims.length;
}

/** For post-merge indexability: doubles built only from allowlisted pairs. */
export function canonicalPathIsAllowlistedDouble(canonicalPath: string): boolean {
  const tokens = parsePathSegmentsToTokens(
    canonicalPath.split('/').filter(Boolean)
  );
  if (!tokens || tokens.length !== 2) return false;
  return isAllowedSeoDouble(tokens);
}
