/**
 * URL segment → typed SEO tokens + canonical ordering (dedupe / redirect).
 */

import type { DeadlinePreset } from '@/app/scholarships/moreFilters';
import {
  LONG_TAIL_SLUG_SET,
  normalizeScholarshipDynamicParam,
  type LongTailSlug
} from '@/app/scholarships/scholarshipLongTailPresets';
import {
  SEO_ROUTE_EASY_APPLY_SEGMENTS,
  SEO_ROUTE_EDUCATION_SEGMENTS,
  SEO_ROUTE_ELIGIBILITY_SEGMENTS,
  SEO_ROUTE_GPA_SEGMENTS,
  SEO_ROUTE_STATE_SLUG_TO_LABEL
} from '@/lib/scholarships/seoTags/routeSegmentMaps';

export type SeoRouteToken =
  | { kind: 'legacy_preset'; slug: LongTailSlug }
  | { kind: 'eligibility'; id: string }
  | { kind: 'education'; id: string }
  | { kind: 'easy_apply'; id: string }
  | { kind: 'gpa'; id: string }
  | { kind: 'location'; label: string }
  | { kind: 'deadline'; preset: DeadlinePreset }
  | { kind: 'verified' }
  | { kind: 'payout'; id: 'college' | 'student' | 'non_monetary' | 'not_stated' };

/**
 * Canonical dimension order (SEO):
 * eligibility → education → category/topic (legacy) → easy_apply → gpa →
 * verified/payout → amount caps (legacy) → location → deadline (legacy closing-soon).
 */
function legacyPresetSortOrder(slug: LongTailSlug): number {
  if (slug === 'undergraduate' || slug === 'high-school') return 22;
  if (
    slug === 'engineering' ||
    slug === 'computer-science' ||
    slug === 'international-students' ||
    slug === 'nursing' ||
    slug === 'arts'
  ) {
    return 30;
  }
  if (slug === 'under-5000' || slug === 'under-10000') return 55;
  if (slug === 'closing-soon') return 80;
  return 32;
}

function tokenSortOrder(t: SeoRouteToken): number {
  switch (t.kind) {
    /** State/DC/nationwide first in canonical paths (e.g. california/nursing). */
    case 'location':
      return 5;
    case 'eligibility':
      return 10;
    case 'education':
      return 20;
    case 'legacy_preset':
      return legacyPresetSortOrder(t.slug);
    case 'easy_apply':
      return 40;
    case 'gpa':
      return 50;
    case 'verified':
      return 52;
    case 'payout':
      return 53;
    case 'deadline':
      return 70;
    default:
      return 99;
  }
}

const STATE_SLUG_TO_LABEL = SEO_ROUTE_STATE_SLUG_TO_LABEL;

/** Slugs that map to a US state / DC listing (`/scholarships/{slug}`). */
export function listUsStateSeoSlugs(): string[] {
  return Object.keys(STATE_SLUG_TO_LABEL).filter((k) => k !== 'nationwide');
}

const ELIGIBILITY_SLUGS = SEO_ROUTE_ELIGIBILITY_SEGMENTS;
const EDUCATION_SLUGS = SEO_ROUTE_EDUCATION_SEGMENTS;
const EASY_SLUGS = SEO_ROUTE_EASY_APPLY_SEGMENTS;
const GPA_SLUGS = SEO_ROUTE_GPA_SEGMENTS;

/**
 * All URL segments that resolve to a single SEO token (for candidate discovery).
 * Preference keys first where duplicates exist (e.g. for-women before women).
 */
export function listPreferredSeoPathSegments(): string[] {
  const segments = new Set<string>();
  for (const s of Object.keys(EASY_SLUGS)) segments.add(s);
  for (const s of Object.keys(ELIGIBILITY_SLUGS)) segments.add(s);
  for (const s of Object.keys(EDUCATION_SLUGS)) segments.add(s);
  for (const s of Object.keys(GPA_SLUGS)) segments.add(s);
  for (const s of Object.keys(STATE_SLUG_TO_LABEL)) segments.add(s);
  for (const s of Array.from(LONG_TAIL_SLUG_SET)) segments.add(s);
  segments.add('verified');
  segments.add('payout-college');
  segments.add('payout-student');
  segments.add('payout-non-monetary');
  segments.add('payout-not-stated');
  segments.add('full-ride');
  return Array.from(segments).sort((a, b) => a.localeCompare(b));
}

