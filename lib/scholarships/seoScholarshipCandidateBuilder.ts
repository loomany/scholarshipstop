import type { Scholarship } from '@/app/scholarships/scholarshipsData';
import { isScholarshipUSA } from '@/app/scholarships/scholarshipCategories';
import { scholarshipsInTab } from '@/app/scholarships/scholarshipTabs';
import { buildDynamicSeoManifestEntry } from '@/lib/scholarships/seoScholarshipDynamicEntry';
import {
  ALLOWLISTED_DOUBLE_OVERLAP_CAP,
  AUTO_PROMOTION_EXCLUDED_SEGMENTS,
  HIGH_PRIORITY_SEGMENTS,
  computeRouteScore,
  maxCuratedWeightForPath,
  minCountForPageType,
  priorityBucketForSegment,
  shouldExcludeAutoPromotionPath,
  shouldPromoteAutoRoute,
  type PriorityBucket
} from '@/lib/scholarships/seoScholarshipCandidateScoring';
import {
  countScholarshipsMatchingManifestEntry,
  getScholarshipIdsMatchingManifestEntry
} from '@/lib/scholarships/seoScholarshipListing';
import { maxRelativeChildToParentSize } from '@/lib/scholarships/seoScholarshipOverlap';
import {
  applyNearDuplicateSuppression,
  evaluateSeoRouteQuality
} from '@/lib/scholarships/seoRouteQuality';
import type {
  SeoRouteOverlapMeta,
  SeoScholarshipRouteManifestEntry
} from '@/lib/scholarships/seoScholarshipManifest';
import { deriveSeoIdFromCanonicalPath } from '@/lib/scholarships/seoScholarshipId';
import {
  canonicalPathIsAllowlistedDouble,
  isAllowedSeoDouble,
  seoCombinationDimension,
  tokensHavePairwiseDistinctDimensions
} from '@/lib/scholarships/seoScholarshipCandidateDimensions';
import {
  canonicalPathFromTokens,
  listPreferredSeoPathSegments,
  parsePathSegmentsToTokens
} from '@/lib/scholarships/seoScholarshipRouteTokens';

export type CandidateBuildOptions = {
  onlyPriority: 'all' | 'high';
  maxSingles: number;
  /** Cap unique segments considered as pair/triple endpoints (wider than singles pool). */
  maxPairPool: number;
  maxDoubles: number;
  maxTriples: number;
  maxPairEvaluations: number;
};

export type CandidateDropReason =
  | 'low_count'
  | 'high_overlap'
  | 'low_score'
  | 'invalid_tokens'
  | 'no_filter_effect'
  | 'same_dimension'
  | 'disallowed_pair';

export type CandidateBuildReport = {
  promoted: SeoScholarshipRouteManifestEntry[];
  promotedByType: { single: number; double: number; triple: number };
  /** Segments used as pair/triple endpoints (after curated / count rules). */
  pairPoolSize: number;
  dropped: Array<{
    canonicalPath?: string;
    reason: CandidateDropReason;
    detail?: string;
  }>;
};

type SingleCacheRow = {
  segment: string;
  canonicalPath: string;
  entry: SeoScholarshipRouteManifestEntry;
  ids: Set<string>;
  count: number;
};

function segmentExcludedFromAutoPromotion(segment: string): boolean {
  return AUTO_PROMOTION_EXCLUDED_SEGMENTS.has(segment.trim().toLowerCase());
}

function bucketForPath(canonicalPath: string): PriorityBucket {
  const parts = canonicalPath.split('/').filter(Boolean);
  let best: PriorityBucket = 'low';
  for (const p of parts) {
    const b = priorityBucketForSegment(p);
    if (b === 'high') return 'high';
    if (b === 'medium') best = 'medium';
  }
  return best;
}

function finalizeAutoEntry(
  base: SeoScholarshipRouteManifestEntry,
  args: {
    count: number;
    score: number;
    indexable: boolean;
    overlapMeta?: SeoRouteOverlapMeta;
  }
): SeoScholarshipRouteManifestEntry {
  return {
    ...base,
    source: 'auto',
    scholarshipsCount: args.count,
    minCountSnapshot: args.count,
    score: args.score,
    indexable: args.indexable,
    priority: Math.round(args.score),
    priorityBucket: bucketForPath(base.canonicalPath),
    overlapMeta: args.overlapMeta
  };
}

