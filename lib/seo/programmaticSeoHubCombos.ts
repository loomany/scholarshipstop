/**
 * Route-compatible US hub combos: state × specialty (long-tail) × degree segment.
 * Paths must parse via {@link canonicalizeSegments}.
 */

import type { LongTailSlug } from '@/app/scholarships/scholarshipLongTailPresets';
import {
  canonicalizeSegments,
  listUsStateSeoSlugs
} from '@/lib/scholarships/seoScholarshipRouteTokens';

/** Topics that resolve to legacy_preset tokens (field matchers in long-tail presets). */
export const PROGRAMMATIC_SPECIALTY_SLUGS = [
  'engineering',
  'computer-science',
  'nursing',
  'arts'
] as const satisfies readonly LongTailSlug[];

/**
 * Degree / level URL segments that parse as education or legacy_preset tokens.
 * Omit duplicates that break multi-legacy routes (handled by canonicalizeSegments).
 */
export const PROGRAMMATIC_DEGREE_SEGMENTS = [
  'undergraduate',
  'graduate',
  'high-school',
  'mba',
  'phd',
  'community-college',
  'trade-school',
  'high-school-senior'
] as const;

export type ProgrammaticDegreeSegment =
  (typeof PROGRAMMATIC_DEGREE_SEGMENTS)[number];

export function buildCanonicalHubPath(args: {
  stateSlug: string;
  topicSlug: LongTailSlug;
  degreeSegment: string;
}): string | null {
  const canon = canonicalizeSegments([
    args.stateSlug,
    args.degreeSegment,
    args.topicSlug
  ]);
  return canon?.canonicalPath ?? null;
}

export function listProgrammaticHubCanonicalPaths(): string[] {
  const states = listUsStateSeoSlugs();
  const out = new Set<string>();
  for (const stateSlug of states) {
    for (const topic of PROGRAMMATIC_SPECIALTY_SLUGS) {
      for (const deg of PROGRAMMATIC_DEGREE_SEGMENTS) {
        const p = buildCanonicalHubPath({
          stateSlug,
          topicSlug: topic,
          degreeSegment: deg
        });
        if (p) out.add(p);
      }
    }
  }
  return Array.from(out).sort((a, b) => a.localeCompare(b));
}
