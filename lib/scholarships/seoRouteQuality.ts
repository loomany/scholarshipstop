import type {
  SeoRouteQualityBucket,
  SeoRouteQualitySnapshot,
  SeoRouteReasonCode
} from '@/lib/scholarships/seoScholarshipManifest';

export const SEO_GOOD_MIN_RESULTS = 8;
export const SEO_SUPPORTING_MIN_RESULTS = 5;
export const SEO_MAX_GOOD_SELECTIVITY_RATIO = 0.15;
export const SEO_NEAR_DUPLICATE_JACCARD = 0.8;

const STRONG_FIELD_SEGMENTS = new Set([
  'engineering',
  'computer-science',
  'biology',
  'nursing',
  'arts',
  'music'
]);

const STRONG_STAGE_SEGMENTS = new Set([
  'high-school',
  'high-school-senior',
  'undergraduate',
  'graduate',
  'phd'
]);

const STRONG_AUDIENCE_SEGMENTS = new Set([
  'first-generation',
  'veterans',
  'international-students',
  'minority',
  'african-american',
  'hispanic',
  'lgbtq',
  'disability',
  'single-parent',
  'foster-youth',
  'native-american'
]);

const TIME_SEGMENTS = new Set(['closing-soon']);

const WEAK_FACET_PENALTIES: Record<string, number> = {
  'no-gpa-requirement': 8,
  'payout-not-stated': 9,
  'few-requirements': 10,
  'under-10000': 12,
  'under-5000': 14,
  nationwide: 12,
  'payout-non-monetary': 8
};

type IntentBreakdown = {
  score: number;
  weakFacetPenalty: number;
  weakFacetCount: number;
  strongIntentCount: number;
};

export type SeoRouteQualityEvaluation = {
  bucket: SeoRouteQualityBucket;
  indexable: boolean;
  noindexNow: boolean;
  canonicalTarget: string | null;
  reasonCodes: SeoRouteReasonCode[];
  snapshot: SeoRouteQualitySnapshot;
};