function buildSingleRow(
  list: Scholarship[],
  segment: string
): SingleCacheRow | null {
  const tokens = parsePathSegmentsToTokens([segment]);
  if (!tokens?.length) return null;
  const canonicalPath = canonicalPathFromTokens(tokens);
  const entry = buildDynamicSeoManifestEntry(tokens, canonicalPath);
  if (!entry) return null;
  const ids = getScholarshipIdsMatchingManifestEntry(list, entry);
  return {
    segment,
    canonicalPath,
    entry,
    ids,
    count: ids.size
  };
}

/**
 * Segments that may seed allowlisted pairs even when standalone count &lt; single threshold.
 * (Pair itself is still gated by double min count / score / overlap.)
 */
export const PAIR_SEED_CURATED_SEGMENTS = new Set([
  'no-essay',
  'for-women',
  'international-students',
  'high-school',
  'undergraduate',
  'engineering',
  'computer-science'
]);

/** Minimum standalone matches to appear in the pair endpoint pool. */
export const PAIR_POOL_MIN_COUNT = 4;

export const defaultCandidateBuildOptions: CandidateBuildOptions = {
  onlyPriority: 'all',
  maxSingles: 220,
  maxPairPool: 320,
  maxDoubles: 750,
  maxTriples: 280,
  maxPairEvaluations: 12000
};

/**
 * Discover strong SEO listing routes from live catalog data (USA matches tab).
 * Returns manifest-shaped rows with `source: 'auto'` ready to merge.
 */
