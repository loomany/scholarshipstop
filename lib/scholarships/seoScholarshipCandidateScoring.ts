import type { SeoScholarshipRouteManifestEntry } from '@/lib/scholarships/seoScholarshipManifest';
import { SEO_ROUTE_STATE_SLUG_TO_LABEL } from '@/lib/scholarships/seoTags/routeSegmentMaps';

export const AUTO_PROMOTION_EXCLUDED_SEGMENTS = new Set([
  'nationwide',
  'under-10000',
  'under-5000',
  'payout-not-stated',
  'few-requirements',
  'no-gpa-requirement',
  'payout-non-monetary'
]);

/** Curated URL segments (normalized slugs) — high commercial / search intent. */
export const HIGH_PRIORITY_SEGMENTS = new Set([
  'no-essay',
  'for-women',
  'women',
  'international-students',
  'high-school',
  'undergraduate',
  'california',
  'texas',
  'new-york',
  'florida',
  'engineering',
  'computer-science',
  'under-5000',
  'under-10000',
  'closing-soon',
  'first-generation',
  'low-income'
]);

export const MEDIUM_PRIORITY_SEGMENTS = new Set([
  'verified',
  'verified-source',
  'payout-college',
  'payout-student',
  'payout-non-monetary',
  'payout-not-stated',
  'graduate',
  'mba',
  'phd',
  'community-college',
  'trade-school',
  'high-school-senior',
  'no-gpa-requirement',
  'gpa-2-0',
  'gpa-2-5',
  'gpa-3-0',
  'gpa-3-5',
  'minority',
  'hispanic',
  'african-american',
  'veterans',
  'lgbtq',
  'disability',
  'community',
  'biology',
  'arts',
  'music'
]);

export type PriorityBucket = 'high' | 'medium' | 'low';

export function priorityBucketForSegment(segment: string): PriorityBucket {
  const s = segment.trim().toLowerCase();
  if (HIGH_PRIORITY_SEGMENTS.has(s)) return 'high';
  if (MEDIUM_PRIORITY_SEGMENTS.has(s)) return 'medium';
  return 'low';
}

export function curatedWeightForSegment(segment: string): number {
  const b = priorityBucketForSegment(segment);
  if (b === 'high') return 22;
  if (b === 'medium') return 12;
  return 5;
}

export function maxCuratedWeightForPath(canonicalPath: string): number {
  const parts = canonicalPath.split('/').filter(Boolean);
  if (parts.length === 0) return 0;
  return Math.max(...parts.map(curatedWeightForSegment));
}

export function minCountForPageType(
  t: SeoScholarshipRouteManifestEntry['pageType']
): number {
  if (t === 'single') return 8;
  if (t === 'double') return 4;
  return 5;
}

/** Overlap above this → treat as duplicate-like (do not promote to manifest). */
export const OVERLAP_DUPLICATE_LIKELY = 0.92;

/** Allowlisted doubles only: tolerate higher parent overlap. */
export const ALLOWLISTED_DOUBLE_OVERLAP_CAP = 0.96;

/** Extra score for high-intent URL segments (capped). */
export function strongComboBoostFromPath(canonicalPath: string): number {
  const segs = canonicalPath.split('/').filter(Boolean);
  let b = 0;
  if (segs.includes('no-essay')) b += 6;
  if (segs.includes('for-women') || segs.includes('women')) b += 6;
  if (segs.includes('international-students')) b += 6;
  if (segs.includes('high-school') || segs.includes('undergraduate')) b += 5;
  return Math.min(b, 18);
}