function segmentToToken(seg: string): SeoRouteToken | null {
  const s = normalizeScholarshipDynamicParam(seg);
  if (!s) return null;

  /** US state / DC / nationwide before other segment maps (stable filter priority). */
  const loc = STATE_SLUG_TO_LABEL[s];
  if (loc) return { kind: 'location', label: loc };

  const ez = EASY_SLUGS[s];
  if (ez) return { kind: 'easy_apply', id: ez };

  const el = ELIGIBILITY_SLUGS[s];
  if (el) return { kind: 'eligibility', id: el };

  const ed = EDUCATION_SLUGS[s];
  if (ed) return { kind: 'education', id: ed };

  const g = GPA_SLUGS[s];
  if (g) return { kind: 'gpa', id: g };

  if (s === 'verified' || s === 'verified-source') return { kind: 'verified' };

  if (s === 'payout-college') return { kind: 'payout', id: 'college' };
  if (s === 'payout-student') return { kind: 'payout', id: 'student' };
  if (s === 'payout-non-monetary') return { kind: 'payout', id: 'non_monetary' };
  if (s === 'payout-not-stated') return { kind: 'payout', id: 'not_stated' };

  if (LONG_TAIL_SLUG_SET.has(s)) {
    return { kind: 'legacy_preset', slug: s as LongTailSlug };
  }

  return null;
}

export function parsePathSegmentsToTokens(segments: string[]): SeoRouteToken[] | null {
  const out: SeoRouteToken[] = [];
  const seen = new Set<string>();
  for (const raw of segments) {
    const t = segmentToToken(raw);
    if (!t) return null;
    const key = JSON.stringify(t);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

function tokenToSegment(t: SeoRouteToken): string {
  switch (t.kind) {
    case 'legacy_preset':
      return t.slug;
    case 'eligibility': {
      const inv = Object.entries(ELIGIBILITY_SLUGS).find(([, id]) => id === t.id);
      return inv?.[0] ?? t.id.replace(/_/g, '-');
    }
    case 'education': {
      const inv = Object.entries(EDUCATION_SLUGS).find(([, id]) => id === t.id);
      return inv?.[0] ?? t.id.replace(/_/g, '-');
    }
    case 'easy_apply': {
      const inv = Object.entries(EASY_SLUGS).find(([, id]) => id === t.id);
      return inv?.[0] ?? t.id.replace(/_/g, '-');
    }
    case 'gpa': {
      const inv = Object.entries(GPA_SLUGS).find(([, id]) => id === t.id);
      return inv?.[0] ?? t.id.replace(/_/g, '-');
    }
    case 'location': {
      const inv = Object.entries(STATE_SLUG_TO_LABEL).find(
        ([, lab]) => lab === t.label
      );
      return inv?.[0] ?? t.label.toLowerCase().replace(/\s+/g, '-');
    }
    case 'deadline':
      return t.preset === 'lt1d'
        ? 'closing-soon'
        : `deadline-${t.preset}`;
    case 'verified':
      return 'verified';
    case 'payout':
      return `payout-${t.id.replace(/_/g, '-')}`;
    default:
      return 'unknown';
  }
}

export function canonicalPathFromTokens(tokens: SeoRouteToken[]): string {
  const sorted = [...tokens].sort((a, b) => {
    const da = tokenSortOrder(a);
    const db = tokenSortOrder(b);
    if (da !== db) return da - db;
    return tokenToSegment(a).localeCompare(tokenToSegment(b));
  });
  return sorted.map(tokenToSegment).join('/');
}

export function canonicalizeSegments(segments: string[]): {
  tokens: SeoRouteToken[];
  canonicalPath: string;
  needsRedirect: boolean;
} | null {
  const tokens = parsePathSegmentsToTokens(segments);
  if (!tokens || tokens.length === 0) return null;
  const canonicalPath = canonicalPathFromTokens(tokens);
  const normalizedInput = segments.map(normalizeScholarshipDynamicParam).join('/');
  return {
    tokens,
    canonicalPath,
    needsRedirect: canonicalPath !== normalizedInput
  };
}