export function buildSeoScholarshipAutoCandidates(
  list: Scholarship[],
  options: Partial<CandidateBuildOptions> = {}
): CandidateBuildReport {
  const opts = { ...defaultCandidateBuildOptions, ...options };
  const dropped: CandidateBuildReport['dropped'] = [];
  const promoted: SeoScholarshipRouteManifestEntry[] = [];
  const seenPaths = new Set<string>();

  let allSegments = listPreferredSeoPathSegments();
  if (opts.onlyPriority === 'high') {
    allSegments = allSegments.filter((s) => HIGH_PRIORITY_SEGMENTS.has(s));
  }
  allSegments = allSegments.filter((s) => !segmentExcludedFromAutoPromotion(s));

  const rowBySegment = new Map<string, SingleCacheRow>();
  const singleRows: SingleCacheRow[] = [];
  for (const seg of allSegments) {
    const row = buildSingleRow(list, seg);
    if (!row) {
      dropped.push({ reason: 'invalid_tokens', detail: seg });
      continue;
    }
    rowBySegment.set(seg, row);
    if (shouldExcludeAutoPromotionPath(row.canonicalPath)) {
      dropped.push({
        canonicalPath: row.canonicalPath,
        reason: 'low_score',
        detail: 'family_suppressed_from_auto_promotion'
      });
      continue;
    }
    if (row.count < minCountForPageType('single')) {
      dropped.push({
        canonicalPath: row.canonicalPath,
        reason: 'low_count',
        detail: `single need >=${minCountForPageType('single')} got ${row.count}`
      });
      continue;
    }
    singleRows.push(row);
  }

  singleRows.sort((a, b) => {
    const wa = maxCuratedWeightForPath(a.canonicalPath);
    const wb = maxCuratedWeightForPath(b.canonicalPath);
    if (wb !== wa) return wb - wa;
    return b.count - a.count;
  });

  const singlesPool = singleRows.slice(0, opts.maxSingles);

  let singlesOut = 0;
  for (const row of singlesPool) {
    if (singlesOut >= opts.maxSingles) break;
    const overlapRatio = 0;
    const score = computeRouteScore({
      pageType: 'single',
      count: row.count,
      canonicalPath: row.canonicalPath,
      overlapRatio
    });
    const ok = shouldPromoteAutoRoute({
      pageType: 'single',
      count: row.count,
      score,
      overlapRatio,
      canonicalPath: row.canonicalPath
    });
    if (!ok) {
      dropped.push({
        canonicalPath: row.canonicalPath,
        reason: 'low_score',
        detail: `score=${score}`
      });
      continue;
    }
    if (seenPaths.has(row.canonicalPath)) continue;
    seenPaths.add(row.canonicalPath);
    promoted.push(
      finalizeAutoEntry(row.entry, {
        count: row.count,
        score,
        indexable: true
      })
    );
    singlesOut += 1;
  }

  /** Wider than singlesPool: curated seeds with count ≥4, others need single threshold. */
  const pairCandidateRows: SingleCacheRow[] = [];
  for (const seg of allSegments) {
    const row = rowBySegment.get(seg);
    if (!row || row.count < PAIR_POOL_MIN_COUNT) continue;
    if (shouldExcludeAutoPromotionPath(row.canonicalPath)) continue;
    const curatedSeed = PAIR_SEED_CURATED_SEGMENTS.has(seg);
    if (
      !curatedSeed &&
      row.count < minCountForPageType('single')
    ) {
      continue;
    }
    pairCandidateRows.push(row);
  }
  pairCandidateRows.sort((a, b) => {
    const wa = maxCuratedWeightForPath(a.canonicalPath);
    const wb = maxCuratedWeightForPath(b.canonicalPath);
    if (wb !== wa) return wb - wa;
    return b.count - a.count;
  });
  const pairPool = pairCandidateRows.slice(0, opts.maxPairPool);
  const pairPoolBySegment = new Map(pairPool.map((r) => [r.segment, r]));
  const pairPoolSegs = pairPool.map((r) => r.segment);

  let pairEvals = 0;
  let doublesOut = 0;

  for (let i = 0; i < pairPoolSegs.length && doublesOut < opts.maxDoubles; i++) {
    for (
      let j = i + 1;
      j < pairPoolSegs.length && doublesOut < opts.maxDoubles;
      j++
    ) {
      if (pairEvals >= opts.maxPairEvaluations) break;
      pairEvals += 1;

      const segA = pairPoolSegs[i]!;
      const segB = pairPoolSegs[j]!;
      const tokens = parsePathSegmentsToTokens([segA, segB]);
      if (!tokens || tokens.length < 2) {
        dropped.push({
          reason: 'invalid_tokens',
          detail: `${segA}+${segB}`
        });
        continue;
      }
      if (!isAllowedSeoDouble(tokens)) {
        dropped.push({
          canonicalPath: canonicalPathFromTokens(tokens),
          reason: 'disallowed_pair',
          detail: `${seoCombinationDimension(tokens[0]!)}+${seoCombinationDimension(tokens[1]!)}`
        });
        continue;
      }
      const canonicalPath = canonicalPathFromTokens(tokens);
      if (seenPaths.has(canonicalPath)) continue;
      if (shouldExcludeAutoPromotionPath(canonicalPath)) {
        dropped.push({
          canonicalPath,
          reason: 'low_score',
          detail: 'family_suppressed_from_auto_promotion'
        });
        continue;
      }

      const entry = buildDynamicSeoManifestEntry(tokens, canonicalPath);
      if (!entry) {
        dropped.push({ canonicalPath, reason: 'no_filter_effect' });
        continue;
      }

      const childIds = getScholarshipIdsMatchingManifestEntry(list, entry);
      const count = childIds.size;
      if (count < minCountForPageType('double')) {
        dropped.push({
          canonicalPath,
          reason: 'low_count',
          detail: `double need >=${minCountForPageType('double')} got ${count}`
        });
        continue;
      }

      const rowA = pairPoolBySegment.get(segA);
      const rowB = pairPoolBySegment.get(segB);
      if (!rowA || !rowB) continue;

      const { ratio, parentIndex } = maxRelativeChildToParentSize({
        child: childIds,
        parents: [rowA.ids, rowB.ids]
      });
      const parentPaths = [rowA.canonicalPath, rowB.canonicalPath];
      const overlapMeta: SeoRouteOverlapMeta = {
        ratio,
        parentCanonicalPath: parentPaths[parentIndex >= 0 ? parentIndex : 0]!
      };

      const score = computeRouteScore({
        pageType: 'double',
        count,
        canonicalPath,
        overlapRatio: ratio,
        allowlistedDouble: true
      });
      const ok = shouldPromoteAutoRoute({
        pageType: 'double',
        count,
        score,
        overlapRatio: ratio,
        canonicalPath,
        allowlistedDouble: true
      });
      if (!ok) {
        dropped.push({
          canonicalPath,
          reason:
            ratio >= ALLOWLISTED_DOUBLE_OVERLAP_CAP ? 'high_overlap' : 'low_score',
          detail: `count=${count} score=${score} overlap=${ratio.toFixed(3)}`
        });
        continue;
      }

      seenPaths.add(canonicalPath);
      promoted.push(
        finalizeAutoEntry(entry, {
          count,
          score,
          indexable: true,
          overlapMeta
        })
      );
      doublesOut += 1;
    }
    if (pairEvals >= opts.maxPairEvaluations) break;
  }

  let triplesOut = 0;
  const topForTriple = pairPoolSegs.slice(0, 22);
  for (let i = 0; i < topForTriple.length && triplesOut < opts.maxTriples; i++) {
    for (let j = i + 1; j < topForTriple.length && triplesOut < opts.maxTriples; j++) {
      for (let k = j + 1; k < topForTriple.length && triplesOut < opts.maxTriples; k++) {
        const segA = topForTriple[i]!;
        const segB = topForTriple[j]!;
        const segC = topForTriple[k]!;
        const tokens = parsePathSegmentsToTokens([segA, segB, segC]);
        if (!tokens || tokens.length < 3) continue;
        if (!tokensHavePairwiseDistinctDimensions(tokens)) {
          dropped.push({
            canonicalPath: canonicalPathFromTokens(tokens),
            reason: 'same_dimension',
            detail: tokens.map((t) => seoCombinationDimension(t)).join(',')
          });
          continue;
        }
        const canonicalPath = canonicalPathFromTokens(tokens);
        if (seenPaths.has(canonicalPath)) continue;
        if (shouldExcludeAutoPromotionPath(canonicalPath)) {
          dropped.push({
            canonicalPath,
            reason: 'low_score',
            detail: 'family_suppressed_from_auto_promotion'
          });
          continue;
        }

        const entry = buildDynamicSeoManifestEntry(tokens, canonicalPath);
        if (!entry) continue;

        const childIds = getScholarshipIdsMatchingManifestEntry(list, entry);
        const count = childIds.size;
        if (count < minCountForPageType('triple')) {
          dropped.push({
            canonicalPath,
            reason: 'low_count',
            detail: `triple need >=${minCountForPageType('triple')} got ${count}`
          });
          continue;
        }

        const rowA = pairPoolBySegment.get(segA);
        const rowB = pairPoolBySegment.get(segB);
        const rowC = pairPoolBySegment.get(segC);
        if (!rowA || !rowB || !rowC) continue;

        const pairAb = parsePathSegmentsToTokens([segA, segB]);
        const pairAc = parsePathSegmentsToTokens([segA, segC]);
        const pairBc = parsePathSegmentsToTokens([segB, segC]);
        if (!pairAb?.length || !pairAc?.length || !pairBc?.length) continue;

        const pathAb = canonicalPathFromTokens(pairAb);
        const pathAc = canonicalPathFromTokens(pairAc);
        const pathBc = canonicalPathFromTokens(pairBc);

        const entryAb = buildDynamicSeoManifestEntry(pairAb, pathAb);
        const entryAc = buildDynamicSeoManifestEntry(pairAc, pathAc);
        const entryBc = buildDynamicSeoManifestEntry(pairBc, pathBc);
        if (!entryAb || !entryAc || !entryBc) continue;

        const idsAb = getScholarshipIdsMatchingManifestEntry(list, entryAb);
        const idsAc = getScholarshipIdsMatchingManifestEntry(list, entryAc);
        const idsBc = getScholarshipIdsMatchingManifestEntry(list, entryBc);

        const { ratio, parentIndex } = maxRelativeChildToParentSize({
          child: childIds,
          parents: [idsAb, idsAc, idsBc]
        });
        const parentPaths = [pathAb, pathAc, pathBc];
        const overlapMeta: SeoRouteOverlapMeta = {
          ratio,
          parentCanonicalPath: parentPaths[parentIndex >= 0 ? parentIndex : 0]!
        };

        const score = computeRouteScore({
          pageType: 'triple',
          count,
          canonicalPath,
          overlapRatio: ratio
        });
        const ok = shouldPromoteAutoRoute({
          pageType: 'triple',
          count,
          score,
          overlapRatio: ratio,
          canonicalPath
        });
        if (!ok) {
          dropped.push({
            canonicalPath,
            reason: ratio >= 0.92 ? 'high_overlap' : 'low_score',
            detail: `count=${count} score=${score} overlap=${ratio.toFixed(3)}`
          });
          continue;
        }

        seenPaths.add(canonicalPath);
        promoted.push(
          finalizeAutoEntry(entry, {
            count,
            score,
            indexable: true,
            overlapMeta
          })
        );
        triplesOut += 1;
      }
    }
  }

  const promotedByType = {
    single: promoted.filter((p) => p.pageType === 'single').length,
    double: promoted.filter((p) => p.pageType === 'double').length,
    triple: promoted.filter((p) => p.pageType === 'triple').length
  };

  return {
    promoted,
    promotedByType,
    pairPoolSize: pairPool.length,
    dropped
  };
}