function splitPath(canonicalPath: string): string[] {
  return canonicalPath
    .split('/')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function countExcludedSegments(canonicalPath: string): number {
  return splitPath(canonicalPath).filter((seg) =>
    AUTO_PROMOTION_EXCLUDED_SEGMENTS.has(seg)
  ).length;
}

function countLocationSegments(canonicalPath: string): number {
  return splitPath(canonicalPath).filter((seg) => seg in SEO_ROUTE_STATE_SLUG_TO_LABEL).length;
}

function countPayoutSegments(canonicalPath: string): number {
  return splitPath(canonicalPath).filter((seg) => seg.startsWith('payout-')).length;
}

function countAudienceSegments(canonicalPath: string): number {
  return splitPath(canonicalPath).filter((seg) =>
    [
      'for-women',
      'women',
      'minority',
      'hispanic',
      'african-american',
      'first-generation',
      'disability',
      'veterans',
      'lgbtq',
      'single-parent',
      'foster-youth',
      'native-american',
      'low-income',
      'international-students'
    ].includes(seg)
  ).length;
}

function countEducationSegments(canonicalPath: string): number {
  return splitPath(canonicalPath).filter((seg) =>
    ['high-school', 'undergraduate', 'graduate', 'phd', 'high-school-senior'].includes(seg)
  ).length;
}

function countCategorySegments(canonicalPath: string): number {
  return splitPath(canonicalPath).filter((seg) =>
    ['engineering', 'computer-science'].includes(seg)
  ).length;
}

export function shouldExcludeAutoPromotionPath(canonicalPath: string): boolean {
  const segs = splitPath(canonicalPath);
  if (segs.some((seg) => AUTO_PROMOTION_EXCLUDED_SEGMENTS.has(seg))) return true;
  if (canonicalPath === 'international-students-eligibility') return true;
  if (countPayoutSegments(canonicalPath) > 0 && segs.length >= 2) return true;
  if (
    countAudienceSegments(canonicalPath) > 0 &&
    countEducationSegments(canonicalPath) > 0 &&
    countCategorySegments(canonicalPath) > 0
  ) {
    return true;
  }
  return false;
}

function isBroadSingleCategoryOrLocationPath(canonicalPath: string): boolean {
  const segs = splitPath(canonicalPath);
  if (segs.length !== 1) return false;
  const seg = segs[0];
  if (!seg) return false;
  if (AUTO_PROMOTION_EXCLUDED_SEGMENTS.has(seg)) return true;
  return !HIGH_PRIORITY_SEGMENTS.has(seg) && !MEDIUM_PRIORITY_SEGMENTS.has(seg);
}

/**
 * Composite score: count strength + page shape + intent + combo boost − overlap penalty.
 * For doubles/triples, `overlapRatio` is max |child|/|parent| vs composing parents (high = duplicate-like).
 * Allowlisted doubles use a softer overlap curve.
 */
export function computeRouteScore(args: {
  pageType: SeoScholarshipRouteManifestEntry['pageType'];
  count: number;
  canonicalPath: string;
  overlapRatio: number;
  /** Allowlisted cross-dimension doubles: milder overlap penalty */
  allowlistedDouble?: boolean;
}): number {
  const { pageType, count, canonicalPath, overlapRatio } = args;
  const countW = Math.min(42, Math.log1p(count) * 8.5);
  const typeW = pageType === 'single' ? 14 : pageType === 'double' ? 9 : 5;
  const intentW = maxCuratedWeightForPath(canonicalPath);
  const boost = strongComboBoostFromPath(canonicalPath);

  let overlapPenalty: number;
  if (args.allowlistedDouble && pageType === 'double') {
    overlapPenalty =
      overlapRatio >= OVERLAP_DUPLICATE_LIKELY
        ? 22
        : overlapRatio >= 0.88
          ? 11
          : overlapRatio >= 0.8
            ? 5
            : 0;
  } else {
    overlapPenalty =
      overlapRatio >= OVERLAP_DUPLICATE_LIKELY
        ? 40
        : overlapRatio >= 0.85
          ? 18
          : overlapRatio >= 0.75
            ? 8
            : 0;
  }

  return Math.round((countW + typeW + intentW + boost - overlapPenalty) * 10) / 10;
}

export function minScoreForPageType(
  t: SeoScholarshipRouteManifestEntry['pageType']
): number {
  if (t === 'single') return 26;
  if (t === 'double') return 22;
  return 36;
}

export function shouldPromoteAutoRoute(args: {
  pageType: SeoScholarshipRouteManifestEntry['pageType'];
  count: number;
  score: number;
  overlapRatio: number;
  canonicalPath: string;
  /** Allowlisted doubles: slightly tolerate parent overlap */
  allowlistedDouble?: boolean;
}): boolean {
  if (args.count < minCountForPageType(args.pageType)) return false;
  if (shouldExcludeAutoPromotionPath(args.canonicalPath)) return false;
  const overlapCap =
    args.allowlistedDouble && args.pageType === 'double'
      ? ALLOWLISTED_DOUBLE_OVERLAP_CAP
      : OVERLAP_DUPLICATE_LIKELY;
  if (args.overlapRatio >= overlapCap) return false;
  const excludedCount = countExcludedSegments(args.canonicalPath);
  if (excludedCount > 0 && args.pageType !== 'single') return false;
  if (isBroadSingleCategoryOrLocationPath(args.canonicalPath) && args.count >= 300) {
    return false;
  }
  if (args.pageType === 'single' && args.count >= 1000) {
    return false;
  }
  if (countLocationSegments(args.canonicalPath) > 0 && args.count >= 250) {
    return false;
  }
  if (args.score < minScoreForPageType(args.pageType)) return false;
  return true;
}