export function defaultCanonicalTargetForPath(canonicalPath: string): string | null {
  const parts = canonicalPath.split('/').filter(Boolean);
  if (parts.length <= 1) return null;
  return parts.slice(0, -1).join('/');
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function splitPath(path: string): string[] {
  return path
    .split('/')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function computeIntentBreakdown(canonicalPath: string): IntentBreakdown {
  const segments = splitPath(canonicalPath);
  let score = 0;
  let weakFacetPenalty = 0;
  let weakFacetCount = 0;
  let strongIntentCount = 0;

  for (const segment of segments) {
    if (STRONG_FIELD_SEGMENTS.has(segment)) {
      score += 12;
      strongIntentCount += 1;
      continue;
    }
    if (STRONG_STAGE_SEGMENTS.has(segment)) {
      score += 10;
      strongIntentCount += 1;
      continue;
    }
    if (STRONG_AUDIENCE_SEGMENTS.has(segment)) {
      score += 10;
      strongIntentCount += 1;
      continue;
    }
    if (TIME_SEGMENTS.has(segment)) {
      score += 8;
      strongIntentCount += 1;
      continue;
    }
    if (segment in WEAK_FACET_PENALTIES) {
      weakFacetPenalty += WEAK_FACET_PENALTIES[segment]!;
      weakFacetCount += 1;
    }
  }

  if (segments.length >= 2 && strongIntentCount >= 2) score += 8;
  if (segments.length >= 3 && weakFacetCount > 0) weakFacetPenalty += 6;

  return {
    score,
    weakFacetPenalty,
    weakFacetCount,
    strongIntentCount
  };
}

export function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  if (a.size === 0 || b.size === 0) return 0;
  const [smaller, larger] = a.size <= b.size ? [a, b] : [b, a];
  let intersection = 0;
  smaller.forEach((id) => {
    if (larger.has(id)) intersection += 1;
  });
  const union = a.size + b.size - intersection;
  if (union <= 0) return 0;
  return intersection / union;
}

export function evaluateSeoRouteQuality(args: {
  canonicalPath: string;
  exactCount: number;
  renderedCount: number;
  totalCatalog: number;
  fallbackUsed: boolean;
  overlapSimilarity?: number;
  canonicalTarget?: string | null;
  reasonCodes?: SeoRouteReasonCode[];
}): SeoRouteQualityEvaluation {
  const {
    canonicalPath,
    exactCount,
    renderedCount,
    totalCatalog,
    fallbackUsed,
    overlapSimilarity = 0,
    canonicalTarget,
    reasonCodes = []
  } = args;

  const reasons = new Set<SeoRouteReasonCode>(reasonCodes);
  const safeTotal = Math.max(1, totalCatalog);
  const selectivityRatio = exactCount > 0 ? exactCount / safeTotal : 0;
  const intent = computeIntentBreakdown(canonicalPath);
  const overlapScore = Math.max(0, round(18 - overlapSimilarity * 20));
  const volumeScore = Math.min(24, exactCount * 0.65);
  const selectivityScore = Math.max(
    0,
    round(24 - Math.max(0, selectivityRatio - 0.02) * 80)
  );
  const fallbackPenalty = fallbackUsed ? 35 : 0;
  const finalQualityScore = round(
    intent.score + volumeScore + selectivityScore + overlapScore - intent.weakFacetPenalty - fallbackPenalty
  );

  if (exactCount === 0) reasons.add('exact_zero');
  if (fallbackUsed) reasons.add('fallback_used');

  const tooBroadByRatio = selectivityRatio > SEO_MAX_GOOD_SELECTIVITY_RATIO;
  if (tooBroadByRatio) reasons.add('too_broad_ratio');

  if (overlapSimilarity > SEO_NEAR_DUPLICATE_JACCARD) {
    reasons.add('overlap_too_high');
  }

  if (intent.weakFacetCount > 0) {
    reasons.add(
      intent.strongIntentCount === 0 ? 'weak_facet_only' : 'weak_facet_combo'
    );
  }

  let bucket: SeoRouteQualityBucket;

  if (exactCount < 0 || renderedCount < 0) {
    bucket = 'ERROR';
    reasons.add('render_error');
  } else if (exactCount === 0 && renderedCount === 0) {
    bucket = 'EMPTY';
    reasons.add('empty_result_set');
  } else if (exactCount === 0 && renderedCount > 0) {
    bucket = 'TOO_BROAD';
    reasons.add('manifest_render_mismatch');
  } else if (fallbackUsed) {
    bucket = 'TOO_BROAD';
  } else if (exactCount < SEO_SUPPORTING_MIN_RESULTS || renderedCount < SEO_SUPPORTING_MIN_RESULTS) {
    bucket = 'THIN';
    reasons.add('thin_result_set');
  } else if (tooBroadByRatio) {
    bucket = 'TOO_BROAD';
  } else if (renderedCount < SEO_GOOD_MIN_RESULTS || exactCount < SEO_GOOD_MIN_RESULTS) {
    bucket = 'SUPPORTING';
    reasons.add('supporting_result_set');
  } else if (intent.weakFacetCount > 0 || overlapSimilarity > SEO_NEAR_DUPLICATE_JACCARD) {
    bucket = 'SUPPORTING';
  } else {
    bucket = 'GOOD';
    reasons.add('good_route');
  }

  if (bucket === 'SUPPORTING' && exactCount < SEO_GOOD_MIN_RESULTS) {
    reasons.add('exact_below_threshold');
  }
  if (bucket === 'SUPPORTING' && renderedCount < SEO_GOOD_MIN_RESULTS) {
    reasons.add('render_below_threshold');
  }

  const resolvedCanonicalTarget =
    bucket === 'GOOD'
      ? null
      : canonicalTarget ?? defaultCanonicalTargetForPath(canonicalPath);

  return {
    bucket,
    indexable: bucket === 'GOOD',
    noindexNow: bucket !== 'GOOD',
    canonicalTarget: resolvedCanonicalTarget,
    reasonCodes: Array.from(reasons),
    snapshot: {
      exactCount,
      renderedCount,
      totalCatalog: safeTotal,
      selectivityRatio: round(selectivityRatio),
      fallbackUsed,
      overlapScore,
      overlapSimilarity: overlapSimilarity > 0 ? round(overlapSimilarity) : undefined,
      overlapTarget: resolvedCanonicalTarget,
      facetPenalty: intent.weakFacetPenalty,
      intentScore: intent.score,
      finalQualityScore
    }
  };
}

export function applyNearDuplicateSuppression<T extends { canonicalPath: string }>(
  routes: Array<{
    route: T;
    ids: Set<string>;
    evaluation: SeoRouteQualityEvaluation;
  }>
): Map<
  string,
  {
    target: string;
    similarity: number;
  }
> {
  const ordered = [...routes].sort((a, b) => {
    const bucketRank = (x: SeoRouteQualityBucket) =>
      x === 'GOOD' ? 0 : x === 'SUPPORTING' ? 1 : x === 'THIN' ? 2 : x === 'EMPTY' ? 3 : x === 'TOO_BROAD' ? 4 : 5;
    const aRank = bucketRank(a.evaluation.bucket);
    const bRank = bucketRank(b.evaluation.bucket);
    if (aRank !== bRank) return aRank - bRank;
    if (
      b.evaluation.snapshot.finalQualityScore !==
      a.evaluation.snapshot.finalQualityScore
    ) {
      return (
        b.evaluation.snapshot.finalQualityScore -
        a.evaluation.snapshot.finalQualityScore
      );
    }
    if (b.evaluation.snapshot.intentScore !== a.evaluation.snapshot.intentScore) {
      return b.evaluation.snapshot.intentScore - a.evaluation.snapshot.intentScore;
    }
    if (b.ids.size !== a.ids.size) return b.ids.size - a.ids.size;
    return a.route.canonicalPath.length - b.route.canonicalPath.length;
  });

  const suppressed = new Map<string, { target: string; similarity: number }>();

  for (let i = 0; i < ordered.length; i += 1) {
    const stronger = ordered[i]!;
    if (suppressed.has(stronger.route.canonicalPath)) continue;
    for (let j = i + 1; j < ordered.length; j += 1) {
      const weaker = ordered[j]!;
      if (suppressed.has(weaker.route.canonicalPath)) continue;
      const similarity = jaccardSimilarity(stronger.ids, weaker.ids);
      if (similarity <= SEO_NEAR_DUPLICATE_JACCARD) continue;
      suppressed.set(weaker.route.canonicalPath, {
        target: stronger.route.canonicalPath,
        similarity: round(similarity)
      });
    }
  }

  return suppressed;
}