/**
 * After catalog changes: recompute counts and indexability for auto rows
 * (overlap ratio from existing `overlapMeta` is reused for score).
 */
export function finalizeAutoIndexability(
  list: Scholarship[],
  entry: SeoScholarshipRouteManifestEntry
): SeoScholarshipRouteManifestEntry {
  if (entry.source !== 'auto') return entry;
  const count = countScholarshipsMatchingManifestEntry(list, entry);
  const overlapRatio = entry.overlapMeta?.ratio ?? 0;
  const allowlistedDouble =
    entry.pageType === 'double' &&
    canonicalPathIsAllowlistedDouble(entry.canonicalPath);
  const score = computeRouteScore({
    pageType: entry.pageType,
    count,
    canonicalPath: entry.canonicalPath,
    overlapRatio,
    allowlistedDouble: allowlistedDouble || undefined
  });
  const indexable = shouldPromoteAutoRoute({
    pageType: entry.pageType,
    count,
    score,
    overlapRatio,
    canonicalPath: entry.canonicalPath,
    allowlistedDouble: allowlistedDouble || undefined
  });
  return {
    ...entry,
    minCountSnapshot: count,
    scholarshipsCount: count,
    score,
    indexable
  };
}

/** Refresh counts / overlap for an arbitrary manifest row (manual or auto). */
export function refreshManifestEntryDerived(
  list: Scholarship[],
  entry: SeoScholarshipRouteManifestEntry
): SeoScholarshipRouteManifestEntry {
  const ids = getScholarshipIdsMatchingManifestEntry(list, entry);
  const count = ids.size;
  let overlapMeta: SeoRouteOverlapMeta | undefined;
  if (entry.pageType !== 'single' && entry.canonicalPath.includes('/')) {
    const parts = entry.canonicalPath.split('/').filter(Boolean);
    if (parts.length === 2) {
      const tokens0 = parsePathSegmentsToTokens([parts[0]!]);
      const tokens1 = parsePathSegmentsToTokens([parts[1]!]);
      if (tokens0?.length && tokens1?.length) {
        const c0 = canonicalPathFromTokens(tokens0);
        const c1 = canonicalPathFromTokens(tokens1);
        const e0 = buildDynamicSeoManifestEntry(tokens0, c0);
        const e1 = buildDynamicSeoManifestEntry(tokens1, c1);
        if (e0 && e1) {
          const p0 = getScholarshipIdsMatchingManifestEntry(list, e0);
          const p1 = getScholarshipIdsMatchingManifestEntry(list, e1);
          const { ratio, parentIndex } = maxRelativeChildToParentSize({
            child: ids,
            parents: [p0, p1]
          });
          const paths = [c0, c1];
          overlapMeta = {
            ratio,
            parentCanonicalPath: paths[parentIndex >= 0 ? parentIndex : 0]!
          };
        }
      }
    } else if (parts.length === 3) {
      const pairAb = parsePathSegmentsToTokens([parts[0]!, parts[1]!]);
      const pairAc = parsePathSegmentsToTokens([parts[0]!, parts[2]!]);
      const pairBc = parsePathSegmentsToTokens([parts[1]!, parts[2]!]);
      if (pairAb?.length && pairAc?.length && pairBc?.length) {
        const pathAb = canonicalPathFromTokens(pairAb);
        const pathAc = canonicalPathFromTokens(pairAc);
        const pathBc = canonicalPathFromTokens(pairBc);
        const entryAb = buildDynamicSeoManifestEntry(pairAb, pathAb);
        const entryAc = buildDynamicSeoManifestEntry(pairAc, pathAc);
        const entryBc = buildDynamicSeoManifestEntry(pairBc, pathBc);
        if (entryAb && entryAc && entryBc) {
          const idsAb = getScholarshipIdsMatchingManifestEntry(list, entryAb);
          const idsAc = getScholarshipIdsMatchingManifestEntry(list, entryAc);
          const idsBc = getScholarshipIdsMatchingManifestEntry(list, entryBc);
          const { ratio, parentIndex } = maxRelativeChildToParentSize({
            child: ids,
            parents: [idsAb, idsAc, idsBc]
          });
          const paths = [pathAb, pathAc, pathBc];
          overlapMeta = {
            ratio,
            parentCanonicalPath: paths[parentIndex >= 0 ? parentIndex : 0]!
          };
        }
      }
    }
  }
  const allowlistedDouble =
    entry.pageType === 'double' &&
    canonicalPathIsAllowlistedDouble(entry.canonicalPath);
  const score = computeRouteScore({
    pageType: entry.pageType,
    count,
    canonicalPath: entry.canonicalPath,
    overlapRatio: overlapMeta?.ratio ?? 0,
    allowlistedDouble: allowlistedDouble || undefined
  });
  return {
    ...entry,
    seoId: entry.seoId ?? deriveSeoIdFromCanonicalPath(entry.canonicalPath),
    pageKind: entry.pageKind ?? 'manifest',
    minCountSnapshot: count,
    scholarshipsCount: count,
    score,
    overlapMeta: overlapMeta ?? entry.overlapMeta
  };
}

function totalCatalogForSeo(list: Scholarship[]): number {
  const tabIdSets = {
    saved: [] as string[],
    ignored: [] as string[],
    started: [] as string[],
    submitted: [] as string[]
  };
  return scholarshipsInTab(
    list.filter((s) => isScholarshipUSA(s.country)),
    'matches',
    tabIdSets
  ).length;
}

export function finalizeManifestRouteQuality(
  list: Scholarship[],
  entries: SeoScholarshipRouteManifestEntry[]
): SeoScholarshipRouteManifestEntry[] {
  const totalCatalog = totalCatalogForSeo(list);
  const idsByPath = new Map<string, Set<string>>();
  const baseByPath = new Map<
    string,
    ReturnType<typeof evaluateSeoRouteQuality>
  >();

  for (const entry of entries) {
    const ids = getScholarshipIdsMatchingManifestEntry(list, entry);
    idsByPath.set(entry.canonicalPath, ids);
    baseByPath.set(
      entry.canonicalPath,
      evaluateSeoRouteQuality({
        canonicalPath: entry.canonicalPath,
        exactCount: ids.size,
        renderedCount: ids.size,
        totalCatalog,
        fallbackUsed: false
      })
    );
  }

  const suppressions = applyNearDuplicateSuppression(
    entries.map((entry) => ({
      route: entry,
      ids: idsByPath.get(entry.canonicalPath) ?? new Set<string>(),
      evaluation: baseByPath.get(entry.canonicalPath)!
    }))
  );

  return entries.map((entry) => {
    const ids = idsByPath.get(entry.canonicalPath) ?? new Set<string>();
    const suppression = suppressions.get(entry.canonicalPath);
    const evaluation = evaluateSeoRouteQuality({
      canonicalPath: entry.canonicalPath,
      exactCount: ids.size,
      renderedCount: ids.size,
      totalCatalog,
      fallbackUsed: false,
      overlapSimilarity: suppression?.similarity,
      canonicalTarget: suppression?.target ?? null,
      reasonCodes: suppression ? ['overlap_too_high'] : []
    });

    return {
      ...entry,
      scholarshipsCount: ids.size,
      minCountSnapshot: ids.size,
      score: evaluation.snapshot.finalQualityScore,
      priority: Math.round(evaluation.snapshot.finalQualityScore),
      qualityBucket: evaluation.bucket,
      qualitySnapshot: evaluation.snapshot,
      canonicalTarget: evaluation.canonicalTarget,
      noindexNow: evaluation.noindexNow,
      reasonCodes: evaluation.reasonCodes,
      indexable: evaluation.indexable
    };
  });
}
